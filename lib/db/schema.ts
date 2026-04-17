import {
  pgTable, uuid, text, boolean, integer, numeric, date,
  timestamp, jsonb, uniqueIndex, index, pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ──────────────────────────────────────────────────────
export const planEnum       = pgEnum('plan_type_enum',        ['free','premium'])
export const subStatusEnum  = pgEnum('sub_status_enum',       ['active','inactive','suspended'])
export const goalEnum       = pgEnum('goal_type_enum',        ['lose_weight','maintain','gain_muscle','body_recomposition'])
export const activityEnum   = pgEnum('activity_level_enum',   ['sedentary','light','moderate','active','very_active'])
export const complexityEnum = pgEnum('complexity_enum',       ['simple','medium','elaborate'])
export const mealTypeEnum   = pgEnum('meal_type_enum',        ['breakfast','morning_snack','lunch','afternoon_snack','dinner','other'])
export const foodSourceEnum = pgEnum('food_source_enum',      ['manual','text_ai','photo_ai','barcode','from_plan'])
export const categoryEnum   = pgEnum('category_enum',         ['meats','dairy','vegetables','fruits','grains','legumes','condiments','beverages','frozen','other'])

// ── Profiles ───────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  id:                   text('id').primaryKey(),  // Clerk user ID
  email:                text('email').notNull(),
  full_name:            text('full_name'),
  avatar_url:           text('avatar_url'),
  is_admin:             boolean('is_admin').default(false).notNull(),
  onboarding_completed: boolean('onboarding_completed').default(false).notNull(),
  is_active:            boolean('is_active').default(true).notNull(),
  created_at:           timestamp('created_at').defaultNow().notNull(),
  updated_at:           timestamp('updated_at').defaultNow().notNull(),
})

// ── Subscriptions ──────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id:               uuid('id').defaultRandom().primaryKey(),
  user_id:          text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  plan:             text('plan').default('free').notNull(),
  status:           text('status').default('active').notNull(),
  activated_at:     timestamp('activated_at'),
  deactivated_at:   timestamp('deactivated_at'),
  notes:            text('notes'),
  changed_by:       text('changed_by'),
  created_at:       timestamp('created_at').defaultNow().notNull(),
  updated_at:       timestamp('updated_at').defaultNow().notNull(),
}, t => [uniqueIndex('subs_user_idx').on(t.user_id)])

// ── Subscription history ───────────────────────────────────────
export const subscriptionHistory = pgTable('subscription_history', {
  id:         uuid('id').defaultRandom().primaryKey(),
  user_id:    text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  from_plan:  text('from_plan'),
  to_plan:    text('to_plan').notNull(),
  reason:     text('reason'),
  changed_by: text('changed_by'),
  changed_at: timestamp('changed_at').defaultNow().notNull(),
})

// ── User metrics ───────────────────────────────────────────────
export const userMetrics = pgTable('user_metrics', {
  id:               uuid('id').defaultRandom().primaryKey(),
  user_id:          text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  age:              integer('age'),
  sex:              text('sex'),
  height_cm:        numeric('height_cm', { precision: 5, scale: 1 }),
  weight_kg:        numeric('weight_kg', { precision: 5, scale: 2 }),
  target_weight_kg: numeric('target_weight_kg', { precision: 5, scale: 2 }),
  activity_level:   text('activity_level'),
  goal_type:        text('goal_type'),
  tdee:             integer('tdee'),
  calorie_target:   integer('calorie_target'),
  protein_target_g: integer('protein_target_g'),
  carbs_target_g:   integer('carbs_target_g'),
  fat_target_g:     integer('fat_target_g'),
  updated_at:       timestamp('updated_at').defaultNow().notNull(),
}, t => [uniqueIndex('metrics_user_idx').on(t.user_id)])

// ── Dietary preferences ────────────────────────────────────────
export const dietaryPreferences = pgTable('dietary_preferences', {
  id:                    uuid('id').defaultRandom().primaryKey(),
  user_id:               text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  diet_type:             text('diet_type').default('omnivore'),
  allergies:             text('allergies').array().default([]),
  intolerances:          text('intolerances').array().default([]),
  excluded_foods:        text('excluded_foods').array().default([]),
  preferred_cuisines:    text('preferred_cuisines').array().default([]),
  meal_complexity:       text('meal_complexity').default('simple'),
  weekly_budget_usd:     numeric('weekly_budget_usd', { precision: 8, scale: 2 }),
  people_count:          integer('people_count').default(1),
  training_days_per_week:integer('training_days_per_week').default(3),
  region:                text('region'),
  updated_at:            timestamp('updated_at').defaultNow().notNull(),
}, t => [uniqueIndex('prefs_user_idx').on(t.user_id)])

// ── Foods ──────────────────────────────────────────────────────
export const foods = pgTable('foods', {
  id:               uuid('id').defaultRandom().primaryKey(),
  name:             text('name').notNull(),
  brand:            text('brand'),
  barcode:          text('barcode'),
  calories_per_100g:numeric('calories_per_100g', { precision: 6, scale: 2 }),
  protein_per_100g: numeric('protein_per_100g',  { precision: 6, scale: 2 }),
  carbs_per_100g:   numeric('carbs_per_100g',    { precision: 6, scale: 2 }),
  fat_per_100g:     numeric('fat_per_100g',      { precision: 6, scale: 2 }),
  fiber_per_100g:   numeric('fiber_per_100g',    { precision: 6, scale: 2 }),
  source:           text('source').default('admin'),
  is_verified:      boolean('is_verified').default(false),
  created_at:       timestamp('created_at').defaultNow().notNull(),
})

// ── Food entries ───────────────────────────────────────────────
export const foodEntries = pgTable('food_entries', {
  id:           uuid('id').defaultRandom().primaryKey(),
  user_id:      text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  logged_date:  date('logged_date').notNull(),
  meal_type:    text('meal_type').default('other'),
  food_name:    text('food_name').notNull(),
  food_id:      uuid('food_id').references(() => foods.id, { onDelete: 'set null' }),
  quantity_g:   numeric('quantity_g', { precision: 8, scale: 2 }).default('100'),
  portion_label:text('portion_label'),
  calories:     numeric('calories',   { precision: 8, scale: 2 }).default('0'),
  protein_g:    numeric('protein_g',  { precision: 8, scale: 2 }).default('0'),
  carbs_g:      numeric('carbs_g',    { precision: 8, scale: 2 }).default('0'),
  fat_g:        numeric('fat_g',      { precision: 8, scale: 2 }).default('0'),
  fiber_g:      numeric('fiber_g',    { precision: 8, scale: 2 }),
  notes:        text('notes'),
  source:       text('source').default('manual'),
  created_at:   timestamp('created_at').defaultNow().notNull(),
}, t => [index('entries_user_date_idx').on(t.user_id, t.logged_date)])

// ── Meal plans ─────────────────────────────────────────────────
export const mealPlans = pgTable('meal_plans', {
  id:                        uuid('id').defaultRandom().primaryKey(),
  user_id:                   text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name:                      text('name'),
  start_date:                date('start_date'),
  end_date:                  date('end_date'),
  plan_type:                 text('plan_type').default('weekly'),
  total_days:                integer('total_days').default(7),
  people_count:              integer('people_count').default(1),
  avg_daily_calories:        numeric('avg_daily_calories', { precision: 8, scale: 2 }),
  avg_daily_protein:         numeric('avg_daily_protein',  { precision: 8, scale: 2 }),
  avg_daily_carbs:           numeric('avg_daily_carbs',    { precision: 8, scale: 2 }),
  avg_daily_fat:             numeric('avg_daily_fat',      { precision: 8, scale: 2 }),
  estimated_weekly_cost_usd: numeric('estimated_weekly_cost_usd', { precision: 8, scale: 2 }),
  ai_model_used:             text('ai_model_used'),
  is_active:                 boolean('is_active').default(false),
  created_at:                timestamp('created_at').defaultNow().notNull(),
})

// ── Meal plan items ────────────────────────────────────────────
export const mealPlanItems = pgTable('meal_plan_items', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  meal_plan_id:       uuid('meal_plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
  day_number:         integer('day_number').notNull(),
  meal_type:          text('meal_type'),
  recipe_name:        text('recipe_name'),
  description:        text('description'),
  servings:           numeric('servings', { precision: 4, scale: 2 }).default('1'),
  calories:           numeric('calories', { precision: 8, scale: 2 }).default('0'),
  protein_g:          numeric('protein_g', { precision: 8, scale: 2 }).default('0'),
  carbs_g:            numeric('carbs_g',   { precision: 8, scale: 2 }).default('0'),
  fat_g:              numeric('fat_g',     { precision: 8, scale: 2 }).default('0'),
  ingredients:        jsonb('ingredients').default([]),
  quick_instructions: text('quick_instructions'),
  is_logged:          boolean('is_logged').default(false),
  sort_order:         integer('sort_order').default(0),
})

// ── Shopping lists ─────────────────────────────────────────────
export const shoppingLists = pgTable('shopping_lists', {
  id:                        uuid('id').defaultRandom().primaryKey(),
  user_id:                   text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  meal_plan_id:              uuid('meal_plan_id').references(() => mealPlans.id, { onDelete: 'set null' }),
  name:                      text('name'),
  week_start_date:           date('week_start_date'),
  is_completed:              boolean('is_completed').default(false),
  estimated_total_cost_usd:  numeric('estimated_total_cost_usd', { precision: 8, scale: 2 }),
  people_count:              integer('people_count').default(1),
  share_token:               text('share_token').unique(),
  created_at:                timestamp('created_at').defaultNow().notNull(),
})

// ── Shopping list items ────────────────────────────────────────
export const shoppingListItems = pgTable('shopping_list_items', {
  id:               uuid('id').defaultRandom().primaryKey(),
  shopping_list_id: uuid('shopping_list_id').notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
  ingredient_name:  text('ingredient_name').notNull(),
  category:         text('category').default('other'),
  quantity:         numeric('quantity', { precision: 10, scale: 3 }),
  unit:             text('unit').default('g'),
  estimated_cost_usd: numeric('estimated_cost_usd', { precision: 6, scale: 2 }),
  is_purchased:     boolean('is_purchased').default(false),
  is_optional:      boolean('is_optional').default(false),
  substitute_for:   text('substitute_for'),
  notes:            text('notes'),
  day_numbers:      integer('day_numbers').array().default([]),
  sort_order:       integer('sort_order').default(0),
})

// ── Body metrics ───────────────────────────────────────────────
export const bodyMetrics = pgTable('body_metrics', {
  id:          uuid('id').defaultRandom().primaryKey(),
  user_id:     text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  logged_date: date('logged_date').notNull(),
  weight_kg:   numeric('weight_kg',  { precision: 5, scale: 2 }),
  body_fat_pct:numeric('body_fat_pct',{ precision: 5, scale: 2 }),
  waist_cm:    numeric('waist_cm',   { precision: 5, scale: 1 }),
  hip_cm:      numeric('hip_cm',     { precision: 5, scale: 1 }),
  chest_cm:    numeric('chest_cm',   { precision: 5, scale: 1 }),
  arm_cm:      numeric('arm_cm',     { precision: 5, scale: 1 }),
  notes:       text('notes'),
  photo_url:   text('photo_url'),
  created_at:  timestamp('created_at').defaultNow().notNull(),
})

// ── Progress logs ──────────────────────────────────────────────
export const progressLogs = pgTable('progress_logs', {
  id:                       uuid('id').defaultRandom().primaryKey(),
  user_id:                  text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  log_date:                 date('log_date').notNull(),
  total_calories_consumed:  numeric('total_calories_consumed', { precision: 8, scale: 2 }).default('0'),
  calories_target:          numeric('calories_target', { precision: 8, scale: 2 }).default('0'),
  protein_g_consumed:       numeric('protein_g_consumed', { precision: 8, scale: 2 }).default('0'),
  carbs_g_consumed:         numeric('carbs_g_consumed',   { precision: 8, scale: 2 }).default('0'),
  fat_g_consumed:           numeric('fat_g_consumed',     { precision: 8, scale: 2 }).default('0'),
  plan_adherence_pct:       numeric('plan_adherence_pct', { precision: 5, scale: 2 }),
  created_at:               timestamp('created_at').defaultNow().notNull(),
}, t => [uniqueIndex('progress_user_date_idx').on(t.user_id, t.log_date)])

// ── Chat ───────────────────────────────────────────────────────
export const chatSessions = pgTable('chat_sessions', {
  id:         uuid('id').defaultRandom().primaryKey(),
  user_id:    text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title:      text('title').default('Nueva consulta'),
  is_active:  boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

export const chatMessages = pgTable('chat_messages', {
  id:          uuid('id').defaultRandom().primaryKey(),
  session_id:  uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  user_id:     text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role:        text('role').notNull(),
  content:     text('content').notNull(),
  tokens_used: integer('tokens_used'),
  created_at:  timestamp('created_at').defaultNow().notNull(),
})

// ── AI generations ─────────────────────────────────────────────
export const aiGenerations = pgTable('ai_generations', {
  id:               uuid('id').defaultRandom().primaryKey(),
  user_id:          text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  generation_type:  text('generation_type'),
  model_used:       text('model_used').default('gpt-4o-mini'),
  prompt_tokens:    integer('prompt_tokens').default(0),
  completion_tokens:integer('completion_tokens').default(0),
  linked_plan_id:   uuid('linked_plan_id').references(() => mealPlans.id, { onDelete: 'set null' }),
  duration_ms:      integer('duration_ms'),
  created_at:       timestamp('created_at').defaultNow().notNull(),
})

// ── Usage counters ─────────────────────────────────────────────
export const usageCounters = pgTable('usage_counters', {
  id:               uuid('id').defaultRandom().primaryKey(),
  user_id:          text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  month:            text('month').notNull(),
  plan_generations: integer('plan_generations').default(0),
  chat_messages:    integer('chat_messages').default(0),
  food_ai_parses:   integer('food_ai_parses').default(0),
  photo_analyses:   integer('photo_analyses').default(0),
  updated_at:       timestamp('updated_at').defaultNow().notNull(),
}, t => [uniqueIndex('usage_user_month_idx').on(t.user_id, t.month)])

// ── Saved preferences ──────────────────────────────────────────
export const savedPreferences = pgTable('saved_preferences', {
  id:         uuid('id').defaultRandom().primaryKey(),
  user_id:    text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  key:        text('key').notNull(),
  value:      jsonb('value'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, t => [uniqueIndex('prefs_key_idx').on(t.user_id, t.key)])

// ── Relations ──────────────────────────────────────────────────
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  subscription:        one(subscriptions,      { fields: [profiles.id], references: [subscriptions.user_id] }),
  metrics:             one(userMetrics,         { fields: [profiles.id], references: [userMetrics.user_id] }),
  dietaryPreferences:  one(dietaryPreferences,  { fields: [profiles.id], references: [dietaryPreferences.user_id] }),
  foodEntries:         many(foodEntries),
  mealPlans:           many(mealPlans),
  shoppingLists:       many(shoppingLists),
  bodyMetrics:         many(bodyMetrics),
  chatSessions:        many(chatSessions),
}))

export const mealPlansRelations = relations(mealPlans, ({ many }) => ({
  items: many(mealPlanItems),
}))

export const shoppingListsRelations = relations(shoppingLists, ({ many }) => ({
  items: many(shoppingListItems),
}))

export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  messages: many(chatMessages),
}))
