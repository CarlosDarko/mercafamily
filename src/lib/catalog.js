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
    prepare(p)
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

// ---------- Búsqueda ----------
// Normaliza como habla la gente: plurales, palabras de enlace, palabras juntas, sinónimos y erratas.

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'para', 'a', 'al', 'un', 'una', 'unos', 'unas', 'por'])
const PREFIXES = ['mini', 'maxi', 'super', 'micro', 'multi']
const BABY = new Set(['papilla', 'bolsita', 'potito', 'pure'])

// Frases que la gente dice de una forma y Mercadona escribe de otra
const PHRASES = [
  [/\bjamon (de )?york\b/g, 'jamon cocido'],
  [/^york$/g, 'jamon cocido'],
  [/\bpasta (de )?dientes\b/g, 'dentifrico'],
  [/\bgel (de )?(ducha|bano)\b/g, 'gel bano'],
  [/\b(friegaplatos|lavaplatos)\b/g, 'lavavajillas'],
  [/\bpapel (de )?(water|vater|wc|bano)\b/g, 'papel higienico'],
  [/\b(yogurt|yoghourt|yogourt)(s)?\b/g, 'yogur'],
  [/\bcocacola\b/g, 'coca cola']
]
// Palabras equivalentes (cualquiera vale)
const ALT = { hamburguesa: ['burger'], burger: ['hamburguesa'], refresco: ['refresco'], patata: ['patata'] }

export function stem(w) {
  if (w.length <= 3) return w
  if (w.endsWith('ces') && w.length > 5) return w.slice(0, -3) + 'z'
  if (/[^aeiou]es$/.test(w) && w.length > 4 && !/(ses|tes|des|ques|ches|pes|bes|ves|fes|ges|mes)$/.test(w)) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('us')) return w.slice(0, -1)
  return w
}

function queryTerms(query) {
  let q = norm(query)
  for (const [re, rep] of PHRASES) q = q.replace(re, rep)
  const out = []
  for (const w of q.split(' ').filter(Boolean)) {
    if (STOP.has(w)) continue
    const pre = PREFIXES.find((x) => w.startsWith(x) && w.length >= x.length + 3)
    if (pre) out.push(pre, stem(w.slice(pre.length)))
    else out.push(stem(w))
  }
  return out
}

function prepare(p) {
  if (!p.nn) p.nn = norm(p.n)
  if (!p.tk) p.tk = p.nn.split(' ')
  if (!p.st) p.st = p.tk.map(stem)
  return p
}

const prefixMatch = (w, st) => st.some((s) => s.startsWith(w) || (w.length >= 4 && s.includes(w)))
const termMatch = (w, st) => prefixMatch(w, st) || (ALT[w] || []).some((a) => prefixMatch(a, st))
const wordMatch = (w, st) => st.includes(w) || (w.length >= 4 && st.some((s) => s.startsWith(w)))

function lev1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}
const fuzzyMatch = (w, st) => termMatch(w, st) || (w.length >= 5 && st.some((s) => lev1(w, s) || (s.length > w.length && lev1(w, s.slice(0, w.length)))))

// Una preferencia es una frase libre: 'leche semidesnatada sin lactosa', 'evitar aceite de palma'.
// Se aplica a una búsqueda cuando comparte alguna palabra con ella.
export function parsePrefs(list = []) {
  return list
    .map((raw) => {
      const t = tokens(raw)
      const avoid = t[0] === 'evitar' || t[0] === 'no' || t[0] === 'nada'
      const words = (avoid ? t.slice(1) : t).filter((w) => !STOP.has(w)).map(stem)
      return words.length ? { raw, avoid, words } : null
    })
    .filter(Boolean)
}

function scoreAll(cat, q, match, { prefs, learned }) {
  const out = []
  for (const raw of cat.products) {
    const p = prepare(raw)
    if (!q.every((w) => match(w, p.st))) continue
    let score = 0
    if (p.st[0].startsWith(q[0])) score += 4
    for (const w of q) if (p.st.includes(w)) score += 2
    if (p.st.some((s) => BABY.has(s)) && !q.some((w) => BABY.has(w))) score -= 3
    score -= p.tk.length * 0.15
    score += Math.min(learned.get(p.id) || 0, 6) * 2.5
    const reasons = []
    for (const pref of prefs) {
      if (!pref.words.some((w) => q.includes(w) || q.some((x) => w.startsWith(x)))) continue
      const extra = pref.words.filter((w) => !q.includes(w))
      if (!extra.length) continue
      const hits = extra.filter((w) => wordMatch(w, p.st))
      if (pref.avoid) {
        if (extra.every((w) => wordMatch(w, p.st))) score -= 12
      } else if (hits.length) {
        score += (hits.length / extra.length) * 12 + (hits.length === extra.length ? 14 : 0)
        if (hits.length === extra.length) reasons.push(pref.raw)
      }
    }
    out.push({ p, score, reasons })
  }
  return out
}

export function search(cat, query, { prefs = [], learned = new Map(), limit = 20 } = {}) {
  const q = queryTerms(query)
  if (!q.length || !cat) return []
  let out = scoreAll(cat, q, termMatch, { prefs, learned })
  if (!out.length) out = scoreAll(cat, q, fuzzyMatch, { prefs, learned })
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, limit)
}

export async function loadHistory() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/history.json`)
  if (!res.ok) return { prices: {} }
  return res.json()
}
