-- ============================================================
-- NutriFlow - RLS Policies y Triggers
-- ============================================================

-- ── Función updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER trg_profiles_updated ON profiles BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated ON subscriptions BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_user_metrics_updated ON user_metrics BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dietary_updated ON dietary_preferences BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Trigger: crear perfil y suscripción al registrarse ──────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Trigger: registrar historial de cambio de plan ──────────
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    INSERT INTO subscription_history (user_id, from_plan, to_plan, reason, changed_by)
    VALUES (NEW.user_id, OLD.plan, NEW.plan, NEW.notes, NEW.changed_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscription_history
  AFTER UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_subscription_change();

-- ── Trigger: actualizar progress_log al registrar comida ────
CREATE OR REPLACE FUNCTION update_daily_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_target_calories INT;
  v_target_protein  INT;
  v_target_carbs    INT;
  v_target_fat      INT;
  v_date DATE;
  v_user UUID;
BEGIN
  v_date := COALESCE(NEW.logged_date, OLD.logged_date);
  v_user := COALESCE(NEW.user_id, OLD.user_id);

  SELECT calorie_target, protein_target_g, carbs_target_g, fat_target_g
  INTO v_target_calories, v_target_protein, v_target_carbs, v_target_fat
  FROM user_metrics WHERE user_id = v_user;

  INSERT INTO progress_logs (
    user_id, log_date,
    total_calories_consumed, calories_target,
    protein_g_consumed, carbs_g_consumed, fat_g_consumed
  )
  SELECT
    v_user, v_date,
    COALESCE(SUM(calories), 0),
    COALESCE(v_target_calories, 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0)
  FROM food_entries
  WHERE user_id = v_user AND logged_date = v_date
  ON CONFLICT (user_id, log_date) DO UPDATE SET
    total_calories_consumed = EXCLUDED.total_calories_consumed,
    calories_target         = EXCLUDED.calories_target,
    protein_g_consumed      = EXCLUDED.protein_g_consumed,
    carbs_g_consumed        = EXCLUDED.carbs_g_consumed,
    fat_g_consumed          = EXCLUDED.fat_g_consumed;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_daily_progress
  AFTER INSERT OR UPDATE OR DELETE ON food_entries
  FOR EACH ROW EXECUTE FUNCTION update_daily_progress();

-- ── Función: verificar si usuario es premium ─────────────────
CREATE OR REPLACE FUNCTION is_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id AND plan = 'premium' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Función: contar uso mensual ───────────────────────────────
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_field TEXT
)
RETURNS VOID AS $$
DECLARE
  v_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO usage_counters (user_id, month)
  VALUES (p_user_id, v_month)
  ON CONFLICT (user_id, month) DO NOTHING;

  EXECUTE format(
    'UPDATE usage_counters SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1 AND month = $2',
    p_field, p_field
  ) USING p_user_id, v_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subs_admin_all" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- subscription_history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_history_own" ON subscription_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sub_history_admin" ON subscription_history FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- user_metrics
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_own" ON user_metrics FOR ALL USING (auth.uid() = user_id);

-- dietary_preferences
ALTER TABLE dietary_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dietary_own" ON dietary_preferences FOR ALL USING (auth.uid() = user_id);

-- foods (lectura pública para autenticados)
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foods_read_all" ON foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "foods_admin_write" ON foods FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- food_entries
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_own" ON food_entries FOR ALL USING (auth.uid() = user_id);

-- meal_plans
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_own" ON meal_plans FOR ALL USING (auth.uid() = user_id);

-- meal_plan_items
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_items_own" ON meal_plan_items FOR ALL USING (
  EXISTS (SELECT 1 FROM meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
);

-- shopping_lists
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_own" ON shopping_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "shopping_public_read" ON shopping_lists FOR SELECT USING (share_token IS NOT NULL);

-- shopping_list_items
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_items_own" ON shopping_list_items FOR ALL USING (
  EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
);
CREATE POLICY "shopping_items_public" ON shopping_list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_id AND share_token IS NOT NULL)
);

-- body_metrics
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "body_metrics_own" ON body_metrics FOR ALL USING (auth.uid() = user_id);

-- progress_logs
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_own" ON progress_logs FOR ALL USING (auth.uid() = user_id);

-- chat
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_sessions_own" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_own" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- usage_counters
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_own" ON usage_counters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_admin" ON usage_counters FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- ai_generations
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_gen_own" ON ai_generations FOR ALL USING (auth.uid() = user_id);

-- notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notification_settings FOR ALL USING (auth.uid() = user_id);

-- saved_preferences
ALTER TABLE saved_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_own" ON saved_preferences FOR ALL USING (auth.uid() = user_id);
