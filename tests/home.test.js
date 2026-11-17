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
