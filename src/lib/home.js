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

// Recetas de partida: los ingredientes se buscan en el catálogo al usarlas
export const STARTER_RECIPES = [
  { name: 'Lentejas estofadas', ingredients: ['lenteja pardina', 'chorizo', 'zanahoria', 'patata', 'cebolla', 'pimentón'] },
  { name: 'Tortilla de patata', ingredients: ['huevos', 'patatas', 'cebolla', 'aceite de oliva'] },
  { name: 'Macarrones con tomate', ingredients: ['macarrón', 'tomate frito', 'carne picada', 'queso rallado'] },
  { name: 'Pizza casera', ingredients: ['masa pizza', 'tomate frito', 'mozzarella', 'jamón cocido', 'orégano'] },
  { name: 'Pollo al horno con patatas', ingredients: ['pollo entero', 'patatas', 'limón', 'ajo'] },
  { name: 'Ensalada completa', ingredients: ['lechuga', 'tomate', 'atún', 'maíz dulce', 'huevos'] },
  { name: 'Merluza con verduras', ingredients: ['merluza', 'calabacín', 'pimiento', 'cebolla'] },
  { name: 'Crema de calabacín', ingredients: ['calabacín', 'patata', 'cebolla', 'quesitos'] },
  { name: 'Hamburguesas caseras', ingredients: ['burger vacuno', 'pan de burger', 'queso lonchas', 'lechuga', 'tomate'] },
  { name: 'Arroz a la cubana', ingredients: ['arroz redondo', 'tomate frito', 'huevos', 'plátano'] },
  { name: 'Sopa de fideos', ingredients: ['caldo de pollo', 'fideo', 'huevos'] },
  { name: 'Salmón a la plancha', ingredients: ['salmón', 'espárragos verdes', 'limón'] }
]

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
