// Endpoint para cargar el perfil completo (usado por el store)
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, profiles, subscriptions, userMetrics, dietaryPreferences } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getOrCreateProfile } from '@/lib/db/queries'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ')

  // Asegurar que el perfil existe
  await getOrCreateProfile(userId, email, fullName)

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId))
  const [sub]     = await db.select().from(subscriptions).where(eq(subscriptions.user_id, userId))
  const [metrics] = await db.select().from(userMetrics).where(eq(userMetrics.user_id, userId))
  const [prefs]   = await db.select().from(dietaryPreferences).where(eq(dietaryPreferences.user_id, userId))

  return NextResponse.json({ profile, subscription: sub, metrics, prefs })
}
