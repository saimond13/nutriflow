import { z } from 'zod'

export const MealItemSchema = z.object({
  meal_type: z.enum(['breakfast','morning_snack','lunch','afternoon_snack','dinner']),
  recipe_name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  servings: z.number().positive().default(1),
  calories: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500),
  carbs_g: z.number().min(0).max(800),
  fat_g: z.number().min(0).max(400),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })).optional().default([]),
  quick_instructions: z.string().optional().nullable(),
})

export const DayPlanSchema = z.object({
  day_number: z.number().min(1).max(7),
  day_name: z.string(),
  total_calories: z.number(),
  meals: z.array(MealItemSchema).min(3),
})

export const MealPlanResponseSchema = z.object({
  plan_summary: z.object({
    avg_daily_calories: z.number(),
    avg_daily_protein_g: z.number(),
    avg_daily_carbs_g: z.number(),
    avg_daily_fat_g: z.number(),
    estimated_weekly_cost_usd: z.number(),
    notes: z.string().optional().default(''),
  }),
  days: z.array(DayPlanSchema).min(7).max(7),
})

export const ShoppingItemSchema = z.object({
  ingredient_name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  estimated_cost_usd: z.number(),
  day_numbers: z.array(z.number()),
  substitute_for: z.string(),
  is_optional: z.boolean(),
})

export const ShoppingListResponseSchema = z.object({
  estimated_total_cost_usd: z.number(),
  currency_note: z.string(),
  categories: z.object({
    meats:       z.array(ShoppingItemSchema).default([]),
    dairy:       z.array(ShoppingItemSchema).default([]),
    vegetables:  z.array(ShoppingItemSchema).default([]),
    fruits:      z.array(ShoppingItemSchema).default([]),
    grains:      z.array(ShoppingItemSchema).default([]),
    legumes:     z.array(ShoppingItemSchema).default([]),
    condiments:  z.array(ShoppingItemSchema).default([]),
    beverages:   z.array(ShoppingItemSchema).default([]),
    frozen:      z.array(ShoppingItemSchema).default([]),
    other:       z.array(ShoppingItemSchema).default([]),
  }),
})

export const FoodParseResponseSchema = z.array(z.object({
  food_name: z.string(),
  quantity_g: z.number(),
  portion_label: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.enum(['high','medium','low']),
}))

export type MealPlanResponse = z.infer<typeof MealPlanResponseSchema>
export type ShoppingListResponse = z.infer<typeof ShoppingListResponseSchema>
export type FoodParseResponse = z.infer<typeof FoodParseResponseSchema>
