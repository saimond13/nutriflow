import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile } from '@/lib/db/queries'
import { db, profiles, subscriptions, userMetrics, dietaryPreferences, usageCounters } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { LIMITERS, rateLimitResponse } from '@/lib/rate-limit'

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const profile = await getUserProfile(userId)
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get('user_id')
  if (!targetId) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

  if (targetId === userId) return NextResponse.json({ error: 'No puedes eliminar tu propio perfil' }, { status: 400 })

  await db.delete(usageCounters).where(eq(usageCounters.user_id, targetId))
  await db.delete(dietaryPreferences).where(eq(dietaryPreferences.user_id, targetId))
  await db.delete(userMetrics).where(eq(userMetrics.user_id, targetId))
  await db.delete(subscriptions).where(eq(subscriptions.user_id, targetId))
  await db.delete(profiles).where(eq(profiles.id, targetId))

  return NextResponse.json({ success: true })
}
