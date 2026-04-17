// Helpers de consulta reutilizables para toda la app
import { db, profiles, subscriptions, userMetrics, dietaryPreferences, usageCounters } from './index'
import { eq, and, sql } from 'drizzle-orm'

// ── Perfil completo del usuario ────────────────────────────────
export async function getUserProfile(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId))
  return profile ?? null
}

export async function getOrCreateProfile(userId: string, email: string, fullName?: string) {
  let profile = await getUserProfile(userId)
  if (!profile) {
    const [created] = await db.insert(profiles).values({
      id: userId, email, full_name: fullName ?? null,
    }).returning()
    // Crear suscripción gratuita por defecto
    await db.insert(subscriptions).values({ user_id: userId, plan: 'free', status: 'active' })
      .onConflictDoNothing()
    return created
  }
  return profile
}

// ── Suscripción ────────────────────────────────────────────────
export async function getSubscription(userId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.user_id, userId))
  return sub ?? null
}

export async function isPremium(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId)
  return sub?.plan === 'premium' && sub?.status === 'active'
}

// ── Métricas y preferencias ────────────────────────────────────
export async function getMetrics(userId: string) {
  const [m] = await db.select().from(userMetrics).where(eq(userMetrics.user_id, userId))
  return m ?? null
}

export async function getPrefs(userId: string) {
  const [p] = await db.select().from(dietaryPreferences).where(eq(dietaryPreferences.user_id, userId))
  return p ?? null
}

// ── Uso mensual ────────────────────────────────────────────────
export async function getUsage(userId: string, month?: string) {
  const m = month ?? new Date().toISOString().slice(0, 7)
  const [usage] = await db.select().from(usageCounters)
    .where(and(eq(usageCounters.user_id, userId), eq(usageCounters.month, m)))
  return usage ?? null
}

export async function incrementUsage(userId: string, field: 'plan_generations' | 'chat_messages' | 'food_ai_parses' | 'photo_analyses') {
  const month = new Date().toISOString().slice(0, 7)
  await db.insert(usageCounters).values({ user_id: userId, month }).onConflictDoNothing()

  const increment = sql`${sql.raw(field)} + 1`
  const sets =
    field === 'plan_generations' ? { plan_generations: increment, updated_at: new Date() } :
    field === 'chat_messages'    ? { chat_messages:    increment, updated_at: new Date() } :
    field === 'food_ai_parses'   ? { food_ai_parses:   increment, updated_at: new Date() } :
                                   { photo_analyses:   increment, updated_at: new Date() }

  await db.update(usageCounters).set(sets)
    .where(and(eq(usageCounters.user_id, userId), eq(usageCounters.month, month)))
}

// ── Admin: listado de usuarios ────────────────────────────────
export async function getAllUsersWithSubs() {
  return db.select({
    id:                   profiles.id,
    email:                profiles.email,
    full_name:            profiles.full_name,
    is_admin:             profiles.is_admin,
    is_active:            profiles.is_active,
    onboarding_completed: profiles.onboarding_completed,
    created_at:           profiles.created_at,
    plan:                 subscriptions.plan,
    sub_status:           subscriptions.status,
    sub_notes:            subscriptions.notes,
    sub_updated_at:       subscriptions.updated_at,
  })
  .from(profiles)
  .leftJoin(subscriptions, eq(profiles.id, subscriptions.user_id))
  .orderBy(profiles.created_at)
}
