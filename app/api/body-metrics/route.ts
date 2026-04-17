import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, bodyMetrics } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

  const metrics = await db.select().from(bodyMetrics)
    .where(eq(bodyMetrics.user_id, userId))
    .orderBy(desc(bodyMetrics.logged_date))
    .limit(limit)

  return NextResponse.json({ metrics })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { logged_date, weight_kg, body_fat_pct, notes } = await req.json()
  if (!logged_date || !weight_kg) {
    return NextResponse.json({ error: 'Fecha y peso son requeridos' }, { status: 400 })
  }

  await db.insert(bodyMetrics).values({
    user_id:      userId,
    logged_date,
    weight_kg:    weight_kg.toString(),
    body_fat_pct: body_fat_pct ? body_fat_pct.toString() : null,
    notes:        notes || null,
  }).onConflictDoUpdate({
    target: [bodyMetrics.user_id, bodyMetrics.logged_date],
    set: {
      weight_kg:    weight_kg.toString(),
      body_fat_pct: body_fat_pct ? body_fat_pct.toString() : null,
      notes:        notes || null,
    },
  })

  return NextResponse.json({ success: true })
}
