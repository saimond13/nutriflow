import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, foodEntries, progressLogs, userMetrics } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { LIMITERS, rateLimitResponse } from '@/lib/rate-limit'
import { FoodEntrySchema } from '@/lib/validators/api'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const date = req.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date inválido' }, { status: 400 })
  }

  const entries = await db.select().from(foodEntries)
    .where(and(eq(foodEntries.user_id, userId), eq(foodEntries.logged_date, date)))
    .orderBy(foodEntries.created_at)

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const body = await req.json()
  const parsed = FoodEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const d = parsed.data
  const [entry] = await db.insert(foodEntries).values({
    user_id:       userId,
    logged_date:   d.logged_date,
    meal_type:     d.meal_type,
    food_name:     d.food_name,
    quantity_g:    String(d.quantity_g),
    calories:      String(d.calories),
    protein_g:     String(d.protein_g),
    carbs_g:       String(d.carbs_g),
    fat_g:         String(d.fat_g),
    source:        d.source,
    notes:         d.notes ?? null,
    portion_label: d.portion_label ?? null,
  }).returning()

  await recalcProgressLog(userId, d.logged_date)
  return NextResponse.json({ entry })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const [deleted] = await db.delete(foodEntries)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.user_id, userId)))
    .returning()

  if (deleted) await recalcProgressLog(userId, deleted.logged_date)

  return NextResponse.json({ success: true })
}

async function recalcProgressLog(userId: string, date: string) {
  const entries = await db.select().from(foodEntries)
    .where(and(eq(foodEntries.user_id, userId), eq(foodEntries.logged_date, date)))

  const [metrics] = await db.select().from(userMetrics).where(eq(userMetrics.user_id, userId))

  const totals = {
    calories: entries.reduce((s, e) => s + parseFloat(String(e.calories ?? 0)), 0),
    protein:  entries.reduce((s, e) => s + parseFloat(String(e.protein_g ?? 0)), 0),
    carbs:    entries.reduce((s, e) => s + parseFloat(String(e.carbs_g ?? 0)), 0),
    fat:      entries.reduce((s, e) => s + parseFloat(String(e.fat_g ?? 0)), 0),
  }

  await db.insert(progressLogs).values({
    user_id: userId,
    log_date: date,
    total_calories_consumed: String(totals.calories),
    calories_target: String(metrics?.calorie_target ?? 2000),
    protein_g_consumed: String(totals.protein),
    carbs_g_consumed:   String(totals.carbs),
    fat_g_consumed:     String(totals.fat),
  }).onConflictDoUpdate({
    target: [progressLogs.user_id, progressLogs.log_date],
    set: {
      total_calories_consumed: String(totals.calories),
      protein_g_consumed: String(totals.protein),
      carbs_g_consumed:   String(totals.carbs),
      fat_g_consumed:     String(totals.fat),
    },
  })
}
