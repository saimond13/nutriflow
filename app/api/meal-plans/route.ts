import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, mealPlans, mealPlanItems } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const active = req.nextUrl.searchParams.get('active')

  if (active === 'true') {
    const [plan] = await db.select().from(mealPlans)
      .where(and(eq(mealPlans.user_id, userId), eq(mealPlans.is_active, true)))
    if (!plan) return NextResponse.json({ plan: null, items: [] })

    const items = await db.select().from(mealPlanItems)
      .where(eq(mealPlanItems.meal_plan_id, plan.id))
      .orderBy(mealPlanItems.sort_order)

    return NextResponse.json({ plan, items })
  }

  const plans = await db.select().from(mealPlans)
    .where(eq(mealPlans.user_id, userId))
    .orderBy(desc(mealPlans.created_at))
    .limit(10)

  return NextResponse.json({ plans })
}
