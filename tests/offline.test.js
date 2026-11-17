import { test } from 'node:test'
import assert from 'node:assert/strict'

// Entorno mínimo de navegador
const store = new Map()
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
globalThis.window = { addEventListener() {} }
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
globalThis.setInterval = () => 0

const { withQueue, pendingCount } = await import('../src/lib/offline.js')

test('la cola no se queda ocupada tras vaciarse y envía en orden', async () => {
  const sent = []
  const be = withQueue({ async upsert(t, r) { sent.push(r.id) }, async update() {}, async remove() {} }, {})
  await be.flush() // cola vacía: antes se quedaba marcada como ocupada para siempre
  await be.upsert('items', { id: 'a' })
  await be.upsert('items', { id: 'b' })
  assert.deepEqual(sent, ['a', 'b'])
  assert.equal(pendingCount(), 0)
})

test('sin red guarda y envía al volver', async () => {
  let online = false
  const sent = []
  const be = withQueue({ async upsert(t, r) { if (!online) throw new TypeError('Failed to fetch'); sent.push(r.id) }, async update() {}, async remove() {} }, {})
  await be.upsert('items', { id: 'c' })
  await be.upsert('items', { id: 'd' })
  assert.equal(pendingCount(), 2)
  online = true
  await be.flush()
  assert.deepEqual(sent, ['c', 'd'])
  assert.equal(pendingCount(), 0)
})
