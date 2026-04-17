import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { openai } from '@/lib/openai/client'
import { buildShoppingListPrompt } from '@/lib/openai/prompts'
import { ShoppingListResponseSchema } from '@/lib/openai/validators'
import { getPrefs } from '@/lib/db/queries'
import { db, mealPlans, mealPlanItems, shoppingLists, shoppingListItems, aiGenerations } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { plan_id } = await req.json()
  if (!plan_id) return NextResponse.json({ error: 'plan_id requerido' }, { status: 400 })

  const [plan] = await db.select().from(mealPlans)
    .where(and(eq(mealPlans.id, plan_id), eq(mealPlans.user_id, userId)))
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const items = await db.select().from(mealPlanItems).where(eq(mealPlanItems.meal_plan_id, plan_id))
  if (!items.length) return NextResponse.json({ error: 'El plan no tiene comidas' }, { status: 400 })

  const prefs = await getPrefs(userId)

  const allIngredients: any[] = []
  items.forEach(item => {
    const ings = Array.isArray(item.ingredients) ? item.ingredients : []
    ings.forEach((ing: any) => allIngredients.push({ ...ing, day_number: item.day_number }))
  })

  const start = Date.now()
  const prompt = buildShoppingListPrompt({
    ingredients: allIngredients,
    people_count: plan.people_count ?? 1,
    days: plan.total_days ?? 7,
    allergies: (prefs?.allergies as string[]) ?? [],
    budget: parseFloat(String(prefs?.weekly_budget_usd ?? 50)),
    region: prefs?.region ?? 'Latin America',
  })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 3000,
  })

  const raw = completion.choices[0].message.content || '{}'
  let listData: any
  try {
    listData = ShoppingListResponseSchema.parse(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Error al procesar lista de compras' }, { status: 500 })
  }

  const shareToken = Buffer.from(Math.random().toString(36) + Date.now().toString(36))
    .toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 20)

  const [savedList] = await db.insert(shoppingLists).values({
    user_id: userId,
    meal_plan_id: plan_id,
    name: `Compras – ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'short' })}`,
    week_start_date: plan.start_date,
    estimated_total_cost_usd: String(listData.estimated_total_cost_usd),
    people_count: plan.people_count ?? 1,
    share_token: shareToken,
  }).returning()

  const allItems: any[] = []
  let sortOrder = 0
  for (const [category, catItems] of Object.entries(listData.categories)) {
    for (const item of (catItems as any[])) {
      allItems.push({
        shopping_list_id: savedList.id,
        ingredient_name: item.ingredient_name,
        category,
        quantity: String(item.quantity),
        unit: item.unit,
        estimated_cost_usd: String(item.estimated_cost_usd),
        is_optional: item.is_optional ?? false,
        substitute_for: item.substitute_for ?? null,
        day_numbers: item.day_numbers ?? [],
        sort_order: sortOrder++,
      })
    }
  }

  if (allItems.length > 0) await db.insert(shoppingListItems).values(allItems)

  await db.insert(aiGenerations).values({
    user_id: userId, generation_type: 'shopping_list', model_used: 'gpt-4o',
    prompt_tokens: completion.usage?.prompt_tokens ?? 0,
    completion_tokens: completion.usage?.completion_tokens ?? 0,
    linked_plan_id: plan_id,
    duration_ms: Date.now() - start,
  })

  return NextResponse.json({ list: savedList, total_items: allItems.length, estimated_cost: listData.estimated_total_cost_usd })
}
