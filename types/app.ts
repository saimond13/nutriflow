// ── Plan types ──────────────────────────────────────────────
export type PlanType = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'inactive' | 'suspended'

// ── User / Profile ───────────────────────────────────────────
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  onboarding_completed: boolean
  is_active: boolean
  created_at: string
}

export interface UserMetrics {
  id: string
  user_id: string
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  height_cm: number | null
  weight_kg: number | null
  target_weight_kg: number | null
  activity_level: ActivityLevel | null
  goal_type: GoalType | null
  tdee: number | null
  calorie_target: number | null
  protein_target_g: number | null
  carbs_target_g: number | null
  fat_target_g: number | null
}

export interface DietaryPreferences {
  id: string
  user_id: string
  diet_type: string | null
  allergies: string[]
  intolerances: string[]
  excluded_foods: string[]
  preferred_cuisines: string[]
  meal_complexity: MealComplexity | null
  weekly_budget_usd: number | null
  people_count: number
  training_days_per_week: number
  region: string | null
}

export interface Subscription {
  id: string
  user_id: string
  plan: PlanType
  status: SubscriptionStatus
  activated_at: string | null
  deactivated_at: string | null
  notes: string | null
  changed_by: string | null  // admin user_id
  created_at: string
  updated_at: string
}

// ── Enums ─────────────────────────────────────────────────────
export type GoalType = 'lose_weight' | 'maintain' | 'gain_muscle' | 'body_recomposition'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MealComplexity = 'simple' | 'medium' | 'elaborate'
export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'other'
export type FoodSource = 'manual' | 'text_ai' | 'photo_ai' | 'barcode' | 'from_plan'

// ── Food & Nutrition ──────────────────────────────────────────
export interface Food {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number | null
  source: string
}

export interface FoodEntry {
  id: string
  user_id: string
  logged_date: string
  meal_type: MealType
  food_name: string
  food_id: string | null
  quantity_g: number
  portion_label: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  notes: string | null
  source: FoodSource
  created_at: string
}

// ── Meal Plan ─────────────────────────────────────────────────
export interface MealPlan {
  id: string
  user_id: string
  name: string | null
  start_date: string | null
  end_date: string | null
  plan_type: 'daily' | 'weekly'
  total_days: number
  people_count: number
  avg_daily_calories: number | null
  avg_daily_protein: number | null
  avg_daily_carbs: number | null
  avg_daily_fat: number | null
  estimated_weekly_cost_usd: number | null
  is_active: boolean
  created_at: string
}

export interface MealPlanItem {
  id: string
  meal_plan_id: string
  day_number: number
  meal_type: MealType
  recipe_name: string | null
  description: string | null
  servings: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  ingredients: RecipeIngredient[]
  quick_instructions: string | null
  is_logged: boolean
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
}

// ── Shopping List ─────────────────────────────────────────────
export interface ShoppingList {
  id: string
  user_id: string
  meal_plan_id: string | null
  name: string | null
  week_start_date: string | null
  is_completed: boolean
  estimated_total_cost_usd: number | null
  people_count: number
  share_token: string | null
  created_at: string
}

export interface ShoppingListItem {
  id: string
  shopping_list_id: string
  ingredient_name: string
  category: IngredientCategory
  quantity: number
  unit: string
  estimated_cost_usd: number | null
  is_purchased: boolean
  is_optional: boolean
  substitute_for: string | null
  notes: string | null
  day_numbers: number[]
}

export type IngredientCategory =
  | 'meats' | 'dairy' | 'vegetables' | 'fruits'
  | 'grains' | 'legumes' | 'condiments' | 'beverages'
  | 'frozen' | 'other'

// ── Progress ──────────────────────────────────────────────────
export interface BodyMetric {
  id: string
  user_id: string
  logged_date: string
  weight_kg: number | null
  body_fat_pct: number | null
  waist_cm: number | null
  hip_cm: number | null
  notes: string | null
}

export interface ProgressLog {
  id: string
  user_id: string
  log_date: string
  total_calories_consumed: number
  calories_target: number
  protein_g_consumed: number
  carbs_g_consumed: number
  fat_g_consumed: number
  plan_adherence_pct: number | null
}

// ── AI ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ── Dashboard summary ─────────────────────────────────────────
export interface DailySummary {
  date: string
  calories_consumed: number
  calories_target: number
  protein_g: number
  protein_target_g: number
  carbs_g: number
  carbs_target_g: number
  fat_g: number
  fat_target_g: number
  meals: FoodEntry[]
}

// ── Admin ─────────────────────────────────────────────────────
export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  plan: PlanType
  status: SubscriptionStatus
  onboarding_completed: boolean
  created_at: string
  last_sign_in_at: string | null
}
