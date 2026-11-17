// Catálogo de Mercadona descargado cada semana por la GitHub Action (public/data/catalog.json)
import { norm, tokens } from './format.js'

const IMG = 'https://prod-mercadona.imgix.net/'
let cache = null

export async function loadCatalog() {
  if (cache) return cache
  const res = await fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
  if (!res.ok) throw new Error('No se pudo cargar el catálogo')
  const data = await res.json()
  const byId = new Map()
  for (const p of data.products) {
    p.nn = norm(p.n)
    p.tk = p.nn.split(' ')
    byId.set(p.id, p)
  }
  const cats = new Map(data.categories.map((c) => [c.id, c]))
  cache = { updated: data.updated, products: data.products, byId, cats, categories: data.categories }
  return cache
}

export const imgUrl = (p, size = 96) => (p?.i ? `${IMG}${p.i}?fit=crop&h=${size}&w=${size}` : null)

export function unitLabel(p) {
  if (!p) return ''
  const ref = p.r && p.rf ? `${String(p.r.toFixed(2)).replace('.', ',')} €/${p.rf}` : ''
  return [p.z, ref].filter(Boolean).join(' · ')
}

// Una preferencia es una frase libre: 'leche semidesnatada sin lactosa', 'evitar aceite de palma'.
// Se aplica a una búsqueda cuando comparte alguna palabra con ella.
export function parsePrefs(list = []) {
  return list
    .map((raw) => {
      const t = tokens(raw)
      const avoid = t[0] === 'evitar' || t[0] === 'no' || t[0] === 'nada'
      const words = (avoid ? t.slice(1) : t).filter((w) => !['de', 'la', 'el', 'con', 'y', 'en'].includes(w))
      return words.length ? { raw, avoid, words } : null
    })
    .filter(Boolean)
}

const tokenMatch = (q, tk) => tk.some((t) => t.startsWith(q) || (q.length >= 4 && t.includes(q)))

export function search(cat, query, { prefs = [], learned = new Map(), limit = 20 } = {}) {
  const q = tokens(query)
  if (!q.length || !cat) return []
  const out = []
  for (const p of cat.products) {
    if (!q.every((w) => tokenMatch(w, p.tk))) continue
    let score = 0
    if (p.tk[0].startsWith(q[0])) score += 4
    if (p.tk.includes(q[0])) score += 2
    score -= p.tk.length * 0.15
    score += Math.min(learned.get(p.id) || 0, 6) * 2.5
    const reasons = []
    for (const pref of prefs) {
      if (!pref.words.some((w) => q.includes(w) || q.some((x) => w.startsWith(x)))) continue
      const extra = pref.words.filter((w) => !q.includes(w))
      if (!extra.length) continue
      const hits = extra.filter((w) => tokenMatch(w, p.tk) || (w === 'sin' && p.nn.includes(' sin ')))
      if (pref.avoid) {
        if (extra.every((w) => tokenMatch(w, p.tk))) score -= 12
      } else if (hits.length) {
        score += (hits.length / extra.length) * 12 + (hits.length === extra.length ? 14 : 0)
        if (hits.length === extra.length) reasons.push(pref.raw)
      }
    }
    out.push({ p, score, reasons })
  }
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, limit)
}

export async function loadHistory() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/history.json`)
  if (!res.ok) return { prices: {} }
  return res.json()
}
