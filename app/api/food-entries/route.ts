import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, foodEntries, progressLogs, userMetrics } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date requerido' }, { status: 400 })

  const entries = await db.select().from(foodEntries)
    .where(and(eq(foodEntries.user_id, userId), eq(foodEntries.logged_date, date)))
    .orderBy(foodEntries.created_at)

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const [entry] = await db.insert(foodEntries).values({
    user_id:     userId,
    logged_date: body.logged_date,
    meal_type:   body.meal_type ?? 'other',
    food_name:   body.food_name,
    quantity_g:  String(body.quantity_g ?? 100),
    calories:    String(body.calories ?? 0),
    protein_g:   String(body.protein_g ?? 0),
    carbs_g:     String(body.carbs_g ?? 0),
    fat_g:       String(body.fat_g ?? 0),
    source:      body.source ?? 'manual',
    notes:       body.notes ?? null,
    portion_label: body.portion_label ?? null,
  }).returning()

  // Recalcular progress_log del día
  await recalcProgressLog(userId, body.logged_date)

  return NextResponse.json({ entry })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

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
