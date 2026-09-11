import { describe, expect, it } from 'vitest'
import { addNutrients, createFood, createMeal, nutrientsForAmount, nutritionTotalForDate } from './nutrition.js'

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
})
