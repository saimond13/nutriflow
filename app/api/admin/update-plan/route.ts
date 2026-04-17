import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile } from '@/lib/db/queries'
import { db, subscriptions, subscriptionHistory } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { LIMITERS, rateLimitResponse } from '@/lib/rate-limit'
import { AdminUpdatePlanSchema } from '@/lib/validators/api'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const profile = await getUserProfile(userId)
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json()
  const parsed = AdminUpdatePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { user_id, plan, notes } = parsed.data

  // Obtener plan anterior para el historial
  const [currentSub] = await db.select().from(subscriptions).where(eq(subscriptions.user_id, user_id))

  // Actualizar suscripción
  await db.update(subscriptions).set({
    plan,
    status: 'active',
    notes: notes || null,
    changed_by: userId,
    activated_at:   plan === 'premium' ? new Date() : null,
    deactivated_at: plan === 'free'    ? new Date() : null,
    updated_at: new Date(),
  }).where(eq(subscriptions.user_id, user_id))

  // Registrar en historial
  if (currentSub?.plan !== plan) {
    await db.insert(subscriptionHistory).values({
      user_id,
      from_plan:  currentSub?.plan ?? 'free',
      to_plan:    plan,
      reason:     notes ?? null,
      changed_by: userId,
    })
  }

  return NextResponse.json({ success: true, plan })
}
