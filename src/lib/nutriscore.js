// Nutri-Score calculado por la app (algoritmo de 2023 para alimentos sólidos) y valores típicos de alimentos frescos
// para cuando Open Food Facts no tiene el producto. Todo orientativo: la app lo dice así en la ficha.
import { norm } from './format.js'

const step = (v, limits) => limits.filter((l) => v > l).length

/**
 * n: { kcal, sugars, sat, salt, protein, fiber, fv } por 100 g (fv = % de fruta, verdura y legumbre)
 * Devuelve 'a'…'e' o null si faltan datos. No vale para bebidas ni aceites (tienen otra tabla).
 */
export function computeNutriScore(n) {
  if (!n || n.kcal == null || n.sugars == null || n.sat == null || n.salt == null) return null
  const kj = n.kcal * 4.184
  const neg =
    step(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]) +
    step(n.sugars, [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51]) +
    step(n.sat, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) +
    step(n.salt, [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4])
  const fvp = (n.fv || 0) > 80 ? 5 : (n.fv || 0) > 60 ? 2 : (n.fv || 0) > 40 ? 1 : 0
  const fib = step(n.fiber || 0, [3, 4.1, 5.2, 6.3, 7.4])
  const pro = step(n.protein || 0, [2.4, 4.8, 7.2, 9.6, 12, 14, 17])
  // Con muchos puntos malos, la proteína no compensa
  const pos = neg >= 11 ? fvp + fib : fvp + fib + pro
  const score = neg - pos
  return score <= 0 ? 'a' : score <= 2 ? 'b' : score <= 10 ? 'c' : score <= 18 ? 'd' : 'e'
}

// Valores típicos por 100 g (tablas de composición españolas, redondeados). fv: % fruta, verdura o legumbre.
// [palabras con que empieza el nombre o la subcategoría, kcal, grasa, saturada, azúcares, proteína, fibra, sal, fv]
const T = [
  ['huevo', 143, 9.5, 3.1, 0.4, 12.6, 0, 0.35, 0],
  ['manzana', 52, 0.2, 0, 10.4, 0.3, 2.4, 0, 100],
  ['platano|banana', 89, 0.3, 0.1, 12.2, 1.1, 2.6, 0, 100],
  ['naranja|mandarina|clementina', 47, 0.1, 0, 9.4, 0.9, 2.4, 0, 100],
  ['pera', 57, 0.1, 0, 9.8, 0.4, 3.1, 0, 100],
  ['uva', 69, 0.2, 0.1, 16, 0.7, 0.9, 0, 100],
  ['fresa|freson', 32, 0.3, 0, 4.9, 0.7, 2, 0, 100],
  ['melon', 34, 0.2, 0.1, 7.9, 0.8, 0.9, 0, 100],
  ['sandia', 30, 0.2, 0, 6.2, 0.6, 0.4, 0, 100],
  ['kiwi', 61, 0.5, 0, 9, 1.1, 3, 0, 100],
  ['limon|lima', 29, 0.3, 0, 2.5, 1.1, 2.8, 0, 100],
  ['melocoton|nectarina|paraguayo|albaricoque|ciruela', 42, 0.2, 0, 8.4, 0.9, 1.6, 0, 100],
  ['pina', 50, 0.1, 0, 9.9, 0.5, 1.4, 0, 100],
  ['mango', 60, 0.4, 0.1, 13.7, 0.8, 1.6, 0, 100],
  ['aguacate', 160, 14.7, 2.1, 0.7, 2, 6.7, 0, 100],
  ['tomate', 18, 0.2, 0, 2.6, 0.9, 1.2, 0, 100],
  ['lechuga|ensalada|canonigo|rucula|escarola|endibia', 15, 0.2, 0, 0.8, 1.4, 1.3, 0, 100],
  ['zanahoria', 41, 0.2, 0, 4.7, 0.9, 2.8, 0.17, 100],
  ['cebolla|cebolleta', 40, 0.1, 0, 4.2, 1.1, 1.7, 0, 100],
  ['pimiento', 31, 0.3, 0, 4.2, 1, 2.1, 0, 100],
  ['calabacin', 17, 0.3, 0.1, 2.5, 1.2, 1, 0, 100],
  ['berenjena', 25, 0.2, 0, 3.5, 1, 3, 0, 100],
  ['brocoli', 34, 0.4, 0, 1.7, 2.8, 2.6, 0.08, 100],
  ['coliflor|col|repollo|lombarda', 25, 0.3, 0.1, 1.9, 1.9, 2, 0.08, 100],
  ['espinaca|acelga', 23, 0.4, 0.1, 0.4, 2.9, 2.2, 0.2, 100],
  ['pepino', 15, 0.1, 0, 1.7, 0.7, 0.5, 0, 100],
  ['champinon|seta', 22, 0.3, 0, 2, 3.1, 1, 0, 100],
  ['judia verde|judias verdes', 31, 0.2, 0, 3.3, 1.8, 2.7, 0, 100],
  ['calabaza', 26, 0.1, 0, 2.8, 1, 0.5, 0, 100],
  ['puerro', 61, 0.3, 0, 3.9, 1.5, 1.8, 0, 100],
  ['alcachofa', 47, 0.2, 0, 1, 3.3, 5.4, 0.2, 100],
  ['esparrago', 20, 0.1, 0, 1.9, 2.2, 2.1, 0, 100],
  ['ajo', 149, 0.5, 0.1, 1, 6.4, 2.1, 0, 100],
  ['patata|batata|boniato', 77, 0.1, 0, 0.8, 2, 2.2, 0, 0],
  ['merluza|pescadilla|bacalao|rape|gallo|lenguado', 86, 1.8, 0.4, 0, 17.4, 0, 0.25, 0],
  ['salmon', 208, 13.4, 3.1, 0, 20.4, 0, 0.15, 0],
  ['dorada|lubina', 100, 3, 0.8, 0, 19, 0, 0.2, 0],
  ['sardina|boqueron|caballa|jurel', 180, 10, 2.8, 0, 21, 0, 0.3, 0],
  ['atun|bonito', 144, 4.9, 1.3, 0, 23.3, 0, 0.1, 0],
  ['gamba|langostino|camaron', 85, 1, 0.2, 0, 18, 0, 0.6, 0],
  ['calamar|sepia|pota|chipiron', 80, 1.4, 0.4, 0, 15.6, 0, 0.5, 0],
  ['mejillon|almeja|berberecho', 86, 2.2, 0.4, 0, 12, 0, 0.7, 0],
  ['pechuga|filetes? de pollo|solomillo de pollo', 110, 1.2, 0.3, 0, 23, 0, 0.15, 0],
  ['pollo|muslo|contramuslo|alas', 180, 11, 3, 0, 18, 0, 0.2, 0],
  ['pavo', 105, 1, 0.3, 0, 23, 0, 0.15, 0],
  ['lomo|solomillo de cerdo|cinta', 143, 5.4, 1.9, 0, 22, 0, 0.15, 0],
  ['secreto|presa|pluma|costilla|panceta|chuleta', 290, 24, 8.5, 0, 17, 0, 0.15, 0],
  ['carne picada|burger|hamburguesa', 230, 17, 6.8, 0, 18, 0, 0.6, 0],
  ['ternera|vacuno|anojo|entrecot', 150, 6, 2.6, 0, 22, 0, 0.15, 0],
  ['conejo', 136, 5.6, 1.7, 0, 21, 0, 0.1, 0],
  ['cordero', 230, 17, 7.5, 0, 19, 0, 0.15, 0],
  ['lenteja', 116, 0.4, 0.1, 1.8, 9, 7.9, 0.3, 100],
  ['garbanzo', 139, 2.6, 0.3, 4.8, 7.1, 6, 0.3, 100],
  ['alubia|judion', 110, 0.5, 0.1, 0.3, 7.5, 6.3, 0.3, 100]
].map(([k, kcal, fat, sat, sugars, protein, fiber, salt, fv]) => ({ re: new RegExp(`^(${k})`), kcal, fat, sat, sugars, protein, fiber, salt, fv }))

// Solo en las familias de frescos y básicos: fruta y verdura, pescado, carne, huevos, legumbres y congelados al natural
const FRESH = new Set([1, 2, 3, 6, 13, 17])

/** Valores típicos de un fresco por su nombre ('Huevos', 'Merluza en rodajas'…) o null */
export function typicalNutrition(p) {
  if (!p || !FRESH.has(Number(p.c))) return null
  // Procesados de esas familias (empanados, en salsa, con queso…) no son el alimento tal cual
  if (/(empanad|rebozad|en salsa|con queso|precocinad|croqueta|nugget|ahumad|en aceite|en escabeche|frito|zumo|batido|tortilla|liquid|a la crema|salteado|al ajillo|guiso|lasana|pizza|helado|marinad|adobad)/.test(norm(p.n))) return null
  const words = norm(p.n).split(' ')
  for (let i = 0; i < Math.min(words.length, 3); i++) {
    const rest = words.slice(i).join(' ')
    const t = T.find((x) => x.re.test(rest))
    if (t) {
      const { re, ...v } = t
      return { ...v, grade: computeNutriScore(v), typical: true }
    }
  }
  return null
}

// Bebidas y aceites tienen otra tabla de Nutri-Score: no se calcula
export const canCompute = (p) => p && ![8, 10, 12, 18, 19].includes(Number(p.c))
