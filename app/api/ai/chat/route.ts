import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { openai, FREE_LIMITS } from '@/lib/openai/client'
import { buildChatSystemPrompt } from '@/lib/openai/prompts'
import { getSubscription, getUsage, incrementUsage, getMetrics, getPrefs } from '@/lib/db/queries'
import { db, chatMessages } from '@/lib/db'
import { LIMITERS, rateLimitResponse } from '@/lib/rate-limit'
import { ChatSchema } from '@/lib/validators/api'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = LIMITERS.ai(userId)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const sub = await getSubscription(userId)
  const isPremium = sub?.plan === 'premium'

  if (!isPremium) {
    const usage = await getUsage(userId)
    if ((usage?.chat_messages ?? 0) >= FREE_LIMITS.chat_messages) {
      return NextResponse.json({ error: 'limit_reached', message: 'Límite de mensajes alcanzado (20/mes en plan gratuito)' }, { status: 402 })
    }
  }

  const body = await req.json()
  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { messages, session_id } = parsed.data

  const metrics = await getMetrics(userId)
  const prefs   = await getPrefs(userId)
  const systemPrompt = buildChatSystemPrompt(metrics as any, prefs as any)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-10)],
    temperature: 0.7,
    max_tokens: 1000,
  })

  const reply = completion.choices[0].message.content || 'No pude generar una respuesta.'

  if (session_id) {
    await db.insert(chatMessages).values([
      { session_id, user_id: userId, role: 'user',      content: messages[messages.length - 1].content },
      { session_id, user_id: userId, role: 'assistant', content: reply, tokens_used: completion.usage?.total_tokens },
    ])
  }

  await incrementUsage(userId, 'chat_messages')
  return NextResponse.json({ reply })
}
