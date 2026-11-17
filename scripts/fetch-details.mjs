// Descarga fichas (código de barras, marca, ingredientes y alérgenos) de los productos del catálogo
// que aún no las tienen. Incremental: como mucho MAX productos por ejecución.
// Uso: node scripts/fetch-details.mjs   Variables: MAX (por defecto 1500)
import { readFile, writeFile } from 'node:fs/promises'

const MAX = Number(process.env.MAX || 1500)
const CATALOG = new URL('../public/data/catalog.json', import.meta.url)
const DETAILS = new URL('../public/data/details.json', import.meta.url)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clean = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*Ingredientes:\s*/i, '')
    .trim()

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'))
let details = {}
try { details = JSON.parse(await readFile(DETAILS, 'utf8')) } catch {}

const live = new Set(catalog.products.map((p) => p.id))
for (const id of Object.keys(details)) if (!live.has(id)) delete details[id]

const todo = catalog.products.filter((p) => !details[p.id]).slice(0, MAX)
let done = 0
for (const p of todo) {
  try {
    const res = await fetch(`https://tienda.mercadona.es/api/products/${p.id}/?lang=es`, {
      headers: { 'User-Agent': 'mercafamily (uso doméstico)', Accept: 'application/json' }
    })
    if (res.ok) {
      const d = await res.json()
      const allergens = clean(d.nutrition_information?.allergens).replace(/^x99\.?$/, '')
      details[p.id] = {
        e: d.ean || null,
        b: d.details?.brand || null,
        g: clean(d.nutrition_information?.ingredients).slice(0, 600) || null,
        a: allergens || null,
        o: d.details?.origin || null
      }
      done++
    }
  } catch {}
  await sleep(300)
  if (done && done % 250 === 0) await writeFile(DETAILS, JSON.stringify(details))
}
await writeFile(DETAILS, JSON.stringify(details))
console.log(`Fichas nuevas: ${done}. Total: ${Object.keys(details).length} de ${catalog.products.length}.`)
