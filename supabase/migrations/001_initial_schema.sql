-- ============================================================
-- NutriFlow - Schema inicial completo
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PERFILES DE USUARIO
-- ============================================================

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  is_admin        BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUSCRIPCIONES (gestión manual por admin, sin Stripe)
-- ============================================================

CREATE TABLE public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('free','premium')) DEFAULT 'free',
  status          TEXT NOT NULL CHECK (status IN ('active','inactive','suspended')) DEFAULT 'active',
  activated_at    TIMESTAMPTZ,
  deactivated_at  TIMESTAMPTZ,
  notes           TEXT,           -- motivo del cambio (ej: "pagó transferencia 15/04")
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- admin que hizo el cambio
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Historial de cambios de plan
CREATE TABLE public.subscription_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_plan       TEXT,
  to_plan         TEXT NOT NULL,
  reason          TEXT,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÉTRICAS Y OBJETIVOS DEL USUARIO
-- ============================================================

CREATE TABLE public.user_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  age             INT,
  sex             TEXT CHECK (sex IN ('male','female','other')),
  height_cm       NUMERIC(5,1),
  weight_kg       NUMERIC(5,2),
  target_weight_kg NUMERIC(5,2),
  activity_level  TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal_type       TEXT CHECK (goal_type IN ('lose_weight','maintain','gain_muscle','body_recomposition')),
  tdee            INT,
  calorie_target  INT,
  protein_target_g INT,
  carbs_target_g  INT,
  fat_target_g    INT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE public.dietary_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diet_type       TEXT DEFAULT 'omnivore',
  allergies       TEXT[] DEFAULT '{}',
  intolerances    TEXT[] DEFAULT '{}',
  excluded_foods  TEXT[] DEFAULT '{}',
  preferred_cuisines TEXT[] DEFAULT '{}',
  meal_complexity TEXT CHECK (meal_complexity IN ('simple','medium','elaborate')) DEFAULT 'simple',
  weekly_budget_usd NUMERIC(8,2),
  people_count    INT DEFAULT 1,
  training_days_per_week INT DEFAULT 3,
  region          TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- ALIMENTOS (base de datos)
-- ============================================================

CREATE TABLE public.foods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  brand           TEXT,
  barcode         TEXT,
  calories_per_100g NUMERIC(6,2),
  protein_per_100g  NUMERIC(6,2),
  carbs_per_100g    NUMERIC(6,2),
  fat_per_100g      NUMERIC(6,2),
  fiber_per_100g    NUMERIC(6,2),
  source          TEXT CHECK (source IN ('openfoodfacts','ai_generated','user_created','admin')) DEFAULT 'admin',
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_foods_name ON foods USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL;

-- ============================================================
-- RECETAS
-- ============================================================

CREATE TABLE public.recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  instructions    TEXT,
  prep_time_min   INT,
  cook_time_min   INT,
  servings        INT DEFAULT 1,
  complexity      TEXT CHECK (complexity IN ('simple','medium','elaborate')),
  tags            TEXT[] DEFAULT '{}',
  image_url       TEXT,
  total_calories  NUMERIC(8,2),
  total_protein   NUMERIC(8,2),
  total_carbs     NUMERIC(8,2),
  total_fat       NUMERIC(8,2),
  is_ai_generated BOOLEAN DEFAULT FALSE,
  is_public       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REGISTRO DE COMIDAS (food log)
-- ============================================================

CREATE TABLE public.food_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type       TEXT CHECK (meal_type IN ('breakfast','morning_snack','lunch','afternoon_snack','dinner','other')) DEFAULT 'other',
  food_name       TEXT NOT NULL,
  food_id         UUID REFERENCES foods(id) ON DELETE SET NULL,
  quantity_g      NUMERIC(8,2) DEFAULT 100,
  portion_label   TEXT,
  calories        NUMERIC(8,2) DEFAULT 0,
  protein_g       NUMERIC(8,2) DEFAULT 0,
  carbs_g         NUMERIC(8,2) DEFAULT 0,
  fat_g           NUMERIC(8,2) DEFAULT 0,
  fiber_g         NUMERIC(8,2),
  notes           TEXT,
  source          TEXT CHECK (source IN ('manual','text_ai','photo_ai','barcode','from_plan')) DEFAULT 'manual',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_entries_user_date ON food_entries(user_id, logged_date DESC);

-- ============================================================
-- PLANES NUTRICIONALES
-- ============================================================

CREATE TABLE public.meal_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT,
  start_date      DATE,
  end_date        DATE,
  plan_type       TEXT CHECK (plan_type IN ('daily','weekly')) DEFAULT 'weekly',
  total_days      INT DEFAULT 7,
  people_count    INT DEFAULT 1,
  avg_daily_calories NUMERIC(8,2),
  avg_daily_protein  NUMERIC(8,2),
  avg_daily_carbs    NUMERIC(8,2),
  avg_daily_fat      NUMERIC(8,2),
  estimated_weekly_cost_usd NUMERIC(8,2),
  ai_model_used   TEXT,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.meal_plan_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id    UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_number      INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  meal_type       TEXT CHECK (meal_type IN ('breakfast','morning_snack','lunch','afternoon_snack','dinner')),
  recipe_name     TEXT,
  description     TEXT,
  servings        NUMERIC(4,2) DEFAULT 1,
  calories        NUMERIC(8,2) DEFAULT 0,
  protein_g       NUMERIC(8,2) DEFAULT 0,
  carbs_g         NUMERIC(8,2) DEFAULT 0,
  fat_g           NUMERIC(8,2) DEFAULT 0,
  ingredients     JSONB DEFAULT '[]',   -- [{name, quantity, unit}]
  quick_instructions TEXT,
  is_logged       BOOLEAN DEFAULT FALSE,
  sort_order      INT DEFAULT 0
);

CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id, day_number);

-- ============================================================
-- LISTA DE COMPRAS INTELIGENTE
-- ============================================================

CREATE TABLE public.shopping_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_plan_id    UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  name            TEXT,
  week_start_date DATE,
  is_completed    BOOLEAN DEFAULT FALSE,
  estimated_total_cost_usd NUMERIC(8,2),
  people_count    INT DEFAULT 1,
  share_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shopping_list_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  category        TEXT CHECK (category IN ('meats','dairy','vegetables','fruits','grains','legumes','condiments','beverages','frozen','other')) DEFAULT 'other',
  quantity        NUMERIC(10,3),
  unit            TEXT DEFAULT 'g',
  estimated_cost_usd NUMERIC(6,2),
  is_purchased    BOOLEAN DEFAULT FALSE,
  is_optional     BOOLEAN DEFAULT FALSE,
  substitute_for  TEXT,
  notes           TEXT,
  day_numbers     INT[] DEFAULT '{}',
  sort_order      INT DEFAULT 0
);

-- ============================================================
-- PROGRESO CORPORAL
-- ============================================================

CREATE TABLE public.body_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg       NUMERIC(5,2),
  body_fat_pct    NUMERIC(5,2),
  waist_cm        NUMERIC(5,1),
  hip_cm          NUMERIC(5,1),
  chest_cm        NUMERIC(5,1),
  arm_cm          NUMERIC(5,1),
  thigh_cm        NUMERIC(5,1),
  notes           TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.progress_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calories_consumed NUMERIC(8,2) DEFAULT 0,
  calories_target NUMERIC(8,2) DEFAULT 0,
  protein_g_consumed NUMERIC(8,2) DEFAULT 0,
  carbs_g_consumed NUMERIC(8,2) DEFAULT 0,
  fat_g_consumed  NUMERIC(8,2) DEFAULT 0,
  plan_adherence_pct NUMERIC(5,2),
  water_ml        INT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ============================================================
-- IA Y CHAT
-- ============================================================

CREATE TABLE public.chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT DEFAULT 'Nueva consulta',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            TEXT CHECK (role IN ('user','assistant')) NOT NULL,
  content         TEXT NOT NULL,
  tokens_used     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ai_generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_type TEXT CHECK (generation_type IN ('meal_plan','shopping_list','recipe','food_analysis','chat_response','weekly_summary')),
  model_used      TEXT DEFAULT 'gpt-4o-mini',
  prompt_tokens   INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  linked_plan_id  UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  duration_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Contador de uso por usuario (para límites del plan free)
CREATE TABLE public.usage_counters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,  -- 'YYYY-MM'
  plan_generations INT DEFAULT 0,
  chat_messages   INT DEFAULT 0,
  food_ai_parses  INT DEFAULT 0,
  photo_analyses  INT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- ============================================================
-- NOTIFICACIONES Y PREFERENCIAS
-- ============================================================

CREATE TABLE public.notification_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_reminders  BOOLEAN DEFAULT TRUE,
  meal_reminder_times TEXT[] DEFAULT ARRAY['08:00','13:00','19:00'],
  weekly_summary  BOOLEAN DEFAULT TRUE,
  push_enabled    BOOLEAN DEFAULT FALSE,
  email_enabled   BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE public.saved_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  value           JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);
