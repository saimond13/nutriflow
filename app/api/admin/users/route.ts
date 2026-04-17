import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile, getAllUsersWithSubs } from '@/lib/db/queries'
import { LIMITERS, rateLimitResponse } from '@/lib/rate-limit'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.api(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const profile = await getUserProfile(userId)
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const users = await getAllUsersWithSubs()
  return NextResponse.json({ users })
}
