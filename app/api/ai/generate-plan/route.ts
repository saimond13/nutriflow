import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { openai, FREE_LIMITS } from '@/lib/openai/client'
import { buildMealPlanPrompt } from '@/lib/openai/prompts'
import { MealPlanResponseSchema } from '@/lib/openai/validators'
import { getSubscription, getUsage, incrementUsage, getMetrics, getPrefs } from '@/lib/db/queries'
import { db, mealPlans, mealPlanItems, aiGenerations } from '@/lib/db'
import { eq, and, ne } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar límite free
  const sub = await getSubscription(userId)
  const isPremium = sub?.plan === 'premium'
  if (!isPremium) {
    const usage = await getUsage(userId)
    if ((usage?.plan_generations ?? 0) >= FREE_LIMITS.plan_generations) {
      return NextResponse.json({ error: 'limit_reached', message: 'Límite de planes alcanzado (3/mes en plan gratuito)' }, { status: 402 })
    }
  }

  const metrics = await getMetrics(userId)
  const prefs   = await getPrefs(userId)
  if (!metrics) return NextResponse.json({ error: 'Completa tu perfil antes de generar un plan' }, { status: 400 })

  const start = Date.now()
  const prompt = buildMealPlanPrompt({ metrics: metrics as any, prefs: prefs as any ?? {} })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 8000,
  })

  const raw = completion.choices[0].message.content || '{}'
  let planData: any
  try {
    planData = MealPlanResponseSchema.parse(JSON.parse(raw))
  } catch (e: any) {
    console.error('AI plan validation error:', JSON.stringify(e?.errors ?? e, null, 2))
    console.error('Raw response (first 500 chars):', raw.slice(0, 500))
    return NextResponse.json({ error: 'La IA devolvió un plan inválido. Intenta de nuevo.' }, { status: 500 })
  }

  const startDate = new Date()
  const endDate   = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const [savedPlan] = await db.insert(mealPlans).values({
    user_id: userId,
    name: `Plan semanal – ${startDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`,
    start_date: startDate.toISOString().slice(0, 10),
    end_date:   endDate.toISOString().slice(0, 10),
    plan_type: 'weekly',
    total_days: 7,
    people_count: prefs?.people_count ?? 1,
    avg_daily_calories: String(planData.plan_summary.avg_daily_calories),
    avg_daily_protein:  String(planData.plan_summary.avg_daily_protein_g),
    avg_daily_carbs:    String(planData.plan_summary.avg_daily_carbs_g),
    avg_daily_fat:      String(planData.plan_summary.avg_daily_fat_g),
    estimated_weekly_cost_usd: String(planData.plan_summary.estimated_weekly_cost_usd),
    ai_model_used: 'gpt-4o',
    is_active: true,
  }).returning()

  // Desactivar planes anteriores
  await db.update(mealPlans)
    .set({ is_active: false })
    .where(and(eq(mealPlans.user_id, userId), ne(mealPlans.id, savedPlan.id)))

  // Insertar ítems del plan
  const items = planData.days.flatMap((day: any) =>
    day.meals.map((meal: any, idx: number) => ({
      meal_plan_id: savedPlan.id,
      day_number:   day.day_number,
      meal_type:    meal.meal_type,
      recipe_name:  meal.recipe_name,
      description:  meal.description ?? null,
      servings:     String(meal.servings),
      calories:     String(meal.calories),
      protein_g:    String(meal.protein_g),
      carbs_g:      String(meal.carbs_g),
      fat_g:        String(meal.fat_g),
      ingredients:  meal.ingredients ?? [],
      quick_instructions: meal.quick_instructions ?? null,
      sort_order:   idx,
    }))
  )
  await db.insert(mealPlanItems).values(items)

  await incrementUsage(userId, 'plan_generations')
  await db.insert(aiGenerations).values({
    user_id: userId, generation_type: 'meal_plan', model_used: 'gpt-4o',
    prompt_tokens: completion.usage?.prompt_tokens ?? 0,
    completion_tokens: completion.usage?.completion_tokens ?? 0,
    linked_plan_id: savedPlan.id,
    duration_ms: Date.now() - start,
  })

  return NextResponse.json({ plan: savedPlan, summary: planData.plan_summary })
}
