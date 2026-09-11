const OFF = 'https://world.openfoodfacts.org/api/v2/product'

export function normalizeBarcode(value) {
  return String(value || '').replace(/\s/g, '').replace(/[-]/g, '')
}

export async function lookupFoodBarcode(barcode, signal) {
  const code = normalizeBarcode(barcode)
  if (!/^\d{8,14}$/.test(code)) throw new Error('Enter an 8–14 digit product barcode.')
  const res = await fetch(`${OFF}/${encodeURIComponent(code)}.json`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Food database request failed (${res.status}).`)
  const body = await res.json()
  if (body.status !== 1 || !body.product) throw new Error('That barcode was not found. Add the label manually.')
  const p = body.product
  const n = p.nutriments || {}
  const hasServing = n['energy-kcal_serving'] != null || n.proteins_serving != null || n.carbohydrates_serving != null
  const serving = hasServing ? (p.serving_size || 'serving') : '100 g'
  const name = p.product_name || p.generic_name || 'Scanned food'
  return {
    name,
    brand: p.brands || '',
    barcode: code,
    servingSize: 1,
    servingUnit: serving,
    nutrients: {
      calories: n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0,
      protein: n.proteins_serving ?? n.proteins_100g ?? 0,
      carbs: n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0,
      fat: n.fat_serving ?? n.fat_100g ?? 0,
      fiber: n.fiber_serving ?? n.fiber_100g ?? 0,
      sugar: n.sugars_serving ?? n.sugars_100g ?? 0,
    },
    source: 'open-food-facts',
    sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
    sourceBasis: n['energy-kcal_serving'] != null ? 'serving' : '100g',
  }
}
