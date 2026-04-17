import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, userMetrics, dietaryPreferences, profiles, subscriptions } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Asegurar que existe el perfil antes de insertar datos con FK
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
  const full_name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null
  const avatar_url = clerkUser?.imageUrl ?? null

  await db.insert(profiles).values({
    id: userId,
    email,
    full_name,
    avatar_url,
    onboarding_completed: false,
  }).onConflictDoUpdate({
    target: profiles.id,
    set: { email, full_name, avatar_url },
  })

  // Crear suscripción gratuita si no existe
  await db.insert(subscriptions).values({
    user_id: userId,
    plan: 'free',
    status: 'active',
  }).onConflictDoNothing()

  const body = await req.json()
  const {
    age, sex, height_cm, weight_kg, target_weight_kg,
    activity_level, goal_type,
    calorie_target, protein_g, carbs_g, fat_g,
    diet_type, allergies, excluded_foods, meal_complexity,
    people_count, weekly_budget_usd, region, training_days_per_week,
  } = body

  await db.insert(userMetrics).values({
    user_id:          userId,
    age:              parseInt(age),
    sex,
    height_cm:        height_cm ? String(parseFloat(height_cm)) : null,
    weight_kg:        weight_kg ? String(parseFloat(weight_kg)) : null,
    target_weight_kg: target_weight_kg ? String(parseFloat(target_weight_kg)) : null,
    activity_level,
    goal_type,
    calorie_target:   calorie_target ? parseInt(calorie_target) : null,
    protein_target_g: protein_g ? parseInt(protein_g) : null,
    carbs_target_g:   carbs_g ? parseInt(carbs_g) : null,
    fat_target_g:     fat_g ? parseInt(fat_g) : null,
  }).onConflictDoUpdate({
    target: userMetrics.user_id,
    set: {
      age:              parseInt(age),
      sex,
      height_cm:        height_cm ? String(parseFloat(height_cm)) : null,
      weight_kg:        weight_kg ? String(parseFloat(weight_kg)) : null,
      target_weight_kg: target_weight_kg ? String(parseFloat(target_weight_kg)) : null,
      activity_level,
      goal_type,
      calorie_target:   calorie_target ? parseInt(calorie_target) : null,
      protein_target_g: protein_g ? parseInt(protein_g) : null,
      carbs_target_g:   carbs_g ? parseInt(carbs_g) : null,
      fat_target_g:     fat_g ? parseInt(fat_g) : null,
    },
  })

  await db.insert(dietaryPreferences).values({
    user_id:                userId,
    diet_type,
    allergies:              allergies || [],
    excluded_foods:         excluded_foods || [],
    meal_complexity,
    people_count:           parseInt(people_count) || 1,
    weekly_budget_usd:      weekly_budget_usd ? String(parseFloat(weekly_budget_usd)) : null,
    region:                 region || null,
    training_days_per_week: parseInt(training_days_per_week) || 3,
  }).onConflictDoUpdate({
    target: dietaryPreferences.user_id,
    set: {
      diet_type,
      allergies:              allergies || [],
      excluded_foods:         excluded_foods || [],
      meal_complexity,
      people_count:           parseInt(people_count) || 1,
      weekly_budget_usd:      weekly_budget_usd ? String(parseFloat(weekly_budget_usd)) : null,
      region:                 region || null,
      training_days_per_week: parseInt(training_days_per_week) || 3,
    },
  })

  await db.update(profiles)
    .set({ onboarding_completed: true })
    .where(eq(profiles.id, userId))

  return NextResponse.json({ success: true })
}
