import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeNutriScore, typicalNutrition } from '../src/lib/nutriscore.js'

test('Nutri-Score calculado: alimentos conocidos en su letra', () => {
  assert.equal(computeNutriScore({ kcal: 61, sugars: 4.7, sat: 2.1, salt: 0.13, protein: 3.5, fiber: 0 }), 'b') // yogur natural
  assert.equal(computeNutriScore({ kcal: 470, sugars: 22, sat: 8, salt: 0.7, protein: 7, fiber: 2.5 }), 'e') // galletas
  assert.equal(computeNutriScore({ kcal: 52, sugars: 10.4, sat: 0, salt: 0, protein: 0.3, fiber: 2.4, fv: 100 }), 'a') // manzana
  assert.equal(computeNutriScore({ kcal: 61 }), null)
})

test('valores típicos solo para frescos tal cual', () => {
  assert.equal(typicalNutrition({ n: 'Huevos', c: 6 }).grade, 'a')
  assert.ok(typicalNutrition({ n: 'Merluza del Cabo ultracongelada', c: 17 }))
  assert.equal(typicalNutrition({ n: 'Merluza rebozada', c: 17 }), null)
  assert.equal(typicalNutrition({ n: 'Galletas tostadas', c: 7 }), null)
})
