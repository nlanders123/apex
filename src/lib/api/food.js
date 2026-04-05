const OFF_BASE = 'https://world.openfoodfacts.org/api/v2'
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'
const USDA_KEY = 'DEMO_KEY' // Free USDA FoodData Central API key

/**
 * Look up a food product by barcode using Open Food Facts.
 * Returns normalised macro data per serving, or null if not found.
 */
export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`${OFF_BASE}/product/${barcode}?fields=product_name,nutriments,serving_size,brands,nutrition_grades,nova_group,additives_tags,additives_n,ingredients_text,labels_tags,categories_tags,image_front_small_url`)
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
    const saturated_fat = Math.round(n['saturated-fat_serving'] ?? n['saturated-fat_100g'] ?? 0)
    const trans_fat = Math.round(n['trans-fat_serving'] ?? n['trans-fat_100g'] ?? 0)
    const cholesterol = Math.round((n['cholesterol_serving'] ?? n['cholesterol_100g'] ?? 0) * 1000) // g → mg
    const potassium = Math.round((n['potassium_serving'] ?? n['potassium_100g'] ?? 0) * 1000) // g → mg
    const vitamin_a = Math.round(n['vitamin-a_serving'] ?? n['vitamin-a_100g'] ?? 0) // µg
    const vitamin_c = Math.round(n['vitamin-c_serving'] ?? n['vitamin-c_100g'] ?? 0) // mg
    const calcium = Math.round((n['calcium_serving'] ?? n['calcium_100g'] ?? 0) * 1000) // g → mg
    const iron = Math.round((n['iron_serving'] ?? n['iron_100g'] ?? 0) * 1000) // g → mg

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
        saturated_fat,
        trans_fat,
        cholesterol,
        potassium,
        vitamin_a,
        vitamin_c,
        calcium,
        iron,
        servingSize: p.serving_size || '100g',
        isPerServing: !!(n['proteins_serving'] || n['fat_serving']),
        // Health intelligence fields (YUKA-style)
        nutriScore: p.nutrition_grades || null,
        novaGroup: p.nova_group || null,
        additives: p.additives_tags || [],
        additivesCount: p.additives_n || 0,
        ingredients: p.ingredients_text || null,
        labels: p.labels_tags || [],
        categories: p.categories_tags || [],
        imageUrl: p.image_front_small_url || null,
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
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,nutriments,serving_size,nutrition_grades,nova_group,additives_tags,additives_n,ingredients_text,labels_tags,categories_tags`
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
        saturated_fat: Math.round(n['saturated-fat_serving'] ?? n['saturated-fat_100g'] ?? 0),
        trans_fat: Math.round(n['trans-fat_serving'] ?? n['trans-fat_100g'] ?? 0),
        cholesterol: Math.round((n['cholesterol_serving'] ?? n['cholesterol_100g'] ?? 0) * 1000),
        potassium: Math.round((n['potassium_serving'] ?? n['potassium_100g'] ?? 0) * 1000),
        vitamin_a: Math.round(n['vitamin-a_serving'] ?? n['vitamin-a_100g'] ?? 0),
        vitamin_c: Math.round(n['vitamin-c_serving'] ?? n['vitamin-c_100g'] ?? 0),
        calcium: Math.round((n['calcium_serving'] ?? n['calcium_100g'] ?? 0) * 1000),
        iron: Math.round((n['iron_serving'] ?? n['iron_100g'] ?? 0) * 1000),
        servingSize: p.serving_size || '100g',
        // Health intelligence fields
        nutriScore: p.nutrition_grades || null,
        novaGroup: p.nova_group || null,
        additives: p.additives_tags || [],
        additivesCount: p.additives_n || 0,
        ingredients: p.ingredients_text || null,
        labels: p.labels_tags || [],
        categories: p.categories_tags || [],
      }
    })

    return { data: products, error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Search USDA FoodData Central — free, reliable, comprehensive.
 * Uses Survey (FNDDS) data for common foods with per-serving macros.
 */
export async function searchFoodUSDA(query, limit = 10) {
  try {
    const res = await fetch(
      `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${USDA_KEY}&dataType=Survey%20(FNDDS)`
    )
    if (!res.ok) return { data: [], error: `USDA API ${res.status}` }

    const json = await res.json()
    const products = (json.foods || []).map((food) => {
      const nutrients = {}
      for (const n of food.foodNutrients || []) {
        nutrients[n.nutrientName] = n.value
      }

      return {
        name: food.description,
        calories: Math.round(nutrients['Energy'] || 0),
        protein: Math.round(nutrients['Protein'] || 0),
        fat: Math.round(nutrients['Total lipid (fat)'] || 0),
        carbs: Math.round(nutrients['Carbohydrate, by difference'] || 0),
        fiber: Math.round(nutrients['Fiber, total dietary'] || 0),
        sugar: Math.round(nutrients['Sugars, total including NLEA'] || nutrients['Total Sugars'] || 0),
        sodium: Math.round(nutrients['Sodium, Na'] || 0),
        saturated_fat: Math.round(nutrients['Fatty acids, total saturated'] || 0),
        cholesterol: Math.round(nutrients['Cholesterol'] || 0),
        potassium: Math.round(nutrients['Potassium, K'] || 0),
        calcium: Math.round(nutrients['Calcium, Ca'] || 0),
        iron: Math.round(nutrients['Iron, Fe'] || 0),
        vitamin_a: Math.round(nutrients['Vitamin A, RAE'] || 0),
        vitamin_c: Math.round(nutrients['Vitamin C, total ascorbic acid'] || 0),
        trans_fat: 0,
        servingSize: '100g',
        source: 'usda',
      }
    })

    return { data: products, error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Search Open Food Facts for healthier alternatives in the same category.
 * Returns products sorted by Nutri-Score (best first), filtered to score A or B.
 */
export async function searchAlternatives(categoryTag, limit = 6) {
  if (!categoryTag) return { data: [], error: null }

  try {
    const cat = encodeURIComponent(categoryTag)
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?tagtype_0=categories&tag_contains_0=contains&tag_0=${cat}&sort_by=nutriscore_score&page_size=${limit * 2}&json=1&fields=code,product_name,brands,nutriments,serving_size,nutrition_grades,nova_group,additives_tags,additives_n,labels_tags,categories_tags`
    )
    if (!res.ok) return { data: [], error: 'Network error' }

    const json = await res.json()
    const products = (json.products || [])
      .filter((p) => {
        const grade = (p.nutrition_grades || '').toLowerCase()
        return grade === 'a' || grade === 'b'
      })
      .slice(0, limit)
      .map((p) => {
        const n = p.nutriments || {}
        return {
          barcode: p.code,
          name: [p.brands, p.product_name].filter(Boolean).join(' — ') || 'Unknown',
          calories: Math.round(n['energy-kcal_100g'] ?? 0),
          protein: Math.round(n['proteins_100g'] ?? 0),
          fat: Math.round(n['fat_100g'] ?? 0),
          carbs: Math.round(n['carbohydrates_100g'] ?? 0),
          servingSize: p.serving_size || '100g',
          nutriScore: p.nutrition_grades || null,
          novaGroup: p.nova_group || null,
          additives: p.additives_tags || [],
          additivesCount: p.additives_n || 0,
          labels: p.labels_tags || [],
          categories: p.categories_tags || [],
        }
      })

    return { data: products, error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}
