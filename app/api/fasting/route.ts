import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, fastingSessions } from '@/lib/db'
import { eq, and, isNull, desc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessions = await db
    .select()
    .from(fastingSessions)
    .where(eq(fastingSessions.user_id, userId))
    .orderBy(desc(fastingSessions.started_at))
    .limit(14)

  const active = sessions.find(s => !s.ended_at) ?? null
  const history = sessions.filter(s => !!s.ended_at)

  return NextResponse.json({ active, history })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { action, protocol, notes } = body

  if (action === 'start') {
    // End any existing active session first
    await db
      .update(fastingSessions)
      .set({ ended_at: new Date(), broken: true })
      .where(and(eq(fastingSessions.user_id, userId), isNull(fastingSessions.ended_at)))

    const protocols: Record<string, { fast: number; eat: number }> = {
      '16:8': { fast: 16, eat: 8 },
      '18:6': { fast: 18, eat: 6 },
      '20:4': { fast: 20, eat: 4 },
      'omad': { fast: 23, eat: 1 },
    }
    const { fast, eat } = protocols[protocol] ?? protocols['16:8']

    const [session] = await db.insert(fastingSessions).values({
      user_id:    userId,
      protocol,
      fast_hours: fast,
      eat_hours:  eat,
      started_at: new Date(),
      notes:      notes ?? null,
    }).returning()

    return NextResponse.json({ session })
  }

  if (action === 'complete') {
    const [session] = await db
      .update(fastingSessions)
      .set({ ended_at: new Date(), completed: true })
      .where(and(eq(fastingSessions.user_id, userId), isNull(fastingSessions.ended_at)))
      .returning()
    return NextResponse.json({ session })
  }

  if (action === 'break') {
    const [session] = await db
      .update(fastingSessions)
      .set({ ended_at: new Date(), broken: true })
      .where(and(eq(fastingSessions.user_id, userId), isNull(fastingSessions.ended_at)))
      .returning()
    return NextResponse.json({ session })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
