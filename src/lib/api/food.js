const OFF_BASE = 'https://world.openfoodfacts.org/api/v2'

/**
 * Look up a food product by barcode using Open Food Facts.
 * Returns normalised macro data per serving, or null if not found.
 */
export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`${OFF_BASE}/product/${barcode}?fields=product_name,nutriments,serving_size,brands,nutrition_grades`)
    if (!res.ok) return { data: null, error: 'Network error' }

    const json = await res.json()
    if (json.status !== 1 || !json.product) {
      return { data: null, error: 'Product not found' }
    }

    const p = json.product
    const n = p.nutriments || {}

    // Prefer per-serving values, fall back to per-100g
    const protein = Math.round(n['proteins_serving'] ?? n['proteins_100g'] ?? 0)
    const fat = Math.round(n['fat_serving'] ?? n['fat_100g'] ?? 0)
    const carbs = Math.round(n['carbohydrates_serving'] ?? n['carbohydrates_100g'] ?? 0)
    const calories = Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0)
    const fiber = Math.round(n['fiber_serving'] ?? n['fiber_100g'] ?? 0)
    const sodium = Math.round((n['sodium_serving'] ?? n['sodium_100g'] ?? 0) * 1000) // g → mg
    const sugar = Math.round(n['sugars_serving'] ?? n['sugars_100g'] ?? 0)

    const name = [p.brands, p.product_name].filter(Boolean).join(' — ') || 'Unknown product'

    return {
      data: {
        name,
        protein,
        fat,
        carbs,
        calories,
        fiber,
        sodium,
        sugar,
        servingSize: p.serving_size || '100g',
        isPerServing: !!(n['proteins_serving'] || n['fat_serving']),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Search Open Food Facts by text query.
 */
export async function searchFood(query, limit = 10) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,nutriments,serving_size`
    )
    if (!res.ok) return { data: [], error: 'Network error' }

    const json = await res.json()
    const products = (json.products || []).map((p) => {
      const n = p.nutriments || {}
      return {
        barcode: p.code,
        name: [p.brands, p.product_name].filter(Boolean).join(' — ') || 'Unknown',
        protein: Math.round(n['proteins_serving'] ?? n['proteins_100g'] ?? 0),
        fat: Math.round(n['fat_serving'] ?? n['fat_100g'] ?? 0),
        carbs: Math.round(n['carbohydrates_serving'] ?? n['carbohydrates_100g'] ?? 0),
        calories: Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0),
        fiber: Math.round(n['fiber_serving'] ?? n['fiber_100g'] ?? 0),
        sodium: Math.round((n['sodium_serving'] ?? n['sodium_100g'] ?? 0) * 1000),
        sugar: Math.round(n['sugars_serving'] ?? n['sugars_100g'] ?? 0),
        servingSize: p.serving_size || '100g',
      }
    })

    return { data: products, error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}
