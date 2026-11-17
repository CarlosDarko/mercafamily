// Ficha del producto: ingredientes y alérgenos de Mercadona (details.json) y nutrición de Open Food Facts
let details = null
const OFF_KEY = 'mf:off:'

export async function productDetails(id) {
  if (!details) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/details.json`)
      details = res.ok ? await res.json() : {}
    } catch {
      details = {}
    }
  }
  return details[id] || null
}

export async function nutrition(ean) {
  if (!ean) return null
  try {
    const cached = JSON.parse(localStorage.getItem(OFF_KEY + ean))
    if (cached && Date.now() - cached.t < 30 * 86400000) return cached.v
  } catch {}
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=nutriscore_grade,nova_group,nutriments,ingredients_analysis_tags`
    )
    const data = res.ok ? await res.json() : null
    const p = data?.product
    const n = p?.nutriments || {}
    const v = p
      ? {
          grade: ['a', 'b', 'c', 'd', 'e'].includes(p.nutriscore_grade) ? p.nutriscore_grade : null,
          nova: p.nova_group || null,
          kcal: n['energy-kcal_100g'] ?? null,
          fat: n.fat_100g ?? null,
          sat: n['saturated-fat_100g'] ?? null,
          sugars: n.sugars_100g ?? null,
          salt: n.salt_100g ?? null,
          protein: n.proteins_100g ?? null,
          fiber: n.fiber_100g ?? null
        }
      : null
    localStorage.setItem(OFF_KEY + ean, JSON.stringify({ t: Date.now(), v }))
    return v
  } catch {
    return null
  }
}

// Código de barras -> id de producto de Mercadona
let byEan = null
export async function productByEan(ean) {
  await productDetails('')
  if (!byEan) {
    byEan = new Map()
    for (const [id, d] of Object.entries(details || {})) if (d?.e) byEan.set(String(d.e), id)
  }
  const code = String(ean).replace(/^0+(?=\d{13})/, '')
  return byEan.get(code) || byEan.get(code.padStart(13, '0')) || null
}
