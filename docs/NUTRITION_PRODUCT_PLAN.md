# openGym Nutrition & Meal Planning Product Plan

**Status:** Proposed foundation for the nutrition branch
**Scope:** Extend openGym into one private, self-hosted workout and nutrition companion.

## Product direction

openGym should connect three loops without pretending to be a clinician:

1. **Plan** training and meals around the user's schedule, preferences, budget, and available foods.
2. **Log** workouts, body weight, meals, portions, and packaged foods with low friction.
3. **Learn** from history to show useful trends and practical suggestions, while keeping recommendations explainable and editable.

The product should support goals such as maintenance, gradual fat loss, muscle gain, general fitness, and performance. It must not diagnose disease, prescribe treatment, or present calculated targets as medical advice.

## Research findings

### Nutrition framework

- USDA MyPlate provides a practical food-pattern framework: fruits, vegetables, grains, protein foods, and dairy or fortified soy alternatives.
- USDA guidance emphasizes nutrient-dense choices and limiting added sugars, saturated fat, and sodium.
- The 2025 Dietary Guidelines Advisory Committee evidence review did **not** find enough evidence to prescribe a universal meal frequency or breakfast pattern. Meal timing should therefore be a user preference and scheduling tool, not a rule engine.
- Meal planning research is promising but mostly observational. Planning can be treated as an adherence and shopping aid, not proof of a particular health outcome.

### Training nutrition

- The ISSN position stand reports that roughly 1.4–2.0 g protein/kg/day is sufficient for most exercising people seeking muscle maintenance or growth; this is a general reference range, not an automatic prescription.
- A commonly cited per-meal reference is approximately 0.25 g/kg or 20–40 g protein, but individual tolerance, age, total intake, goals, and health conditions matter.
- Sports nutrition guidance treats energy availability, carbohydrate, protein, fat, fluids, and recovery as connected. The app should relate meals to training sessions without reducing the experience to calories alone.

### Food data and barcodes

- Open Food Facts API v3 is the preferred first product lookup source. It supports product lookup by barcode and nutrition, ingredients, labels, and allergen data.
- Open Food Facts data is volunteer-contributed and may be incomplete or wrong. Every imported product needs a visible source and an editable confirmation step.
- Open Food Facts asks applications to use a descriptive User-Agent and documents rate limits. The app should cache successful lookups and avoid search-as-you-type behavior.
- USDA FoodData Central is a useful secondary source for generic foods and branded-food cross-checking. It has no dedicated barcode endpoint; a fuzzy search result must be accepted only when its returned GTIN/UPC exactly matches the scanned code after safe leading-zero normalization.
- UPC/EAN values should be stored as strings, never numbers, preserving leading zeros and the original scanned value.

## Product principles

- **Plan, do not police.** Show options, gaps, and tradeoffs; avoid shame language and rigid streaks.
- **Manual correction is normal.** Users can edit serving size, nutrients, ingredients, and meal assignment after a scan.
- **Source-aware data.** Preserve provider, retrieval time, serving basis, and whether a user verified the item.
- **Snapshots for history.** Consumed entries keep a nutrition snapshot so future database changes do not rewrite the past.
- **Schedule-aware.** Shift work and changing workout times are first-class constraints; meal times are flexible windows, not fixed alarms.
- **Private by default.** No telemetry, no advertising, and no external AI nutrition analysis unless explicitly enabled.
- **Explainable suggestions.** Every generated plan should say which goal, preference, available food, or training event caused the suggestion.

## Integrated feature set

### Nutrition profile

- goal: maintain, lose gradually, gain gradually, performance, or custom
- dietary pattern and exclusions
- allergies and intolerances, clearly separated from preferences
- disliked foods and preferred foods
- available cooking time and equipment
- budget/store constraints
- shift/work schedule and workout schedule
- optional calorie and macro targets, with source and confidence shown
- optional nutrition guardrails such as protein, fiber, sodium, or added sugar

Sensitive medical conditions should not be inferred. If a user enters a condition, the product should recommend professional guidance rather than silently changing targets.

### Food catalog

Support three food classes:

1. scanned branded product
2. generic food from a trusted data source
3. custom food or recipe entered by the user

Suggested normalized food shape:

```js
{
  id,
  barcode: "string|null",
  name,
  brand: "string|null",
  source: { provider, externalId, retrievedAt },
  serving: { amount, unit, grams: "number|null", labelText },
  nutrientsPer100g: { kcal, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg },
  nutrientsPerServing: { kcal, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg },
  ingredients: "string|null",
  allergens: [],
  labels: [],
  confidence: "high|partial|unknown",
  userVerified: false
}
```

### Meal logging

A meal entry should record:

```js
{
  id,
  date,
  time: "string|null",
  slot: "breakfast|lunch|dinner|snack|pre-workout|post-workout|other",
  items: [{ foodId, amount, unit, grams: "number|null", nutrientsSnapshot }],
  note: "string|null",
  source: "scan|search|custom|recipe|quick-add"
}
```

Use `slot` as a label, not a required clock schedule. A shift worker may eat “lunch” at a different time every day.

### Meal planning

The first useful planner should produce an editable weekly plan from:

- nutrition targets or food-pattern targets
- the user's meals and recipes
- available ingredients
- budget and preparation time
- shift and workout schedule
- leftovers and repeat tolerance

Planner output should include:

- meals by day and flexible eating window
- portions and substitutions
- approximate nutrients
- a grocery list grouped by ingredient
- prep steps and leftover reuse
- reasons for each recommendation

Do not begin with a generative AI chef. Start with deterministic assembly from food/recipe records and constraints. An optional AI layer can later explain or vary a plan, but it must not become the source of nutrition facts.

### Evidence-based implementation rules

- Calorie targets are user-entered or transparently estimated, never presented as a diagnosis. Plans use a configurable floor of 1,000 kcal/day and direct users to professional advice for medical, pregnancy, eating-disorder, or unusually low-energy situations.
- Macro targets can be entered in grams or derived from percentages; protein suggestions are shown as an adjustable reference range for active adults, not a prescription.
- Plans prioritize an overall nutrient-dense pattern and food variety rather than banning individual foods. The user can choose dietary pattern, allergies, dislikes, budget, cooking time, and available foods.
- Meal timing remains flexible. The planner supports eating windows and shift schedules but does not claim that breakfast frequency or a fixed number of meals is universally required.
- Every plan is editable, can be swapped meal-by-meal, and can be logged directly. The app measures planned-versus-consumed adherence without grading or shaming the user.

### Training integration

- Home combines today’s workout status with today’s nutrition summary.
- Workout completion can suggest a post-workout meal or show whether a planned recovery meal exists, without forcing one.
- Stats can compare training volume, body-weight trend, logged protein/energy, and adherence over selectable periods.
- Meal plans can adapt around workout type and duration, but the user can override every suggestion.
- Existing workout progression remains authoritative for training loads; nutrition must not silently alter progression.

## Architecture plan

Keep the existing openGym shape:

- Zustand profile state remains the local source of truth.
- JSON server state remains compatible with additive fields.
- Add pure calculation modules under `frontend/src/lib/` with tests beside them.
- Add food/meal routes and views without disturbing the existing workout route structure.
- Keep barcode scanning behind a normalized scanner interface. QR gym-card behavior must remain separate from food barcode behavior.
- Cache food lookups by normalized barcode in profile state.
- Use direct Open Food Facts reads initially, with a configurable proxy later if rate limits or privacy requirements justify it.
- Add export/import versioning and migration tests before the new state becomes widely used.

Likely first files:

```text
frontend/src/lib/food-api.js
frontend/src/lib/food-normalize.js
frontend/src/lib/food-normalize.test.js
frontend/src/lib/nutrition.js
frontend/src/lib/nutrition.test.js
frontend/src/lib/meal-plan.js
frontend/src/lib/meal-plan.test.js
frontend/src/components/FoodScanner.jsx
frontend/src/views/Meals.jsx
frontend/src/views/MealPlan.jsx
frontend/src/views/NutritionSettings.jsx
```

## Delivery slices

### Slice 1 — foundation

- additive state model and migration defaults
- manual custom food
- meal log with serving quantities
- daily nutrient totals
- export/import coverage

### Slice 2 — barcode lookup

- native ML Kit UPC/EAN support
- browser BarcodeDetector formats plus a tested 1D fallback
- Open Food Facts v3 lookup and normalization
- confirmation/edit screen
- cache and offline reuse

### Slice 3 — recipes and planning

- recipe ingredients and portions
- weekly meal-plan model
- deterministic plan builder with substitutions
- grocery list and leftovers
- schedule/workout-aware meal windows

### Slice 4 — integrated guidance

- nutrition profile and targets
- Home and Stats integration
- explainable recovery suggestions
- optional AI explanation layer with strict source boundaries

## Acceptance gates

- A scanned product never gets silently attributed to a different barcode.
- Missing or partial product data always offers manual correction.
- The browser and native scanner return the same normalized barcode shape.
- Historical meal entries remain stable when a cached product changes.
- A complete plan can be edited, logged, exported, imported, and deleted.
- Workout logging works with nutrition disabled.
- Nutrition logging works offline after cached/custom foods exist.
- No nutrition target is presented as medical advice or as mandatory.
- Tests cover unit conversion, serving math, leading zeros, missing nutrients, duplicate items, plan substitutions, and state migration.

## Sources

- USDA MyPlate meal planning: https://www.myplate.gov/eat-healthy/what-is-myplate
- USDA Dietary Guidelines: https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines
- 2025 DGAC meal frequency review: https://www.ncbi.nlm.nih.gov/books/NBK610625/
- Meal planning observational study: https://pmc.ncbi.nlm.nih.gov/articles/PMC5288891/
- ISSN protein and exercise position stand: https://pubmed.ncbi.nlm.nih.gov/28642676/
- Open Food Facts API documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Open Food Facts terms and reuse: https://world.openfoodfacts.org/terms-of-use
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide
- GS1 barcode standards: https://gs1ca.org/standards/barcode-standards/
- NIDDK Body Weight Planner: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
