import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { search, stem } from '../src/lib/catalog.js'

// Búsquedas reales de casa contra el catálogo descargado de Mercadona
const data = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'))
const cat = { ...data, cats: new Map(data.categories.map((c) => [c.id, c])) }
const first = (q) => search(cat, q, { limit: 5 }).map((r) => r.p.n.toLowerCase())

test('plurales y singulares', () => {
  assert.equal(stem('yogures'), 'yogur')
  assert.equal(stem('tomates'), 'tomate')
  assert.equal(stem('limones'), 'limon')
  assert.equal(stem('nueces'), 'nuez')
})

const CASOS = {
  yogures: 'yogur',
  platanos: 'plátano',
  'jamon york': 'jamón cocido',
  'gel de ducha': 'gel de baño',
  'pasta de dientes': 'dentífrico',
  friegaplatos: 'lavavajillas',
  hamburguesas: 'hamburguesa',
  'minihelados de nata': 'mini helado cucurucho sabor nata',
  macarrones: 'macarrón',
  uvas: 'uva',
  yougur: 'yogur',
  servilletas: 'servilleta'
}

for (const [q, esperado] of Object.entries(CASOS)) {
  test(`'${q}' encuentra ${esperado}`, () => {
    const r = first(q)
    assert.ok(r.some((n) => n.includes(esperado)), `${q}: ${r.join(' | ')}`)
  })
}
