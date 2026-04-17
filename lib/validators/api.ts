import { z } from 'zod'

export const FoodEntrySchema = z.object({
  logged_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  meal_type:     z.enum(['breakfast','morning_snack','lunch','afternoon_snack','dinner','other']).default('other'),
  food_name:     z.string().min(1).max(200),
  quantity_g:    z.number().min(0).max(10_000).default(100),
  calories:      z.number().min(0).max(10_000).default(0),
  protein_g:     z.number().min(0).max(1_000).default(0),
  carbs_g:       z.number().min(0).max(1_000).default(0),
  fat_g:         z.number().min(0).max(1_000).default(0),
  fiber_g:       z.number().min(0).max(200).optional(),
  source:        z.enum(['manual','text_ai','photo_ai','barcode','from_plan']).default('manual'),
  notes:         z.string().max(500).optional().nullable(),
  portion_label: z.string().max(100).optional().nullable(),
})

export const BodyMetricSchema = z.object({
  logged_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  weight_kg:    z.number().min(20).max(500),
  body_fat_pct: z.number().min(0).max(100).optional().nullable(),
  waist_cm:     z.number().min(30).max(300).optional().nullable(),
  hip_cm:       z.number().min(30).max(300).optional().nullable(),
  notes:        z.string().max(500).optional().nullable(),
})

export const FastingStartSchema = z.object({
  action:   z.literal('start'),
  protocol: z.enum(['16:8', '18:6', '20:4', 'omad']),
  notes:    z.string().max(500).optional().nullable(),
})

export const FastingActionSchema = z.object({
  action: z.enum(['start', 'complete', 'break']),
  protocol: z.enum(['16:8', '18:6', '20:4', 'omad']).optional(),
  notes:    z.string().max(500).optional().nullable(),
})

export const ChatSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4_000),
  })).min(1).max(30),
  session_id: z.string().uuid().optional().nullable(),
})

export const ParseFoodSchema = z.object({
  text:     z.string().min(1).max(2_000),
  servings: z.number().int().min(1).max(20).optional().default(1),
})

export const AdminUpdatePlanSchema = z.object({
  user_id: z.string().min(1).max(100),
  plan:    z.enum(['free', 'premium']),
  notes:   z.string().max(500).optional().nullable(),
})
