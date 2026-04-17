import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { openai, FREE_LIMITS } from '@/lib/openai/client'
import { buildFoodParsePrompt } from '@/lib/openai/prompts'
import { FoodParseResponseSchema } from '@/lib/openai/validators'
import { getSubscription, getUsage, incrementUsage } from '@/lib/db/queries'
import { db, aiGenerations } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sub = await getSubscription(userId)
  const isPremium = sub?.plan === 'premium'

  if (!isPremium) {
    const usage = await getUsage(userId)
    if ((usage?.food_ai_parses ?? 0) >= FREE_LIMITS.food_ai_parses) {
      return NextResponse.json({ error: 'limit_reached', message: 'Límite de análisis IA alcanzado en plan gratuito (10/mes)' }, { status: 402 })
    }
  }

  const { text, servings } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })

  const start = Date.now()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildFoodParsePrompt(text, Math.max(1, parseInt(servings) || 1)) }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1200,
  })

  const raw = completion.choices[0].message.content || '{"items":[]}'
  let parsed: any[] = []
  try {
    const obj = JSON.parse(raw)
    const arr = Array.isArray(obj) ? obj : (obj.items ?? obj.foods ?? obj.data ?? [])
    parsed = FoodParseResponseSchema.parse(arr)
  } catch {
    return NextResponse.json({ error: 'Error al procesar respuesta IA' }, { status: 500 })
  }

  await incrementUsage(userId, 'food_ai_parses')
  await db.insert(aiGenerations).values({
    user_id: userId, generation_type: 'food_analysis', model_used: 'gpt-4o-mini',
    prompt_tokens: completion.usage?.prompt_tokens ?? 0,
    completion_tokens: completion.usage?.completion_tokens ?? 0,
    duration_ms: Date.now() - start,
  })

  return NextResponse.json({ items: parsed })
}
