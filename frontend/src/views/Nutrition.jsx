import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { Button, NumberField, Section, TextField, SelectRow } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { todayISO } from '../lib/format.js'
import { addNutrients, createFood, createMeal, emptyNutrients, nutrientsForAmount, nutritionTotalForDate } from '../lib/nutrition.js'

const TYPES = [
  { value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' },
]
const nutrientFields = [['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g'], ['fiber', 'Fiber', 'g']]

function Stat({ label, value, target, unit = 'g' }) {
  return <div style={{ minWidth: 0 }}><div className="small dim">{label}</div><div className="big" style={{ fontSize: 22 }}>{Math.round(value)}<span className="muted" style={{ fontSize: 12 }}> {unit}{target ? ` / ${Math.round(target)}` : ''}</span></div></div>
}

export default function Nutrition() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [foodId, setFoodId] = useState(null)
  const [servings, setServings] = useState(1)
  const [mealType, setMealType] = useState('snack')
  const [form, setForm] = useState({ name: '', brand: '', servingSize: 1, servingUnit: 'serving', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  const date = todayISO()
  const meals = S.meals || []
  const foods = S.foods || []
  const total = useMemo(() => nutritionTotalForDate(meals, date), [meals, date])
  const visibleFoods = foods.filter(food => `${food.name} ${food.brand}`.toLowerCase().includes(query.toLowerCase()))
  const selected = foods.find(food => food.id === foodId)
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const saveFood = () => {
    if (!form.name.trim()) return
    const food = createFood({ ...form, nutrients: form })
    update(state => { state.foods = [...(state.foods || []), food] })
    setFoodId(food.id); setShowForm(false); setForm({ name: '', brand: '', servingSize: 1, servingUnit: 'serving', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  }
  const logMeal = () => {
    if (!selected) return
    const nutrientSnapshot = nutrientsForAmount(selected.nutrientsPerServing, servings)
    update(state => { state.meals = [...(state.meals || []), createMeal({ date, mealType, foodId: selected.id, foodName: selected.name, servings, nutrients: nutrientSnapshot })] })
    setFoodId(null); setServings(1)
  }
  const targets = S.nutritionTargets || {}
  return <div className="narrow">
    <div className="hdr"><div><h1>Nutrition</h1><div className="sub">Today · {date}</div></div><button className="iconbtn" onClick={() => nav('/home')} aria-label="Back"><Icon name="chevronLeft" /></button></div>
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}><h2 style={{ margin: 0 }}>Today</h2><Button size="sm" icon="gear" onClick={() => nav('/settings')}>Targets</Button></div>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}><Stat label="Calories" value={total.calories} target={targets.calories} unit="kcal" /><Stat label="Protein" value={total.protein} target={targets.protein} /><Stat label="Carbs" value={total.carbs} target={targets.carbs} /><Stat label="Fat" value={total.fat} target={targets.fat} /></div>
    </div>
    <Section title="Add food">
      <div className="lrow"><span className="lrow-m"><span className="lrow-t">Barcode scanning</span><span className="lrow-s">Native and browser scanner will use the same food lookup.</span></span><Button size="sm" disabled>Coming next</Button></div>
      <div className="lrow"><span className="lrow-m"><span className="lrow-t">Manual food</span><span className="lrow-s">Add a label value when a product is missing or wrong.</span></span><Button size="sm" icon="plus" onClick={() => setShowForm(v => !v)}>Add</Button></div>
    </Section>
    {showForm && <div className="card" style={{ marginBottom: 18 }}><h2>New food</h2><TextField value={form.name} onChange={e => set('name', e.target.value)} placeholder="Food name" aria-label="Food name" /><div style={{ height: 8 }} /><TextField value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand (optional)" aria-label="Brand" /><div className="row" style={{ gap: 8, marginTop: 8 }}><NumberField value={form.servingSize} onChange={v => set('servingSize', v)} /><TextField value={form.servingUnit} onChange={e => set('servingUnit', e.target.value)} aria-label="Serving unit" /></div><div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{nutrientFields.map(([key, label, unit]) => <label key={key} style={{ flex: '1 1 90px' }}><span className="small dim">{label} ({unit})</span><NumberField value={form[key]} onChange={v => set(key, v)} aria-label={label} /></label>)}</div><div className="row" style={{ gap: 8, marginTop: 12 }}><Button variant="primary" onClick={saveFood} disabled={!form.name.trim()}>Save food</Button><Button onClick={() => setShowForm(false)}>Cancel</Button></div></div>}
    <Section title="Log a meal">
      <TextField value={query} onChange={e => setQuery(e.target.value)} placeholder="Search saved foods" aria-label="Search saved foods" />
      {query && visibleFoods.slice(0, 8).map(food => <button className="lrow tap" key={food.id} onClick={() => { setFoodId(food.id); setQuery('') }}><span className="lrow-m"><span className="lrow-t">{food.name}</span><span className="lrow-s">{food.brand || 'Manual'} · {food.nutrientsPerServing.calories} kcal / serving</span></span></button>)}
      {selected && <><div className="lrow"><span className="lrow-m"><span className="lrow-t">{selected.name}</span><span className="lrow-s">{selected.nutrientsPerServing.calories} kcal per {selected.servingUnit}</span></span><Button size="sm" onClick={() => setFoodId(null)}>Change</Button></div><SelectRow title="Meal" value={mealType} options={TYPES} onChange={setMealType} /><div className="lrow"><span className="lrow-m"><span className="lrow-t">Servings</span></span><NumberField value={servings} onChange={setServings} /></div><Button variant="primary" onClick={logMeal}>Log meal</Button></>}
      {!foods.length && !showForm && <div className="empty"><div className="muted small">Add a food above before logging a meal.</div></div>}
    </Section>
    <Section title="Logged today">
      {meals.filter(meal => meal.date === date).slice().reverse().map(meal => <div className="lrow" key={meal.id}><span className="lrow-m"><span className="lrow-t">{meal.foodName}</span><span className="lrow-s">{meal.mealType} · {meal.servings} serving{meal.servings === 1 ? '' : 's'}</span></span><span className="lrow-v">{Math.round(meal.nutrientsSnapshot.calories)} kcal</span></div>)}
      {!meals.some(meal => meal.date === date) && <div className="empty"><div className="muted small">Nothing logged yet.</div></div>}
    </Section>
  </div>
}
