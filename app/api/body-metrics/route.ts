import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, bodyMetrics } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { LIMITERS, rateLimitResponse } from '@/lib/rate-limit'
import { BodyMetricSchema } from '@/lib/validators/api'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '30')
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 30 : limitParam), 365)

  const metrics = await db.select().from(bodyMetrics)
    .where(eq(bodyMetrics.user_id, userId))
    .orderBy(desc(bodyMetrics.logged_date))
    .limit(limit)

  return NextResponse.json({ metrics })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const body = await req.json()
  const parsed = BodyMetricSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const d = parsed.data
  await db.insert(bodyMetrics).values({
    user_id:      userId,
    logged_date:  d.logged_date,
    weight_kg:    String(d.weight_kg),
    body_fat_pct: d.body_fat_pct != null ? String(d.body_fat_pct) : null,
    waist_cm:     d.waist_cm != null ? String(d.waist_cm) : null,
    hip_cm:       d.hip_cm != null ? String(d.hip_cm) : null,
    notes:        d.notes ?? null,
  }).onConflictDoUpdate({
    target: [bodyMetrics.user_id, bodyMetrics.logged_date],
    set: {
      weight_kg:    String(d.weight_kg),
      body_fat_pct: d.body_fat_pct != null ? String(d.body_fat_pct) : null,
      notes:        d.notes ?? null,
    },
  })

  return NextResponse.json({ success: true })
}
