import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile, getAllUsersWithSubs } from '@/lib/db/queries'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profile = await getUserProfile(userId)
  console.log('[admin/users] profile:', profile?.email, 'is_admin:', profile?.is_admin)
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acceso denegado', is_admin: profile?.is_admin }, { status: 403 })

  const users = await getAllUsersWithSubs()
  console.log('[admin/users] users found:', users.length)
  return NextResponse.json({ users })
}
