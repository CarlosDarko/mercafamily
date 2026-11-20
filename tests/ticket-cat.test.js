import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { search } from '../src/lib/catalog.js'
import { parseTicket, parsePages, translateLine, matchToCatalog } from '../src/lib/ticket.js'

const data = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'))
const cat = { ...data, cats: new Map(data.categories.map((c) => [c.id, c])) }
const find = (q, n) => search(cat, q, { limit: n })
const eur = (v) => v.toFixed(2).replace('.', ',')
// Precios del catálogo actual, para que la prueba siga valiendo cuando cambien
const priceOf = (re) => data.products.find((p) => re.test(p.n) && /^Pack-6 · 6 x briks|Paquete · 1 kg/.test(p.z)).p

// Ticket inventado en catalán con los errores típicos del lector (cantidad pegada, 'I' por 1, importes partidos)
const leche = priceOf(/^Leche entera Hacendado$/)
const arroz = priceOf(/^Arroz largo Hacendado$/)
const TEXT = `Descripció P. Unit Imp.(€)
1LLET SENCERA ${eur(leche)}
I ARRÒS LLARG ${eur(arroz).replace(',', ', ')}
5 BOSSA PLASTIC 0,15 0,75
1 TONYINA CLARA NATURAL
TOTAL (€) 12,34
TARGETA BANCÀRIA 12,34
20/11/2026 18:32`

test('ticket en catalán: líneas, cantidades, total y fecha', () => {
  const t = parseTicket(TEXT)
  assert.equal(t.lines.length, 4)
  assert.equal(t.lines[0].qty, 1)
  assert.equal(t.lines[0].total, leche)
  assert.equal(t.lines[1].total, arroz)
  assert.deepEqual([t.lines[2].qty, t.lines[2].unit, t.lines[2].total], [5, 0.15, 0.75])
  assert.equal(t.total, 12.34)
  assert.equal(t.date, '2026-11-20')
})

test('abreviaturas catalanas a palabras del catálogo', () => {
  assert.equal(translateLine('LLET SEMI S/LACT'), 'leche semidesnatada sin lactosa')
  assert.equal(translateLine('POMA GOLDEN'), 'manzana golden')
  assert.equal(translateLine('PERNIL DOLÇ TALLS'), 'jamon cocido lonchas')
  assert.equal(translateLine('XOCOLATA NEGRA'), 'chocolate negra')
})

test('cada línea con su producto: por precio exacto, por nombre y las bolsas aparte', () => {
  const m = matchToCatalog(parseTicket(TEXT).lines, find)
  assert.match(m[0].p.n, /Leche entera/)
  assert.ok(m[0].sure)
  assert.match(m[1].p.n, /Arroz largo/)
  assert.ok(m[2].bag)
  assert.match(m[3].p.n, /Atún/)
})

test('varias fotos que se solapan no repiten líneas', () => {
  const a = '1 LLET SENCERA 0,96\n1 ARRÒS LLARG 1,20\n1 POMA GOLDEN 2,10'
  const b = '1 ARRÒS LLARG 1,20\n1 POMA GOLDEN 2,10\n1 SUCRE 0,90\nTOTAL (€) 5,16'
  const t = parsePages([a, b])
  assert.equal(t.lines.length, 4)
  assert.equal(t.total, 5.16)
})
