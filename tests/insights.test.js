import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueSuggestions, spendByWeek, priceChanges } from '../src/lib/insights.js'
import { search, parsePrefs } from '../src/lib/catalog.js'
import { norm } from '../src/lib/format.js'

test('detecta productos que toca comprar por frecuencia', () => {
  const ti = ['2026-10-01', '2026-10-09', '2026-10-17'].map((d, i) => ({ id: String(i), merc_id: '1', name: 'Huevos', bought_on: d, qty: 1 }))
  const { due } = dueSuggestions(ti, [], null, new Date(2026, 9, 26))
  assert.equal(due.length, 1)
  assert.equal(due[0].every, 8)
  assert.equal(due[0].since, 9)
})

test('no sugiere lo que ya está en la lista', () => {
  const ti = ['2026-10-01', '2026-10-09'].map((d, i) => ({ id: String(i), merc_id: '1', name: 'Huevos', bought_on: d }))
  const { due } = dueSuggestions(ti, [{ merc_id: '1', name: 'Huevos' }], null, new Date(2026, 9, 26))
  assert.equal(due.length, 0)
})

test('agrupa gasto por semanas', () => {
  const b = spendByWeek([{ date: '2026-11-16', total: 50 }, { date: '2026-11-17', total: 20 }], 2, new Date(2026, 10, 17))
  assert.equal(b[1].total, 70)
})

test('las preferencias ordenan la búsqueda', () => {
  const mk = (id, n) => ({ id, n, nn: norm(n), tk: norm(n).split(' ') })
  const cat = { products: [mk('a', 'Leche entera Hacendado'), mk('b', 'Leche semidesnatada sin lactosa Hacendado'), mk('c', 'Leche desnatada Hacendado')] }
  const r = search(cat, 'leche', { prefs: parsePrefs(['Leche semidesnatada sin lactosa']) })
  assert.equal(r[0].p.id, 'b')
  assert.ok(r[0].reasons.length)
})

test('detecta subidas de precio', () => {
  const catalog = { byId: new Map([['1', { id: '1', n: 'Aceite' }]]) }
  const r = priceChanges({ prices: { 1: [['2026-10-01', 3], ['2026-11-01', 3.3]] } }, ['1'], catalog)
  assert.equal(Math.round(r[0].diff * 100), 10)
})

import { basketInflation } from '../src/lib/insights.js'
test('inflación de vuestra cesta frente al IPC', () => {
  const catalog = { byId: new Map([['a', { id: 'a', p: 1.1 }], ['b', { id: 'b', p: 2 }]]) }
  const ti = [
    { merc_id: 'a', price: 1, qty: 1, bought_on: '2026-01-10' },
    { merc_id: 'a', price: 1.05, qty: 1, bought_on: '2026-06-10' },
    { merc_id: 'b', price: 2, qty: 1, bought_on: '2026-01-12' }
  ]
  const ipc = { index: [['2026-01', 100], ['2026-06', 101], ['2026-10', 102]] }
  const r = basketInflation(ti, catalog, ipc, new Date(2026, 10, 17))
  // a sube un 10 % (peso 2,05) y b nada (peso 2): (2,05 × 1,1 + 2) / 4,05 - 1 = 5,06 %
  assert.equal(Math.round(r.change * 1000) / 10, 5.1)
  assert.equal(Math.round(r.ipc * 100), 2)
  assert.equal(r.since, '2026-01-10')
  assert.equal(r.movers[0].p.id, 'a')
})
