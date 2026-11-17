// Descarga el catálogo público de Mercadona (una vez por semana) y actualiza el historial de precios.
// Uso: node scripts/fetch-mercadona.mjs
// Variables opcionales (en GitHub: Settings > Secrets and variables > Actions > Variables):
//   MERCADONA_CP  código postal de casa, de él se saca el almacén y por tanto los precios de la zona
//   MERCADONA_WH  almacén concreto, si se quiere fijar a mano
import { readFile, writeFile } from 'node:fs/promises'

async function warehouseFor(cp) {
  const res = await fetch('https://tienda.mercadona.es/api/postal-codes/actions/change-pc/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_postal_code: cp })
  })
  return res.headers.get('x-customer-wh')
}

// Si no hay variables, se mantiene el almacén del último catálogo descargado
async function previousWarehouse() {
  try {
    return JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8')).wh
  } catch {
    return null
  }
}

const CP = (process.env.MERCADONA_CP || '').trim()
const WH = process.env.MERCADONA_WH || (CP && (await warehouseFor(CP))) || (await previousWarehouse()) || 'vlc1'
console.log(`Almacén: ${WH}`)
const BASE = 'https://tienda.mercadona.es/api'
const CATALOG = new URL('../public/data/catalog.json', import.meta.url)
const HISTORY = new URL('../public/data/history.json', import.meta.url)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(path, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}lang=es&wh=${WH}`, {
        headers: { 'User-Agent': 'mercafamily (uso doméstico, consulta semanal)', Accept: 'application/json' }
      })
      if (res.ok) return await res.json()
      if (res.status === 404) return null
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i === tries) throw e
      await sleep(1500 * i)
    }
  }
}

const num = (s) => (s == null || String(s).trim() === '' ? null : Number(String(s).trim()))
const imgPath = (url) => (url ? url.replace('https://prod-mercadona.imgix.net/', '').split('?')[0] : null)

function sizeLabel(pi, packaging) {
  const parts = []
  if (packaging) parts.push(packaging)
  if (pi.is_pack && pi.pack_size && pi.total_units) parts.push(`${pi.total_units} x ${pi.unit_name || ''}`.trim())
  else if (pi.unit_size && pi.size_format) parts.push(`${String(pi.unit_size).replace('.', ',').replace(/,0$/, '')} ${pi.size_format}`)
  return parts.join(' · ')
}

const today = new Date().toISOString().slice(0, 10)
const top = await get('/categories/')
const categories = []
const products = new Map()

for (const t of top.results) {
  categories.push({ id: t.id, n: t.name, o: t.order })
  for (const sub of t.categories) {
    const d = await get(`/categories/${sub.id}/`)
    await sleep(350)
    if (!d) continue
    for (const group of d.categories || []) {
      for (const p of group.products || []) {
        if (!p.published || products.has(p.id)) continue
        const pi = p.price_instructions || {}
        const price = num(pi.unit_price)
        if (price == null) continue
        const prev = num(pi.previous_unit_price)
        products.set(p.id, {
          id: p.id,
          n: p.display_name,
          c: t.id,
          s: group.name,
          p: price,
          ...(prev && prev !== price ? { pp: prev } : {}),
          r: num(pi.reference_price),
          rf: pi.reference_format || null,
          z: sizeLabel(pi, p.packaging),
          w: pi.approx_size ? 1 : 0,
          i: imgPath(p.thumbnail)
        })
      }
    }
  }
}

if (products.size < 1000) {
  console.error(`Solo ${products.size} productos: algo ha ido mal, no se sobrescribe nada.`)
  process.exit(1)
}

const catalog = { updated: today, wh: WH, categories, products: [...products.values()] }
await writeFile(CATALOG, JSON.stringify(catalog))

// Historial: { updated, prices: { id: [[fecha, precio], ...] } }, solo se añade un punto cuando cambia el precio
let history = { updated: null, prices: {} }
try { history = JSON.parse(await readFile(HISTORY, 'utf8')) } catch {}
let changes = 0
for (const p of products.values()) {
  const h = history.prices[p.id] || (history.prices[p.id] = [])
  if (!h.length && p.pp) h.push([null, p.pp]) // precio anterior que da la propia Mercadona, sin fecha
  const last = h[h.length - 1]
  if (!last || last[1] !== p.p) { h.push([today, p.p]); changes++ }
}
history.updated = today
await writeFile(HISTORY, JSON.stringify(history))
console.log(`Catálogo: ${products.size} productos en ${categories.length} categorías. Cambios de precio: ${changes}.`)
