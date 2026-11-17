import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTicket, matchLines } from '../src/lib/ticket.js'

const TEXT = `MERCADONA, S.A. A-46103834
C/ EJEMPLO 1
FACTURA SIMPLIFICADA: 1234-567-890123
Descripción P. Unit Importe
1 LECHE SEMI S/LACT 6,00
2 TOMATE PERA 1,30 2,60
1 PLATANO
0,950 kg 1,99 €/kg 1,89
1 ACEITE OLIVA 0,4 16,75
TOTAL (€) 27,24
TARJETA BANCARIA 27,24
IVA BASE IMPONIBLE (€) CUOTA (€)`

test('lee total y líneas de un ticket', () => {
  const t = parseTicket(TEXT)
  assert.equal(t.total, 27.24)
  assert.equal(t.lines.length, 4)
  assert.deepEqual(t.lines[1], { qty: 2, desc: 'TOMATE PERA', unit: 1.3, total: 2.6 })
  assert.equal(t.lines[2].total, 1.89)
  assert.equal(t.sum, 27.24)
})

test('une las líneas con el carro', () => {
  const cart = [
    { id: 'a', name: 'Leche semidesnatada sin lactosa Hacendado' },
    { id: 'b', name: 'Tomate pera' },
    { id: 'c', name: 'Aceite de oliva 0,4º Hacendado' },
    { id: 'd', name: 'Plátano de Canarias IGP' }
  ]
  const m = matchLines(parseTicket(TEXT).lines, cart)
  const by = Object.fromEntries(m.map((x) => [x.item.id, x.line.unit]))
  assert.equal(by.b, 1.3)
  assert.equal(by.c, 16.75)
  assert.equal(by.d, 1.89)
  assert.equal(by.a, 6)
})
