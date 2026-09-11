// Nutrition domain helpers. Keep calculations pure so manual entry, barcode lookup,
// meal planning, and future native scan flows all use the same rules.
export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar']

export const emptyNutrients = () => Object.fromEntries(NUTRIENT_KEYS.map(key => [key, 0]))

export function cleanNutrients(input = {}) {
  return Object.fromEntries(NUTRIENT_KEYS.map(key => {
    const value = Number(input[key])
    return [key, Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0]
  }))
}

export function nutrientsForAmount(perServing, servings = 1) {
  const multiplier = Number(servings)
  const safe = Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 0
  const source = cleanNutrients(perServing)
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, Math.round(source[key] * safe * 100) / 100]))
}

export function addNutrients(...values) {
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key,
    Math.round(values.reduce((sum, value) => sum + (Number(value?.[key]) || 0), 0) * 100) / 100
  ]))
}

export function nutritionTotalForDate(meals = [], date) {
  return addNutrients(...meals.filter(meal => meal?.date === date).map(meal => meal.nutrientsSnapshot))
}

export function nutritionTotalForMeals(plan = [], foods = []) {
  return addNutrients(...plan.map(item => {
    const food = foods.find(candidate => candidate.id === item?.foodId)
    return food ? nutrientsForAmount(food.nutrientsPerServing, item.servings || 1) : emptyNutrients()
  }))
}

export function buildMealPlan(foods = [], targets = {}, date) {
  const pool = foods.filter(food => Number(food?.nutrientsPerServing?.calories) > 0)
  if (!pool.length) return []
  const calories = Number(targets.calories) > 0 ? Number(targets.calories) : 2000
  const slots = [['breakfast', 0.25], ['lunch', 0.30], ['dinner', 0.30], ['snack', 0.15]]
  const ranked = pool.slice().sort((a, b) => (b.nutrientsPerServing.protein || 0) - (a.nutrientsPerServing.protein || 0))
  return slots.map(([mealType, share], index) => {
    const food = ranked[index % ranked.length]
    const targetCalories = Math.round(calories * share)
    const servings = Math.max(0.25, Math.round(targetCalories / food.nutrientsPerServing.calories * 4) / 4)
    return { date, mealType, foodId: food.id, foodName: food.name, servings, targetCalories }
  })
}

export function fastingStatus(settings = {}, now = new Date()) {
  if (!settings.enabled) return 'off'
  const toMinutes = value => { const [hours, minutes] = String(value || '00:00').split(':').map(Number); return (hours || 0) * 60 + (minutes || 0) }
  const current = now.getHours() * 60 + now.getMinutes()
  const start = toMinutes(settings.start || '20:00'); const end = toMinutes(settings.end || '12:00')
  if (start === end) return 'fasting'
  const fasting = start > end ? current >= start || current < end : current >= start && current < end
  return fasting ? 'fasting' : 'eating'
}

export function diaryGroups(meals = [], date) {
  const order = ['breakfast', 'lunch', 'dinner', 'snack']
  return order.map(type => {
    const entries = meals.filter(meal => meal?.date === date && meal?.mealType === type)
    return entries.length ? { type, meals: entries, total: addNutrients(...entries.map(meal => meal.nutrientsSnapshot)) } : null
  }).filter(Boolean)
}

export function createFood({ id, name, brand = '', barcode = '', servingSize = 1, servingUnit = 'serving', nutrients = {}, source = 'manual' }) {
  return {
    id: id || `food-${Date.now().toString(36)}`,
    name: String(name || '').trim(), brand: String(brand || '').trim(), barcode: String(barcode || '').trim(),
    servingSize: Number(servingSize) > 0 ? Number(servingSize) : 1,
    servingUnit: String(servingUnit || 'serving'),
    nutrientsPerServing: cleanNutrients(nutrients), source,
    sourceUpdatedAt: new Date().toISOString(),
  }
}

export function createMeal({ id, date, time, mealType = 'snack', foodId, foodName, servings = 1, nutrients }) {
  return {
    id: id || `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    date, time: time || new Date().toTimeString().slice(0, 5), mealType, foodId,
    foodName: String(foodName || '').trim(), servings: Number(servings) || 1,
    // Snapshot is intentional: updating a food later must not rewrite history.
    nutrientsSnapshot: cleanNutrients(nutrients),
  }
}
