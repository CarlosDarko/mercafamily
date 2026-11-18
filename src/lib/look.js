// Aspecto de cada familia de Mercadona: icono y color propio, para que la lista no sea todo verde.
// Los colores son tonos de mercado (tomate, limón, berenjena, mar…) y se usan con color-mix para el fondo suave.
import {
  Bean, Carrot, Egg, CookingPot, ChefHat,
  Apple, Beef, Fish, Milk, Ham, Croissant, Snowflake, Soup, Droplets, Wheat, Candy, Baby, Wine, Coffee, Cookie,
  CupSoda, Popcorn, ShowerHead, Sparkles, Pill, SprayCan, Brush, PawPrint, Pizza, IceCreamCone, Citrus, ShoppingBag
} from '@lucide/svelte'

const LOOK = {
  1: [Apple, '--c-huerta'],
  2: [Fish, '--c-mar'],
  3: [Beef, '--c-carne'],
  4: [Ham, '--c-carne'],
  5: [Croissant, '--c-horno'],
  6: [Milk, '--c-leche'],
  7: [Cookie, '--c-horno'],
  8: [Coffee, '--c-horno'],
  9: [Candy, '--c-dulce'],
  10: [Citrus, '--c-limon'],
  11: [IceCreamCone, '--c-dulce'],
  12: [Droplets, '--c-aceite'],
  13: [Wheat, '--c-aceite'],
  14: [Soup, '--c-aceite'],
  15: [Popcorn, '--c-limon'],
  16: [Pizza, '--c-tomate'],
  17: [Snowflake, '--c-hielo'],
  18: [CupSoda, '--c-hielo'],
  19: [Wine, '--c-uva'],
  20: [Sparkles, '--c-dulce'],
  21: [ShowerHead, '--c-hielo'],
  22: [Brush, '--c-dulce'],
  23: [Pill, '--c-mar'],
  24: [Baby, '--c-leche'],
  25: [PawPrint, '--c-aceite'],
  26: [SprayCan, '--c-limpio']
}

/** Icono y color (variable CSS) de una familia por su id de Mercadona. */
export function catLook(id) {
  const [icon, color] = LOOK[id] || [ShoppingBag, '--c-otros']
  return { icon, color: `var(${color})` }
}

// Recetas: icono y color de su ingrediente principal (el mismo color que esa familia en la lista)
const TAGLOOK = [
  ['merienda', IceCreamCone, '--c-dulce'],
  ['legumbre', Bean, '--c-aceite'],
  ['pescado', Fish, '--c-mar'],
  ['carne', Beef, '--c-carne'],
  ['huevo', Egg, '--c-limon'],
  ['arroz', CookingPot, '--c-horno'],
  ['pasta', Wheat, '--c-horno'],
  ['verdura', Carrot, '--c-huerta']
]
export function recipeLook(r) {
  const t = r.tags || r.meta?.tags || []
  const slot = r.slot || r.meta?.slot
  const f = TAGLOOK.find(([k]) => t.includes(k) || (k === 'merienda' && slot === 'merienda')) || [null, ChefHat, '--c-otros']
  return { icon: f[1], color: `var(${f[2]})` }
}
