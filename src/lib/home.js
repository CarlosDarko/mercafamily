// Lo que pasa en casa: despensa estimada, recetas de partida, alérgenos y dietas
import { parseDate, daysBetween, norm, isoDate } from './format.js'

const keyOf = (x) => x.merc_id || `t:${String(x.name).toLowerCase()}`

/**
 * Despensa estimada sin rellenar nada: cada producto comprado en los últimos 90 días,
 * con cuánto le queda según cada cuánto lo compráis.
 * overrides: { clave: { state: 'out' | 'ok', at: 'AAAA-MM-DD' } } de lo que la familia corrige a mano.
 */
export function pantry(tripItems, overrides = {}, today = new Date(), days = 90) {
  const from = isoDate(new Date(today.getTime() - days * 86400000))
  const by = new Map()
  for (const ti of tripItems) {
    const k = keyOf(ti)
    let e = by.get(k)
    if (!e) by.set(k, (e = { key: k, merc_id: ti.merc_id, name: ti.name, category: ti.category, dates: new Set() }))
    e.dates.add(ti.bought_on)
    e.name = ti.name
  }
  const out = []
  for (const e of by.values()) {
    const dates = [...e.dates].sort()
    let last = dates[dates.length - 1]
    if (last < from) continue
    const every = dates.length >= 2 ? daysBetween(parseDate(dates[0]), parseDate(last)) / (dates.length - 1) : null
    const o = overrides[e.key]
    if (o?.state === 'out' && o.at >= last) {
      out.push({ ...e, every, since: daysBetween(parseDate(o.at), today), left: 0, state: 'out' })
      continue
    }
    if (o?.state === 'ok' && o.at > last) last = o.at
    const since = daysBetween(parseDate(last), today)
    const span = every && every >= 2 ? every : 14
    const left = Math.max(0, Math.min(1, 1 - since / span))
    out.push({ ...e, every, since, left, state: left <= 0 ? 'out' : left < 0.34 ? 'low' : 'ok' })
  }
  return out.sort((a, b) => a.left - b.left || a.name.localeCompare(b.name, 'es'))
}

// Recetas de partida: el recetario de src/lib/recipes-kb.js
import { KB } from './recipes-kb.js'
export const STARTER_RECIPES = KB

// Etiquetas de una receta propia a partir de sus ingredientes
export function tagsOf(recipe) {
  if (recipe.tags?.length) return recipe.tags
  if (recipe.meta?.tags?.length) return recipe.meta.tags
  const t = norm((recipe.ingredients || []).map((i) => i.name).join(' ') + ' ' + recipe.name)
  const tags = []
  if (/lentej|garbanz|alubi|judia blanca|frijol/.test(t)) tags.push('legumbre')
  if (/merluz|salmon|atun|bacalao|lubin|dorad|sardin|boquer|gamba|calamar|sepia|pescad|bonito|caball/.test(t)) tags.push('pescado')
  if (/pollo|ternera|vacuno|cerdo|lomo|carne|pavo|cordero|albondig|hamburg|burger|chorizo|salchich/.test(t)) tags.push('carne')
  if (/huevo|tortilla|revuelto/.test(t)) tags.push('huevo')
  if (/calabac|berenjen|pimient|espinac|brocol|judia verde|alcachof|calabaz|verdur|lechug|champin|setas|coliflor/.test(t)) tags.push('verdura')
  if (/macarr|espagu|spaghet|pasta|fideo|lasa|pizza/.test(t)) tags.push('pasta')
  if (/arroz|paella/.test(t)) tags.push('arroz')
  return tags
}

/**
 * Propuesta de menú para los huecos libres de la semana.
 * slots: [{ day, slot }] libres. recipes: [{ id?, name, slot, ingredients, tags? }]. pantryOk: Set de merc_id que hay en casa.
 * Reglas: no repetir en la semana si hay recetas de sobra, al menos 2 de legumbre y 2 de pescado si hay huecos,
 * las cenas más ligeras (verdura, huevo, pescado) y se prefiere lo que aprovecha la despensa. 'seed' cambia la propuesta.
 */
export function suggestWeek(slots, recipes, pantryOk = new Set(), used = [], seed = 1) {
  let r = seed >>> 0 || 1
  const rand = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296)
  const pool = recipes.map((x) => ({ ...x, tags: tagsOf(x), uses: used.filter((u) => u === x.name).length }))
  const slotOf = (x) => x.slot || x.meta?.slot
  const fits = (x, slot) => !slotOf(x) || slotOf(x) === 'ambas' || slotOf(x) === slot
  const out = []
  const need = { legumbre: 2, pescado: 2 }
  for (const s of slots) {
    const cands = pool.filter((x) => fits(x, s.slot))
    if (!cands.length) continue
    const scored = cands.map((x) => {
      let score = rand() * 2
      score -= x.uses * 6
      if (s.slot === 'comida' && x.tags.includes('legumbre') && need.legumbre > 0) score += 4
      if (x.tags.includes('pescado') && need.pescado > 0) score += 3
      if (s.slot === 'cena' && x.tags.some((t) => ['verdura', 'huevo', 'pescado'].includes(t))) score += 1.5
      if (s.slot === 'cena' && x.tags.includes('legumbre')) score -= 3
      score += (x.ingredients || []).filter((i) => i.merc_id && pantryOk.has(i.merc_id)).length * 0.8
      // El mismo tipo de plato dos veces seguidas no
      const prev = out[out.length - 1]
      if (prev && prev.recipe.tags.some((t) => x.tags.includes(t) && t !== 'verdura')) score -= 2
      return { x, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const pick = scored[0].x
    pick.uses++
    for (const t of pick.tags) if (need[t] > 0) need[t]--
    out.push({ ...s, recipe: pick })
  }
  return out
}

// ---------- Temporada (fruta y verdura en España) ----------

const SEASON = {
  1: 'naranja mandarina limon kiwi pomelo manzana pera aguacate chirimoya alcachofa brocoli coliflor col acelga espinaca puerro apio zanahoria calabaza lombarda cardo endibia escarola nabo remolacha',
  2: 'naranja mandarina limon kiwi pomelo manzana pera aguacate fresa alcachofa brocoli coliflor col acelga espinaca puerro apio zanahoria lombarda cardo endibia escarola',
  3: 'naranja limon kiwi pomelo fresa manzana alcachofa esparrago guisante haba brocoli coliflor espinaca acelga puerro zanahoria lechuga',
  4: 'fresa nispero naranja limon kiwi platano esparrago guisante haba alcachofa lechuga zanahoria espinaca ajo',
  5: 'fresa cereza nispero albaricoque melocoton platano esparrago guisante haba judia lechuga calabacin pepino tomate',
  6: 'cereza albaricoque melocoton nectarina ciruela sandia melon fresa breva tomate pepino calabacin pimiento berenjena judia lechuga',
  7: 'sandia melon melocoton nectarina ciruela albaricoque paraguayo higo pera tomate pimiento berenjena calabacin pepino judia',
  8: 'sandia melon melocoton nectarina ciruela higo uva pera paraguayo tomate pimiento berenjena calabacin pepino judia',
  9: 'uva higo melon pera manzana melocoton ciruela granada tomate pimiento berenjena calabacin calabaza judia',
  10: 'uva granada manzana pera caqui chirimoya membrillo mandarina calabaza seta boniato coliflor brocoli acelga espinaca puerro',
  11: 'mandarina naranja caqui granada manzana pera chirimoya kiwi aguacate calabaza boniato alcachofa brocoli coliflor col acelga espinaca puerro cardo seta',
  12: 'mandarina naranja limon kiwi manzana pera chirimoya aguacate alcachofa brocoli coliflor col lombarda cardo acelga espinaca puerro calabaza endibia escarola'
}
export const seasonWords = (month = new Date().getMonth() + 1) => SEASON[month].split(' ')

// ¿Es fruta o verdura de temporada? Solo productos frescos de la categoría de fruta y verdura
export function inSeason(p, catName, month) {
  if (!p || !/fruta y verdura/i.test(catName || '')) return false
  const first = norm(p.n).split(' ')[0]
  return seasonWords(month).some((w) => first.startsWith(w))
}

// ---------- Equilibrio de la compra ----------

const FRUIT_SUBS = /citric|tropical|manzana|melon|otras frutas|platano|frutos rojos|fruta/i
const FISH_SUBS = /atun|bonito|sardina|caballa|mejillon|berberecho|conservas de pescado|pescado|marisco/i
const SWEET_SUBS = /bolleria|galletas|con chocolate|cola clasica|naranja|limon|lima limon|gaseosa|otros refrescos|energetico|patatas fritas|snacks|helado|cucurucho|barras de helado|bombones|golosina|chocolat|caramelo|turron|crema de untar|cremas de untar/i

export function foodGroup(catName, sub, name) {
  const c = norm(catName)
  const s = norm(sub)
  const n = norm(name)
  if (/limpieza|cuidado|maquillaje|mascota|bebe|fitoterapia|bodega/.test(c)) return null
  if (c.startsWith('fruta y verdura')) return FRUIT_SUBS.test(s) ? 'fruta' : 'verdura'
  if (c.startsWith('congelados') && /fruta/.test(s)) return 'fruta'
  if (c.startsWith('congelados') && /verdura|patata/.test(s)) return 'verdura'
  if (/alubia|garbanzo|lenteja/.test(s)) return 'legumbre'
  if (c.startsWith('marisco y pescado') || (c.startsWith('congelados') && /pescado|marisco/.test(s)) || (c.startsWith('conservas') && FISH_SUBS.test(s))) return 'pescado'
  if (c.startsWith('conservas') && /verdura|tomate|gazpacho|crema/.test(s)) return 'verdura'
  if (c.startsWith('carne')) return /embutido|empanado|hamburguesa|elaborado/.test(s) ? 'procesado' : 'carne'
  if (c.startsWith('charcuteria')) return /queso/.test(s) ? 'lacteo' : 'procesado'
  if (c.startsWith('pizzas')) return 'procesado'
  if (c.startsWith('huevos') || c.startsWith('postres')) return /huevo/.test(s) || /huevo/.test(n) ? 'huevo' : 'lacteo'
  if (c.startsWith('azucar') || c.startsWith('zumos') || SWEET_SUBS.test(s)) return 'dulce'
  if (c.startsWith('arroz') || c.startsWith('panaderia') || c.startsWith('cereales')) return 'cereal'
  if (c.startsWith('agua')) return null
  return 'otros'
}

// Orientativo: reparto del gasto en comida de los últimos días frente a referencias sencillas
export const BALANCE_TIPS = {
  fruta: { label: 'Fruta', min: 0.12, low: 'Podríais comprar más fruta.' },
  verdura: { label: 'Verdura y hortalizas', min: 0.12, low: 'Podríais comprar más verdura.' },
  legumbre: { label: 'Legumbre', min: 0.02, low: 'Faltan legumbres: lo recomendable es 2 a 4 veces por semana.' },
  pescado: { label: 'Pescado', min: 0.08, low: 'Poco pescado: lo recomendable es 2 o 3 veces por semana.' },
  carne: { label: 'Carne', max: 0.2, high: 'Mucha carne: mejor alternarla con pescado, huevo y legumbre.' },
  procesado: { label: 'Embutido y procesados', max: 0.1, high: 'Mucho embutido y procesados: mejor de vez en cuando.' },
  dulce: { label: 'Dulces, refrescos y snacks', max: 0.1, high: 'Bastante dulce y refrescos: mejor reducirlos.' },
  lacteo: { label: 'Lácteos' },
  huevo: { label: 'Huevos' },
  cereal: { label: 'Pan, pasta, arroz y cereales' },
  otros: { label: 'Otros' }
}

export function balance(tripItems, catalog, days = 30, today = new Date()) {
  const from = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10)
  const sums = {}
  let total = 0
  for (const t of tripItems) {
    if (t.bought_on < from) continue
    const p = t.merc_id ? catalog?.byId.get(t.merc_id) : null
    const g = p ? foodGroup(catalog.cats.get(p.c)?.n || '', p.s || '', p.n) : null
    if (!g) continue
    const v = (t.price || 0) * (t.qty || 1)
    sums[g] = (sums[g] || 0) + v
    total += v
  }
  const groups = Object.entries(BALANCE_TIPS).map(([k, tip]) => {
    const share = total ? (sums[k] || 0) / total : 0
    const status = tip.min != null && share < tip.min ? 'low' : tip.max != null && share > tip.max ? 'high' : 'ok'
    return { key: k, label: tip.label, value: sums[k] || 0, share, status, tip: status === 'low' ? tip.low : status === 'high' ? tip.high : null, target: tip.min != null ? `más del ${Math.round(tip.min * 100)} %` : tip.max != null ? `menos del ${Math.round(tip.max * 100)} %` : null }
  })
  return { total, groups: groups.filter((g) => g.value > 0 || g.status === 'low') }
}

// Restricciones habituales y cómo se escriben en ingredientes y alérgenos
export const DIETS = {
  lactosa: { label: 'Sin lactosa', words: ['leche', 'lactosa', 'nata', 'mantequilla', 'queso', 'suero lacteo', 'yogur'] },
  gluten: { label: 'Sin gluten', words: ['gluten', 'trigo', 'cebada', 'centeno', 'espelta', 'avena'] },
  frutos_secos: { label: 'Sin frutos secos', words: ['frutos de cascara', 'almendra', 'avellana', 'nuez', 'anacardo', 'pistacho', 'cacahuete'] },
  huevo: { label: 'Sin huevo', words: ['huevo'] },
  pescado: { label: 'Sin pescado ni marisco', words: ['pescado', 'crustaceo', 'molusco', 'marisco'] },
  soja: { label: 'Sin soja', words: ['soja'] },
  cerdo: { label: 'Sin cerdo', words: ['cerdo', 'jamon', 'chorizo', 'bacon', 'panceta', 'lomo', 'salchichon', 'fuet'] },
  vegetariano: { label: 'Vegetariana', words: ['carne', 'pollo', 'pavo', 'ternera', 'vacuno', 'cerdo', 'jamon', 'chorizo', 'atun', 'pescado', 'gelatina'] }
}

/**
 * ¿Choca este producto con la dieta de alguien?
 * people: [{ name, avoid: ['lactosa', ...] }], details: { g: ingredientes, a: alérgenos }
 */
export function dietConflicts(productName, details, people = []) {
  const name = norm(productName)
  const text = norm(`${details?.a || ''} ${details?.g || ''}`)
  const hits = []
  for (const person of people) {
    for (const d of person.avoid || []) {
      const diet = DIETS[d]
      if (!diet) continue
      // 'sin lactosa' o 'sin gluten' en el nombre lo deja libre
      if (name.includes(`sin ${d.replace('_', ' ')}`)) continue
      const found = diet.words.find((w) => name.includes(w) || (text && text.includes(w) && !text.includes(`sin ${w}`)))
      if (found) hits.push({ person: person.name, diet: d, label: diet.label, word: found })
    }
  }
  return hits
}

// ---------- Formatos del mismo producto ----------

const SIZE_WORDS = new Set(['pack', 'brik', 'brick', 'briks', 'botella', 'botellas', 'garrafa', 'lata', 'latas', 'bote', 'x', 'mini', 'grande', 'familiar', 'formato', 'ahorro', 'bolsa', 'paquete', 'caja', 'tarro', 'pequena', 'pequeno', 'mediano', 'mediana'])
const baseTokens = (name) =>
  norm(name)
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .split(' ')
    .filter((w) => w && !SIZE_WORDS.has(w) && !/^(ml|l|g|kg|cl|ud|uds|de|del|con|y)$/.test(w))

/**
 * Otro formato del mismo producto que sale más barato por kilo o litro (al menos un 5 %).
 * Mismo tipo de producto, misma unidad de referencia y casi el mismo nombre sin tamaños.
 */
export function cheaperFormat(p, products) {
  if (!p?.r || !p.rf) return null
  const base = baseTokens(p.n)
  if (!base.length) return null
  let best = null
  for (const x of products) {
    if (x.id === p.id || x.s !== p.s || x.rf !== p.rf || !x.r || x.r >= p.r * 0.95) continue
    // El mismo producto: mismas palabras quitando las de tamaño ('virgen extra' no es 'virgen')
    const xb = baseTokens(x.n)
    if (xb.length !== base.length || !base.every((w) => xb.includes(w))) continue
    if (!best || x.r < best.r) best = x
  }
  return best ? { p: best, saving: 1 - best.r / p.r } : null
}
