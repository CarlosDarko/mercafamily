// Catálogo de Mercadona descargado cada semana por la GitHub Action (public/data/catalog.json)
import { norm } from './format.js'
import { buildIndex, searchIndex } from './search.js'

const IMG = 'https://prod-mercadona.imgix.net/'
let cache = null

export async function loadCatalog() {
  if (cache) return cache
  const res = await fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
  if (!res.ok) throw new Error('No se pudo cargar el catálogo')
  const data = await res.json()
  const byId = new Map()
  for (const p of data.products) {
    byId.set(p.id, p)
  }
  const cats = new Map(data.categories.map((c) => [c.id, c]))
  cache = { updated: data.updated, products: data.products, byId, cats, categories: data.categories }
  cache.index = buildIndex(cache)
  return cache
}

export const imgUrl = (p, size = 96) => (p?.i ? `${IMG}${p.i}?fit=crop&h=${size}&w=${size}` : null)

export function unitLabel(p) {
  if (!p) return ''
  const ref = p.r && p.rf ? `${String(p.r.toFixed(2)).replace('.', ',')} €/${p.rf}` : ''
  return [p.z, ref].filter(Boolean).join(' · ')
}

// ---------- Búsqueda (motor en search.js) ----------
export { parsePrefs, stem } from './search.js'

export function search(cat, query, opts = {}) {
  if (!cat) return []
  if (!cat.index) cat.index = buildIndex(cat)
  return searchIndex(cat.index, query, opts)
}

export async function loadHistory() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/history.json`)
  if (!res.ok) return { prices: {} }
  return res.json()
}
