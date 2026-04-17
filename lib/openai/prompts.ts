import type { UserMetrics, DietaryPreferences } from '@/types/app'

export interface MealPlanContext {
  metrics: UserMetrics
  prefs: DietaryPreferences
}

export function buildMealPlanPrompt(ctx: MealPlanContext): string {
  const { metrics, prefs } = ctx
  return `You are a professional nutritionist assistant. Generate a complete 7-day meal plan in Spanish.

## USER PROFILE
- Goal: ${metrics.goal_type}
- Daily calorie target: ${metrics.calorie_target} kcal
- Macros: ${metrics.protein_target_g}g protein | ${metrics.carbs_target_g}g carbs | ${metrics.fat_target_g}g fat
- Age: ${metrics.age} | Sex: ${metrics.sex}
- Activity level: ${metrics.activity_level}
- Diet type: ${prefs.diet_type || 'omnivore'}
- Allergies: ${prefs.allergies?.join(', ') || 'none'}
- Excluded foods: ${prefs.excluded_foods?.join(', ') || 'none'}
- Meal complexity: ${prefs.meal_complexity || 'simple'}
- People to feed: ${prefs.people_count || 1}
- Weekly budget: $${prefs.weekly_budget_usd || 50} USD
- Region: ${prefs.region || 'Latin America'}

## RULES
- Create EXACTLY 7 days (day_number 1-7)
- Each day MUST have: breakfast, morning_snack, lunch, afternoon_snack, dinner
- Daily calories within ±5% of target
- NO allergic or excluded ingredients ever
- Vary meals — no main dish repeated more than twice per week
- All text in SPANISH
- Budget-appropriate ingredients for the region
- Each meal MUST include ALL ingredients with EXACT quantities and units (grams, cups, units, etc.)
- quick_instructions MUST be detailed: step-by-step preparation with temperatures, times, and techniques (3-6 steps minimum)

## RESPONSE: valid JSON only, no markdown
{
  "plan_summary": {
    "avg_daily_calories": number,
    "avg_daily_protein_g": number,
    "avg_daily_carbs_g": number,
    "avg_daily_fat_g": number,
    "estimated_weekly_cost_usd": number,
    "notes": "string"
  },
  "days": [
    {
      "day_number": 1,
      "day_name": "Lunes",
      "total_calories": number,
      "meals": [
        {
          "meal_type": "breakfast|morning_snack|lunch|afternoon_snack|dinner",
          "recipe_name": "string",
          "description": "Descripción breve del plato",
          "servings": 1,
          "calories": number,
          "protein_g": number,
          "carbs_g": number,
          "fat_g": number,
          "ingredients": [
            {"name": "Pechuga de pollo", "quantity": 200, "unit": "g"},
            {"name": "Arroz integral", "quantity": 80, "unit": "g"},
            {"name": "Brócoli", "quantity": 150, "unit": "g"},
            {"name": "Aceite de oliva", "quantity": 1, "unit": "cdta"},
            {"name": "Sal y pimienta", "quantity": 1, "unit": "pizca"}
          ],
          "quick_instructions": "1. Condimentar el pollo con sal, pimienta y ajo. 2. Cocinar en sartén con aceite a fuego medio-alto 6 min por lado hasta dorar. 3. Hervir el arroz en agua con sal 20 min. 4. Cocinar el brócoli al vapor 5 min. 5. Servir el pollo sobre el arroz con el brócoli al costado."
        }
      ]
    }
  ]
}`
}

export function buildShoppingListPrompt(params: {
  ingredients: Array<{ name: string; quantity: number; unit: string; day_number: number }>
  people_count: number
  days: number
  allergies: string[]
  budget: number
  region: string
}): string {
  return `You are a grocery shopping assistant. Consolidate this ingredient list into an organized shopping list.

## INGREDIENTS FROM MEAL PLAN
${JSON.stringify(params.ingredients, null, 2)}

## CONTEXT
- People: ${params.people_count}
- Days: ${params.days}
- Allergies (NEVER include): ${params.allergies.join(', ') || 'none'}
- Budget: $${params.budget} USD/week
- Region: ${params.region}

## RULES
- Consolidate duplicates (sum quantities)
- Round up to practical shopping units
- Estimate realistic supermarket prices
- Suggest a substitute for each item
- All text in SPANISH

## RESPONSE: valid JSON only
{
  "estimated_total_cost_usd": number,
  "currency_note": "string",
  "categories": {
    "meats": [],
    "dairy": [],
    "vegetables": [],
    "fruits": [],
    "grains": [],
    "legumes": [],
    "condiments": [],
    "beverages": [],
    "frozen": [],
    "other": []
  }
}
Each item: {"ingredient_name":"string","quantity":number,"unit":"string","estimated_cost_usd":number,"day_numbers":[1,2],"substitute_for":"string","is_optional":boolean}`
}

export function buildFoodParsePrompt(text: string, servings = 1): string {
  const recipeNote = servings > 1
    ? `This is a RECIPE that yields ${servings} servings. Calculate total nutrition for ALL ingredients combined, then DIVIDE by ${servings} to get per-serving values. Set portion_label to "1 porción (1/${servings} receta)".`
    : `If the text describes a recipe or multiple ingredients of a single dish, return it as ONE consolidated item with the combined nutritional total.`

  return `You are a nutritionist. Analyze this food log and return the nutritional totals.

Food log: "${text}"

Rules:
- ${recipeNote}
- If the log describes multiple SEPARATE dishes (not ingredients of one dish), return one item per dish (max 5 items).
- Do NOT list individual raw ingredients as separate items — consolidate into the dish.
- Estimate realistic nutritional values based on the quantities described.
- Use Spanish for food_name.

Respond with valid JSON only, exactly this structure:
{"items":[{"food_name":"string","quantity_g":number,"portion_label":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"high|medium|low"}]}

If nothing identifiable, return {"items":[]}.`
}

export function buildReplaceMealPrompt(meal: {
  recipe_name: string; meal_type: string; day_name: string
  calories: number; protein_g: number; carbs_g: number; fat_g: number
}, prefs: DietaryPreferences, reason?: string): string {
  return `Replace this meal with a nutritionally equivalent alternative in Spanish.

MEAL TO REPLACE:
- Name: ${meal.recipe_name}
- Type: ${meal.meal_type} (${meal.day_name})
- Nutrition: ${meal.calories}kcal | ${meal.protein_g}g protein | ${meal.carbs_g}g carbs | ${meal.fat_g}g fat

REASON: ${reason || 'User preference'}

CONSTRAINTS:
- Allergies (NEVER use): ${prefs.allergies?.join(', ') || 'none'}
- Excluded: ${prefs.excluded_foods?.join(', ') || 'none'}
- Diet: ${prefs.diet_type || 'omnivore'}
- Match calories within ±50 kcal
- Must be a DIFFERENT dish

Respond with valid JSON only (single meal object):
{"recipe_name":"string","description":"string","servings":1,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"ingredients":[{"name":"string","quantity":number,"unit":"string"}],"quick_instructions":"string"}`
}

export function buildChatSystemPrompt(metrics: UserMetrics | null, prefs: DietaryPreferences | null): string {
  return `Eres NutriBot, un asistente nutricional amigable y profesional integrado en NutriFlow.

${metrics ? `PERFIL DEL USUARIO:
- Objetivo: ${metrics.goal_type}
- Calorías/día: ${metrics.calorie_target} kcal
- Macros: ${metrics.protein_target_g}g proteína | ${metrics.carbs_target_g}g carbohidratos | ${metrics.fat_target_g}g grasas` : ''}

${prefs ? `PREFERENCIAS:
- Dieta: ${prefs.diet_type || 'omnívora'}
- Alergias: ${prefs.allergies?.join(', ') || 'ninguna'}
- Excluidos: ${prefs.excluded_foods?.join(', ') || 'ninguno'}` : ''}

REGLAS:
- Responde SIEMPRE en español
- Sé conciso y práctico
- Siempre aclara que no reemplazas a un nutricionista profesional
- Si piden un plan o lista de compras, puedes generarlo y se guardará automáticamente
- No inventes datos nutricionales sin respaldo
- Máximo 3 párrafos por respuesta salvo que sea un plan detallado`
}
