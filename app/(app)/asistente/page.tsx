'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FreeLimitWarning } from '@/components/shared/premium-gate'
import { Sparkles, Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Message { role: 'user' | 'assistant'; content: string }

export default function AsistentePage() {
  const isPremium = useAuthStore(s => s.isPremium)()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)
  const sessionId               = useRef<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (res.status === 402) { setError(data.message || 'Límite de mensajes alcanzado.'); return }
      if (data.error) { setError(data.error); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">NutriBot</h1>
            <p className="text-xs text-slate-400">Asistente nutricional con IA</p>
          </div>
        </div>
        {!isPremium && (
          <div className="mt-3">
            <FreeLimitWarning used={0} max={20} label="mensajes este mes" />
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Bot className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">¡Hola! Soy NutriBot</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Estoy aquí para ayudarte con nutrición, recetas, y tu plan alimentario. ¿En qué te ayudo hoy?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {[
                '¿Cuántas proteínas debo comer por día?',
                '¿Qué puedo comer antes de entrenar?',
                '¿Cómo puedo aumentar mi consumo de fibra?',
              ].map(s => (
                <button key={s} onClick={() => { setInput(s) }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 text-left transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              m.role === 'user' ? 'bg-emerald-500' : 'bg-slate-100'
            )}>
              {m.role === 'user'
                ? <User className="h-4 w-4 text-white" />
                : <Bot className="h-4 w-4 text-slate-500" />
              }
            </div>
            <div className={cn(
              'rounded-2xl px-4 py-3 text-sm max-w-[90%] md:max-w-[80%] leading-relaxed',
              m.role === 'user'
                ? 'bg-emerald-500 text-white rounded-tr-sm'
                : 'bg-slate-100 text-slate-700 rounded-tl-sm'
            )}>
              {m.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <Bot className="h-4 w-4 text-slate-500" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                {[0,1,2].map(i => (
                  <span key={i} className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-4 border-t border-slate-100">
        <div className="flex gap-3">
          <Textarea
            placeholder="Escribe tu pregunta nutricional..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button onClick={send} disabled={!input.trim() || loading} className="h-auto px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  )
}
