import { describe, expect, it } from 'vitest'
import { addNutrients, buildMealPlan, createFood, createMeal, diaryGroups, nutrientsForAmount, nutritionTotalForDate, nutritionTotalForMeals } from './nutrition.js'

describe('nutrition calculations', () => {
  it('scales a serving without losing decimal precision', () => {
    expect(nutrientsForAmount({ calories: 250, protein: 20, carbs: 10, fat: 5 }, 1.5)).toMatchObject({ calories: 375, protein: 30, carbs: 15, fat: 7.5 })
  })
  it('totals only meals for the requested date', () => {
    const today = createMeal({ date: '2026-09-11', foodName: 'A', nutrients: { calories: 100, protein: 10 } })
    const other = createMeal({ date: '2026-09-10', foodName: 'B', nutrients: { calories: 999 } })
    expect(nutritionTotalForDate([today, other], '2026-09-11')).toMatchObject({ calories: 100, protein: 10 })
  })
  it('makes an independent nutrition snapshot', () => {
    const food = createFood({ name: 'Oats', nutrients: { calories: 150, protein: 5 } })
    const snapshot = nutrientsForAmount(food.nutrientsPerServing, 1)
    food.nutrientsPerServing.calories = 1
    expect(snapshot.calories).toBe(150)
  })
  it('adds missing nutrients as zero', () => {
    expect(addNutrients({ calories: 10 }, { protein: 3 })).toMatchObject({ calories: 10, protein: 3, fat: 0 })
  })
  it('totals planned meal nutrition from food portions', () => {
    const foods = [{ id: 'a', nutrientsPerServing: { calories: 300, protein: 25 } }, { id: 'b', nutrientsPerServing: { calories: 200, protein: 10 } }]
    const plan = [{ foodId: 'a', servings: 1 }, { foodId: 'b', servings: 2 }]
    expect(nutritionTotalForMeals(plan, foods)).toMatchObject({ calories: 700, protein: 45 })
  })
  it('builds four planned meal slots from calorie goals', () => {
    const foods = [
      { id: 'a', name: 'Oats', nutrientsPerServing: { calories: 400, protein: 20 } },
      { id: 'b', name: 'Chicken', nutrientsPerServing: { calories: 500, protein: 45 } },
      { id: 'c', name: 'Rice', nutrientsPerServing: { calories: 300, protein: 6 } },
      { id: 'd', name: 'Yogurt', nutrientsPerServing: { calories: 200, protein: 15 } },
    ]
    const plan = buildMealPlan(foods, { calories: 2000 }, '2026-09-11')
    expect(plan).toHaveLength(4)
    expect(plan.map(item => item.mealType)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    expect(plan.every(item => item.servings > 0)).toBe(true)
    expect(plan.every(item => item.targetCalories > 0)).toBe(true)
  })
  it('groups diary entries by meal and totals each section', () => {
    const meals = [
      createMeal({ date: '2026-09-11', mealType: 'breakfast', foodName: 'Oats', nutrients: { calories: 300, protein: 10 } }),
      createMeal({ date: '2026-09-11', mealType: 'breakfast', foodName: 'Milk', nutrients: { calories: 100, protein: 7 } }),
      createMeal({ date: '2026-09-11', mealType: 'dinner', foodName: 'Rice', nutrients: { calories: 200 } }),
    ]
    const groups = diaryGroups(meals, '2026-09-11')
    expect(groups.map(group => group.type)).toEqual(['breakfast', 'dinner'])
    expect(groups[0].total).toMatchObject({ calories: 400, protein: 17 })
    expect(groups[0].meals).toHaveLength(2)
  })
})
