import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSpoken } from '../src/lib/voice.js'

test('frases dichas a la app', () => {
  assert.deepEqual(parseSpoken('Añade leche, dos de tomate y pan de molde'), ['leche', '2 tomate', 'pan de molde'])
  assert.deepEqual(parseSpoken('apunta media docena de huevos y un paquete de macarrones'), ['6 huevos', 'macarrones'])
  assert.deepEqual(parseSpoken('nos falta aceite de oliva, 3 yogures, papel higiénico'), ['aceite de oliva', '3 yogures', 'papel higiénico'])
  assert.deepEqual(parseSpoken('tomates'), ['tomates'])
})
