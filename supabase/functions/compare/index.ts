// MercaFamily: comparar con Dia y Consum (uso doméstico, resultados guardados 7 días para consultar poco).
// POST { items: [{ key, q, rf, ean? }] } -> { results: { key: { dia, consum } } }
// Carrefour, Eroski, Caprabo y Alcampo no se consultan: bloquean las consultas automáticas o no tienen buscador público.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const UA = 'Mozilla/5.0 (compatible; MercaFamily/1.0; uso domestico)'
const WEEK = 7 * 86400000

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const stem = (w: string) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
const toks = (s: string) => norm(s).split(' ').filter((w) => w.length > 2 && !['con', 'sin', 'para', 'los', 'las', 'del'].includes(w)).map(stem)
const unitOf = (u: string) => (/l|litro/i.test(u) ? 'L' : /k|kilo/i.test(u) ? 'kg' : 'ud')

type Hit = { store: string; name: string; price: number; unit: number | null; rf: string; url: string; img: string | null; score: number }

function best(q: string, rf: string, hits: Hit[]) {
  const qt = toks(q)
  for (const h of hits) {
    const ht = toks(h.name)
    h.score = qt.filter((w) => ht.some((x) => x.startsWith(w) || w.startsWith(x))).length / Math.max(qt.length, 1)
  }
  const good = hits.filter((h) => h.score >= 0.6 && (!rf || h.rf === rf || h.rf === 'ud'))
  good.sort((a, b) => b.score - a.score || (a.unit ?? 1e9) - (b.unit ?? 1e9))
  return good[0] || null
}

async function dia(q: string): Promise<Hit[]> {
  const r = await fetch(`https://www.dia.es/api/v1/search-back/search/reduced?q=${encodeURIComponent(q)}&page=1`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) return []
  const d = await r.json()
  return (d.search_items || []).slice(0, 15).map((x: any) => ({
    store: 'Dia',
    name: x.display_name,
    price: x.prices?.price,
    unit: x.prices?.price_per_unit ?? null,
    rf: unitOf(x.prices?.measure_unit || ''),
    url: x.url ? `https://www.dia.es${x.url}` : 'https://www.dia.es',
    img: x.image ? `https://www.dia.es${x.image}` : null,
    score: 0
  }))
}

async function consum(q: string): Promise<Hit[]> {
  const r = await fetch(`https://tienda.consum.es/api/rest/V1.0/catalog/product?q=${encodeURIComponent(q)}&limit=15`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) return []
  const d = await r.json()
  return (d.products || []).map((x: any) => {
    const v = x.priceData?.prices?.[0]?.value || {}
    return {
      store: 'Consum',
      name: `${x.productData?.name || ''} ${x.productData?.brand?.name || ''}`.trim(),
      price: v.centAmount,
      unit: v.centUnitAmount ?? null,
      rf: unitOf(x.priceData?.unitPriceUnitType || ''),
      url: x.productData?.url || 'https://tienda.consum.es',
      img: x.productData?.imageURL || null,
      score: 0,
      ean: x.ean
    }
  })
}

async function lookup(item: { key: string; q: string; rf: string; ean?: string }) {
  const { data: cached } = await db.from('compare_cache').select('data, at').eq('key', item.key).single()
  if (cached && Date.now() - new Date(cached.at).getTime() < WEEK) return cached.data
  const [d, c] = await Promise.all([dia(item.q).catch(() => []), consum(item.q).catch(() => [])])
  // Con código de barras (productos de marca) se busca la coincidencia exacta en Consum
  const exact = item.ean ? c.find((x: any) => x.ean === item.ean) : null
  const pick = (h: Hit | null) => (h ? { name: h.name, price: h.price, unit: h.unit, rf: h.rf, url: h.url, img: h.img } : null)
  const data = { dia: pick(best(item.q, item.rf, d)), consum: pick(exact || best(item.q, item.rf, c)) }
  await db.from('compare_cache').upsert({ key: item.key, data, at: new Date().toISOString() })
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'usa POST' }, 405)
  const body = await req.json().catch(() => ({}))
  const items = (body.items || []).slice(0, 15)
  const results: Record<string, unknown> = {}
  for (const it of items) {
    if (!it?.key || !it?.q) continue
    try {
      results[it.key] = await lookup(it)
    } catch (e) {
      results[it.key] = { error: String(e) }
    }
  }
  return json({ results })
})
