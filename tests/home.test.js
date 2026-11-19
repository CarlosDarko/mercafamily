import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pantry, dietConflicts } from '../src/lib/home.js'

const ti = (name, dates) => dates.map((d, i) => ({ id: name + i, merc_id: name, name, bought_on: d }))

test('la despensa estima lo que queda según la frecuencia', () => {
  const p = pantry([...ti('Huevos', ['2026-11-01', '2026-11-09']), ...ti('Aceite', ['2026-10-01', '2026-11-10'])], {}, new Date(2026, 10, 15))
  const huevos = p.find((x) => x.name === 'Huevos')
  const aceite = p.find((x) => x.name === 'Aceite')
  assert.equal(huevos.every, 8)
  assert.equal(huevos.since, 6)
  assert.equal(huevos.state, 'low')
  assert.equal(aceite.state, 'ok')
})

test('se acabó y aún queda corrigen la estimación', () => {
  const items = ti('Leche', ['2026-11-01', '2026-11-08'])
  const out = pantry(items, { Leche: { state: 'out', at: '2026-11-10' } }, new Date(2026, 10, 11))
  assert.equal(out[0].state, 'out')
  const ok = pantry(items, { Leche: { state: 'ok', at: '2026-11-15' } }, new Date(2026, 10, 16))
  assert.equal(ok[0].state, 'ok')
})

test('alérgenos y dietas por persona', () => {
  const people = [{ name: 'Ana', avoid: ['lactosa'] }, { name: 'Leo', avoid: ['frutos_secos'] }]
  assert.equal(dietConflicts('Leche semidesnatada sin lactosa Hacendado', { a: 'Contiene leche' }, people).length, 0)
  const c = dietConflicts('Galletas rellenas de chocolate', { a: 'Contiene gluten, leche y avellana' }, people)
  assert.deepEqual(c.map((x) => x.person).sort(), ['Ana', 'Leo'])
})

import { cheaperFormat } from '../src/lib/home.js'
test('formato más barato del mismo producto', () => {
  const mk = (id, n, r, z) => ({ id, n, s: 'Aceite', rf: 'L', r, z })
  const list = [mk('1', 'Aceite de oliva 0,4º Hacendado', 4.2, 'Botella 1 l'), mk('2', 'Aceite de oliva 0,4º Hacendado garrafa', 3.35, 'Garrafa 5 l'), mk('3', 'Aceite de girasol Hacendado', 1.9, '1 l')]
  const f = cheaperFormat(list[0], list)
  assert.equal(f.p.id, '2')
  assert.equal(Math.round(f.saving * 100), 20)
  assert.equal(cheaperFormat(list[1], list), null)
})

import { suggestWeek, inSeason, foodGroup, STARTER_RECIPES } from '../src/lib/home.js'
test('menú propuesto variado con legumbre y pescado', () => {
  const slots = []
  for (let d = 1; d <= 7; d++) for (const slot of ['comida', 'cena']) slots.push({ day: `2026-11-${16 + d}`, slot })
  const plan = suggestWeek(slots, STARTER_RECIPES, new Set(), [], 7)
  assert.equal(plan.length, 14)
  const names = plan.map((x) => x.recipe.name)
  assert.equal(new Set(names).size, 14, 'sin repetir')
  assert.ok(plan.filter((x) => x.recipe.tags.includes('legumbre')).length >= 2)
  assert.ok(plan.filter((x) => x.recipe.tags.includes('pescado')).length >= 2)
  assert.ok(plan.filter((x) => x.slot === 'cena').every((x) => !x.recipe.tags.includes('legumbre')), 'sin legumbre de cena')
})

test('temporada y grupos de alimentos', () => {
  assert.equal(inSeason({ n: 'Mandarinas' }, 'Fruta y verdura', 12), true)
  assert.equal(inSeason({ n: 'Sandía' }, 'Fruta y verdura', 12), false)
  assert.equal(foodGroup('Arroz, legumbres y pasta', 'Lentejas y otros', 'Lenteja pardina'), 'legumbre')
  assert.equal(foodGroup('Conservas, caldos y cremas', 'Atún', 'Atún claro'), 'pescado')
  assert.equal(foodGroup('Carne', 'Embutido', 'Chorizo'), 'procesado')
  assert.equal(foodGroup('Agua y refrescos', 'Cola clásica', 'Coca-Cola'), 'dulce')
  assert.equal(foodGroup('Limpieza y hogar', 'Bayeta', 'Bayeta'), null)
})

test('atHome cuenta lo que hay en casa sin los básicos', async () => {
  const { atHome } = await import('../src/lib/home.js')
  const r = { ingredients: [{ q: 'lenteja cocida' }, { q: 'zanahoria' }, { q: 'cebolla' }, { q: 'sal fina', basic: true }] }
  const h = atHome(r, ['Lenteja cocida Hacendado', 'Zanahorias bolsa'])
  assert.equal(h.total, 3)
  assert.equal(h.have, 2)
  assert.deepEqual(h.missing, ['cebolla'])
})

test('suggestWeek: lo que no gusta baja sin desaparecer, lo apartado no sale y lo de fuera de temporada casi nunca', async () => {
  const { suggestWeek } = await import('../src/lib/home.js')
  const recipes = [
    { name: 'Gazpacho', slot: 'cena', tags: ['verdura'], season: [7, 8] },
    { name: 'Crema', slot: 'cena', tags: ['verdura'] },
    { name: 'Tortilla', slot: 'cena', tags: ['huevo'] },
    { name: 'Sopa', slot: 'cena', tags: ['verdura'] }
  ]
  const opts = { ratings: { Tortilla: -1 }, snoozed: { Sopa: '2026-12-31' }, month: 11 }
  for (let seed = 1; seed < 30; seed++) {
    const [p] = suggestWeek([{ day: '2026-11-17', slot: 'cena' }], recipes, new Set(), [], seed, opts)
    assert.equal(p.recipe.name, 'Crema')
  }
  // Si solo queda la que no gusta, se puede proponer
  const [only] = suggestWeek([{ day: '2026-11-17', slot: 'cena' }], [recipes[2]], new Set(), [], 1, opts)
  assert.equal(only.recipe.name, 'Tortilla')
})

test('el recetario tiene más de 250 recetas sin ids repetidos y las meriendas no entran en el menú', async () => {
  const { KB } = await import('../src/lib/recipes-kb.js')
  const { suggestWeek } = await import('../src/lib/home.js')
  assert.ok(KB.length > 250)
  assert.equal(new Set(KB.map((r) => r.id)).size, KB.length)
  const plan = suggestWeek([{ day: '2026-11-17', slot: 'cena' }, { day: '2026-11-18', slot: 'comida' }], KB.filter((r) => r.slot === 'merienda'))
  assert.equal(plan.length, 0)
})

test('lo que la familia dice que tiene entra en la despensa y las dudas salen una vez por semana', async () => {
  const { pantry, pantryDoubts } = await import('../src/lib/home.js')
  const today = new Date('2026-11-18T12:00:00')
  const overrides = { 't:garbanzos': { state: 'ok', at: '2026-11-17', name: 'Garbanzos' } }
  const st = pantry([], overrides, today)
  assert.equal(st.length, 1)
  assert.equal(st[0].state, 'ok')
  assert.equal(st[0].told, true)
  const trips = ti('leche', ['2026-10-20', '2026-10-27', '2026-11-03'])
  const st2 = pantry(trips, {}, today)
  assert.equal(pantryDoubts(st2, {}, today).length, 1)
  assert.equal(pantryDoubts(st2, { leche: { state: 'ok', at: '2026-11-15' } }, today).length, 0)
})

test("'Otra' en una cena no repite siempre pescado", async () => {
  const { suggestWeek, STARTER_RECIPES, tagsOf } = await import('../src/lib/home.js')
  const skipped = []
  const avoid = {}
  let fish = 0
  for (let i = 0; i < 15; i++) {
    const [p] = suggestWeek([{ day: '2026-11-18', slot: 'cena' }], STARTER_RECIPES.filter((r) => !skipped.includes(r.name)), new Set(), [], 7, { month: 11, avoid })
    if (tagsOf(p.recipe).includes('pescado')) fish++
    skipped.push(p.recipe.name)
    for (const t of tagsOf(p.recipe)) avoid[t] = (avoid[t] || 0) + 1
  }
  assert.ok(fish <= 6, `pescado ${fish} de 15`)
})

test('raciones: las cantidades se recalculan y los envases se redondean hacia arriba', async () => {
  const { scaleAmount, packQty } = await import('../src/lib/home.js')
  const f5 = 5 / 3
  assert.equal(scaleAmount('300 g', f5), '500 g')
  assert.equal(scaleAmount('2 latas', f5), '4 latas')
  assert.equal(scaleAmount('1/2', f5), '1')
  assert.equal(scaleAmount('6', f5), '10')
  assert.equal(scaleAmount('un chorro', f5), 'un chorro')
  assert.equal(scaleAmount('1,5 l', f5), '2,5 l')
  assert.equal(scaleAmount('700 ml', f5), '1,25 l')
  assert.equal(scaleAmount('2', 2 / 3), '1')
  assert.equal(scaleAmount('3', 2 / 3), '2')
  assert.equal(scaleAmount('1', 5 / 3), '1 y ½')
  assert.equal(scaleAmount('1 lata', 1 / 3), '1 lata')
  assert.equal(scaleAmount('300 g', 1), '300 g')
  assert.equal(packQty('2 latas', f5), 4)
  assert.equal(packQty('300 g', f5), 1)
})
