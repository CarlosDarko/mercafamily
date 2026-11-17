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
