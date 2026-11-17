// Motor de búsqueda del catálogo. Sin casos sueltos: índice invertido sobre nombre, familia, categoría y marca,
// con plurales, erratas, palabras juntas, sinónimos, peso por rareza de cada palabra y lo aprendido de la familia.
import { norm } from './format.js'

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'e', 'en', 'para', 'a', 'al', 'un', 'una', 'unos', 'unas', 'por', 'o', 'que', 'mi', 'su', 'lo', 'le', 'tipo', 'marca', 'algo', 'unidad', 'unidades', 'paquete', 'bote'])
const KEEP_SHORT = new Set(['sin', 'te', 'ajo', 'sal', 'pan', 'gel', 'uva', 'kiwi', 'leche'])
const BABY = new Set(['papilla', 'bolsita', 'potito', 'pure', 'infantil', 'bebe', 'perro', 'gato', 'mascota'])

// Cómo lo dice la gente → cómo lo escribe Mercadona. Son equivalencias de lengua, no de productos concretos.
const SYNONYMS = {
  york: ['cocido'],
  dientes: ['dentifrico', 'dental'],
  dentifrico: ['dental'],
  ducha: ['bano'],
  friegaplatos: ['lavavajillas'],
  lavaplatos: ['lavavajillas'],
  water: ['higienico'],
  vater: ['higienico'],
  wc: ['higienico'],
  hamburguesa: ['burger'],
  burger: ['hamburguesa'],
  yogurt: ['yogur'],
  yoghourt: ['yogur'],
  refresco: ['refresco', 'cola'],
  gaseosa: ['refresco'],
  lavadora: ['ropa'],
  maquina: ['lavavajillas', 'pastilla', 'capsula'],
  nesquik: ['cacao'],
  cacaolat: ['batido', 'cacao'],
  frankfurt: ['salchicha'],
  embutido: ['charcuteria', 'fiambre'],
  fiambre: ['lonchas'],
  filete: ['filete', 'filetes'],
  carne: ['carne', 'ternera', 'vacuno', 'cerdo', 'pollo'],
  picada: ['picada'],
  bistec: ['filete'],
  pescado: ['pescado', 'marisco'],
  fruta: ['fruta'],
  verdura: ['verdura', 'hortaliza'],
  bolleria: ['bolleria'],
  dulces: ['dulce', 'golosina'],
  chuches: ['golosina'],
  chuchería: ['golosina'],
  chucheria: ['golosina'],
  gominola: ['golosina'],
  snack: ['aperitivo', 'snack'],
  patatillas: ['patata'],
  papas: ['patata'],
  aceitunas: ['aceituna'],
  olivas: ['aceituna'],
  pasta: ['pasta'],
  espaguetis: ['spaghetti', 'espagueti'],
  spaguetti: ['spaghetti'],
  tallarines: ['tallarin'],
  fideos: ['fideo'],
  papel: ['papel'],
  cocina: ['cocina'],
  rollo: ['rollo', 'papel'],
  basura: ['basura'],
  compresas: ['compresa'],
  tampones: ['tampon'],
  pañales: ['panal'],
  panales: ['panal'],
  colonia: ['colonia', 'perfume'],
  desodorante: ['desodorante'],
  champu: ['champu'],
  suavizante: ['suavizante'],
  detergente: ['detergente'],
  lejia: ['lejia'],
  fregasuelos: ['friegasuelos', 'limpiasuelos', 'limpiahogar'],
  friegasuelos: ['limpiasuelos', 'limpiahogar'],
  multiusos: ['multiusos', 'limpiahogar'],
  estropajo: ['estropajo', 'esponja'],
  bayeta: ['bayeta'],
  pilas: ['pila'],
  bombilla: ['bombilla'],
  zumo: ['zumo', 'nectar'],
  birra: ['cerveza'],
  cerveza: ['cerveza'],
  vino: ['vino'],
  cava: ['cava', 'espumoso'],
  agua: ['agua'],
  hielo: ['hielo'],
  helados: ['helado'],
  polo: ['polo', 'helado'],
  cucurucho: ['cucurucho'],
  bocata: ['bocadillo'],
  pizzas: ['pizza'],
  nuggets: ['nugget'],
  pechuga: ['pechuga'],
  muslo: ['muslo', 'contramuslo'],
  alitas: ['ala', 'alita'],
  gambas: ['gamba', 'langostino'],
  langostinos: ['langostino', 'gamba'],
  boquerones: ['boqueron'],
  calamares: ['calamar'],
  sepia: ['sepia'],
  atun: ['atun'],
  bonito: ['bonito'],
  mantequilla: ['mantequilla'],
  margarina: ['margarina', 'vegetal'],
  nata: ['nata'],
  natillas: ['natilla'],
  flan: ['flan'],
  cuajada: ['cuajada'],
  requeson: ['requeson'],
  queso: ['queso'],
  jamon: ['jamon'],
  pavo: ['pavo'],
  huevo: ['huevo'],
  leche: ['leche'],
  cafe: ['cafe'],
  capsulas: ['capsula'],
  te: ['te', 'infusion'],
  manzanilla: ['manzanilla', 'infusion'],
  azucar: ['azucar'],
  edulcorante: ['edulcorante', 'sacarina'],
  harina: ['harina'],
  levadura: ['levadura'],
  galletas: ['galleta'],
  cereales: ['cereal'],
  tostadas: ['tostada', 'biscote'],
  biscotes: ['biscote', 'tostada'],
  pan: ['pan'],
  bimbo: ['molde'],
  molde: ['molde']
}
// Primeras partes habituales de palabras juntas
const PREFIXES = ['mini', 'maxi', 'super', 'micro', 'multi', 'extra', 'semi', 'anti', 'auto', 'ultra']

export function stem(w) {
  if (w.length <= 3) return w
  if (w.endsWith('ces') && w.length > 5) return w.slice(0, -3) + 'z'
  // 'yogures', 'limones', 'pañales', 'reyes': consonante + es
  if (/[aeiouáéíóú][rlndjy]es$/.test(w)) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1)
  return w
}

// Distancia de edición con tope (corta en cuanto la supera)
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      cur.push(v)
      if (v < best) best = v
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

const words = (s) =>
  norm(s)
    .replace(/[,.]/g, ' ')
    .split(' ')
    .filter(Boolean)

// ---------- Índice ----------

const FIELD_W = { n: 1, s: 0.55, c: 0.35, b: 0.6 }

export function buildIndex(cat, details = null) {
  const postings = new Map() // término -> Map(posición del producto -> peso del campo)
  const products = cat.products
  products.forEach((p, i) => {
    const fields = {
      n: p.n,
      s: p.s || '',
      c: cat.cats?.get?.(p.c)?.n || '',
      b: details?.[p.id]?.b || ''
    }
    p.nn ??= norm(p.n)
    p.tk ??= p.nn.split(' ')
    p.st ??= p.tk.map(stem)
    for (const [f, text] of Object.entries(fields)) {
      for (const w of words(text)) {
        if (STOP.has(w) && !KEEP_SHORT.has(w)) continue
        const t = stem(w)
        let m = postings.get(t)
        if (!m) postings.set(t, (m = new Map()))
        if ((m.get(i) || 0) < FIELD_W[f]) m.set(i, FIELD_W[f])
      }
    }
  })
  const N = products.length
  const idf = new Map()
  for (const [t, m] of postings) idf.set(t, Math.log(1 + N / m.size))
  const vocab = [...postings.keys()]
  const vocabSet = new Set(vocab)
  return { products, postings, idf, vocab, vocabSet, N, brandsIndexed: !!details }
}

// ---------- Consulta ----------

// Cada palabra de la búsqueda se convierte en un conjunto de términos del catálogo con un peso de confianza
function expandTerm(idx, w, isLast) {
  const out = new Map()
  const add = (t, conf) => {
    if (idx.postings.has(t) && (out.get(t) || 0) < conf) out.set(t, conf)
  }
  const s = stem(w)
  add(s, 1)
  add(w, 1)
  for (const syn of SYNONYMS[w] || SYNONYMS[s] || []) add(stem(syn), 0.9)
  // Prefijo: mientras se escribe ('lech' -> leche) y para palabras que empiezan igual
  if (s.length >= 2) {
    for (const t of idx.vocab) {
      if (t !== s && t.startsWith(s)) add(t, isLast ? 0.85 : t.length - s.length <= 3 ? 0.75 : 0.5)
    }
  }
  // Dentro de otra palabra ('higienico' en 'antihigienico'), solo con palabras largas
  if (s.length >= 5) for (const t of idx.vocab) if (!t.startsWith(s) && t.includes(s)) add(t, 0.45)
  // Erratas: 1 letra en palabras de 4 a 7, 2 en las más largas
  if (out.size === 0 || (out.size < 3 && s.length >= 5)) {
    const max = s.length >= 8 ? 2 : s.length >= 4 ? 1 : 0
    if (max) {
      for (const t of idx.vocab) {
        if (Math.abs(t.length - s.length) > max || t[0] !== s[0]) continue
        const d = editDistance(s, t, max)
        if (d <= max) add(t, d === 1 ? 0.7 : 0.55)
      }
    }
  }
  return out
}

// Palabras juntas: 'minihelados', 'papelhigienico'
function splitCompound(idx, w) {
  if (w.length < 7 || idx.vocabSet.has(stem(w))) return null
  const pre = PREFIXES.find((p) => w.startsWith(p) && w.length - p.length >= 3)
  if (pre) return [pre, w.slice(pre.length)]
  for (let i = 3; i <= w.length - 3; i++) {
    const a = w.slice(0, i)
    const b = w.slice(i)
    if (idx.vocabSet.has(stem(a)) && idx.vocabSet.has(stem(b))) return [a, b]
  }
  return null
}

export function queryTerms(idx, query) {
  let raw = words(query).filter((w) => !STOP.has(w) || KEEP_SHORT.has(w))
  // Palabras que Mercadona escribe juntas: 'cola cao' -> 'colacao'
  for (let i = 0; i < raw.length - 1; i++) {
    const joined = raw[i] + raw[i + 1]
    if (idx.vocabSet.has(stem(joined)) && !(idx.vocabSet.has(stem(raw[i])) && idx.vocabSet.has(stem(raw[i + 1])) && raw[i + 1].length > 3)) {
      raw = [...raw.slice(0, i), joined, ...raw.slice(i + 2)]
    }
  }
  const out = []
  raw.forEach((w, i) => {
    const parts = splitCompound(idx, w) || [w]
    for (const p of parts) out.push({ w: p, last: i === raw.length - 1 })
  })
  return out
}

const PREF_STOP = new Set(['de', 'la', 'el', 'con', 'y', 'en'])

export function parsePrefs(list = []) {
  return list
    .map((raw) => {
      const t = norm(raw).split(' ').filter(Boolean)
      const avoid = t[0] === 'evitar' || t[0] === 'no' || t[0] === 'nada'
      const ws = (avoid ? t.slice(1) : t).filter((w) => !PREF_STOP.has(w)).map(stem)
      return ws.length ? { raw, avoid, words: ws } : null
    })
    .filter(Boolean)
}

/**
 * Busca en el índice.
 * prefs: preferencias de la familia, learned: Map(id -> veces comprado), aliases: { 'texto normalizado': id }
 */
export function searchIndex(idx, query, { prefs = [], learned = new Map(), aliases = {}, limit = 20 } = {}) {
  if (!idx || !query?.trim()) return []
  // Lo aprendido de la familia va siempre primero, aunque la palabra no exista en el catálogo ('dinosaurus')
  const aliasId = aliases[norm(query)]
  const aliasP = aliasId ? idx.products.find((p) => p.id === aliasId) : null
  const withAlias = (list) => (aliasP ? [{ p: aliasP, score: 999, reasons: ['Lo elegisteis antes'] }, ...list.filter((r) => r.p.id !== aliasId)].slice(0, limit) : list)
  const terms = queryTerms(idx, query)
  if (!terms.length) return withAlias([])
  const expanded = terms.map((t) => ({ ...t, cands: expandTerm(idx, t.w, t.last) }))
  const useful = expanded.filter((t) => t.cands.size)
  if (!useful.length) return withAlias([])

  // Peso de cada palabra según lo informativa que es (las raras pesan más)
  // Si la palabra exacta existe, ninguna variación (prefijo, sinónimo, errata) puede pesar más que ella
  for (const t of useful) {
    const s0 = stem(t.w)
    // Sin palabra exacta (se está escribiendo 'lech'), todas las que empiezan igual pesan como la más común
    t.cap = idx.idf.get(s0) ?? idx.idf.get(t.w) ?? Math.min(...[...t.cands.keys()].map((c) => idx.idf.get(c) || Infinity))
    t.exact = idx.postings.has(s0) || idx.postings.has(t.w)
  }
  const idfOf = (t, c) => Math.min(idx.idf.get(c) || 0, t.cap)
  const weightOf = (t) => Math.max(...[...t.cands.keys()].map((c) => idfOf(t, c)))
  const totalW = useful.reduce((s, t) => s + weightOf(t), 0)

  const acc = new Map() // producto -> { score, matched, coverW }
  for (const t of useful) {
    const best = new Map() // mejor coincidencia de esta palabra en cada producto
    for (const [cand, conf0] of t.cands) {
      const idf = idfOf(t, cand)
      // Con la palabra exacta en el catálogo, lo que solo empieza igual cuenta mucho menos ('pan' frente a 'pandoro')
      const isSelf = cand === stem(t.w) || cand === t.w
      const conf = t.exact && !isSelf && !(SYNONYMS[t.w] || SYNONYMS[stem(t.w)] || []).map(stem).includes(cand) ? conf0 * 0.45 : conf0
      for (const [i, fw] of idx.postings.get(cand)) {
        const v = conf * fw * idf
        if ((best.get(i) || 0) < v) best.set(i, v)
      }
    }
    const tw = weightOf(t)
    const isFirst = t === useful[0]
    for (const [i, v] of best) {
      let a = acc.get(i)
      if (!a) acc.set(i, (a = { score: 0, matched: 0, coverW: 0, firsts: false }))
      a.score += isFirst ? v * 1.3 : v
      a.matched++
      a.coverW += tw
      if (isFirst) a.firsts = true
    }
  }

  const qStems = useful.map((t) => stem(t.w))
  // Primero, productos que encajan con todo (o casi todo si la frase es larga). Si no hay ninguno,
  // vale con la primera palabra importante y el resto solo sirve para ordenar.
  const strict = [...acc].filter(([, a]) => (useful.length <= 2 ? a.matched === useful.length : a.coverW >= totalW * 0.6))
  const pool = strict.length ? strict : [...acc].filter(([, a]) => a.firsts)
  const out = []
  for (const [i, a] of pool) {
    const p = idx.products[i]
    let score = a.score + (a.matched / useful.length) * 4
    // Empieza por lo buscado: 'leche' -> 'Leche entera' antes que 'Café con leche'
    if (p.st[0] && useful[0].cands.has(p.st[0])) score += 3 * (useful[0].cands.get(p.st[0]) || 0)
    if (p.st.some((s) => BABY.has(s)) && !qStems.some((s) => BABY.has(s))) score -= 3
    score -= p.tk.length * 0.12
    score += Math.min(learned.get(p.id) || 0, 6) * 2.5
    const reasons = []
    for (const pref of prefs) {
      if (!pref.words.some((w) => qStems.includes(w) || qStems.some((x) => w.startsWith(x)))) continue
      const extra = pref.words.filter((w) => !qStems.includes(w))
      if (!extra.length) continue
      const hits = extra.filter((w) => p.st.includes(w) || (w.length >= 4 && p.st.some((s) => s.startsWith(w))))
      if (pref.avoid) {
        if (hits.length === extra.length) score -= 15
      } else if (hits.length) {
        score += (hits.length / extra.length) * 12 + (hits.length === extra.length ? 14 : 0)
        if (hits.length === extra.length) reasons.push(pref.raw)
      }
    }
    out.push({ p, score, reasons })
  }
  out.sort((a, b) => b.score - a.score)
  return withAlias(out.slice(0, limit))
}
