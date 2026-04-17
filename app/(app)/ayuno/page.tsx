'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Timer, Flame, CheckCircle2, XCircle, Play, Square, Zap } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'

const PROTOCOLS = [
  { id: '16:8', label: '16:8', desc: 'Más popular', fast: 16, eat: 8, color: 'emerald' },
  { id: '18:6', label: '18:6', desc: 'Intermedio',  fast: 18, eat: 6, color: 'amber'   },
  { id: '20:4', label: '20:4', desc: 'Avanzado',    fast: 20, eat: 4, color: 'orange'  },
  { id: 'omad', label: 'OMAD', desc: 'Una comida',  fast: 23, eat: 1, color: 'rose'    },
]

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDuration(ms: number) {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

function formatHours(h: number) {
  return h === 1 ? '1 hora' : `${h} horas`
}

export default function AyunoPage() {
  const metrics   = useAuthStore(s => s.metrics)
  const [active, setActive]     = useState<any>(null)
  const [history, setHistory]   = useState<any[]>([])
  const [selected, setSelected] = useState('16:8')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [now, setNow]           = useState(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const load = useCallback(async () => {
    const res  = await fetch('/api/fasting')
    const data = await res.json()
    setActive(data.active ?? null)
    setHistory(data.history ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function startFast() {
    setSaving(true)
    await fetch('/api/fasting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', protocol: selected }),
    })
    await load()
    setSaving(false)
  }

  async function endFast(action: 'complete' | 'break') {
    setSaving(true)
    await fetch('/api/fasting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    await load()
    setSaving(false)
  }

  // Timer computations
  let phase: 'fasting' | 'eating' | null = null
  let elapsed = 0
  let total = 0
  let remaining = 0
  let pct = 0
  let eatingWindowStart: Date | null = null
  let eatingWindowEnd: Date | null = null

  if (active) {
    const startedAt = new Date(active.started_at).getTime()
    const fastMs    = active.fast_hours * 3600 * 1000
    const eatMs     = active.eat_hours  * 3600 * 1000
    eatingWindowStart = new Date(startedAt + fastMs)
    eatingWindowEnd   = new Date(startedAt + fastMs + eatMs)

    if (now < eatingWindowStart.getTime()) {
      phase     = 'fasting'
      elapsed   = now - startedAt
      total     = fastMs
      remaining = eatingWindowStart.getTime() - now
      pct       = Math.min(100, Math.round((elapsed / total) * 100))
    } else {
      phase     = 'eating'
      elapsed   = now - eatingWindowStart.getTime()
      total     = eatMs
      remaining = eatingWindowEnd.getTime() - now
      pct       = Math.min(100, Math.round((elapsed / total) * 100))
    }
  }

  const calTarget = metrics?.calorie_target || 2000
  const completedCount = history.filter(s => s.completed).length
  const totalCount     = history.length

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse mb-6" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Timer className="h-6 w-6 text-emerald-500" />
          Ayuno Intermitente
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Combiná el ayuno con tu objetivo calórico de {calTarget} kcal/día
        </p>
      </div>

      {/* Stats */}
      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
              <p className="text-xs text-slate-500">Sesiones totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
              <p className="text-xs text-slate-500">Completadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">Adherencia</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timer activo */}
      {active ? (
        <Card className={`mb-6 border-2 ${phase === 'fasting' ? 'border-blue-200 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant={phase === 'fasting' ? 'secondary' : 'default'} className="mb-2">
                  {phase === 'fasting' ? '🔵 Ayunando' : '🟢 Ventana de alimentación'}
                </Badge>
                <p className="text-sm text-slate-500">Protocolo {active.protocol}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Inició</p>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(active.started_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center my-6">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">
                {phase === 'fasting' ? 'Tiempo hasta poder comer' : 'Tiempo restante de alimentación'}
              </p>
              <p className="text-5xl font-mono font-bold text-slate-800 tabular-nums">
                {formatDuration(remaining)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {phase === 'fasting'
                  ? `Ventana de comida: ${eatingWindowStart?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} – ${eatingWindowEnd?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                  : `Cierra a las ${eatingWindowEnd?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                }
              </p>
            </div>

            {/* Progress */}
            <Progress value={pct} color={phase === 'fasting' ? 'blue' : 'emerald'} className="mb-2" />
            <p className="text-xs text-slate-400 text-center">{pct}% completado</p>

            {/* Integration with calorie target */}
            {phase === 'eating' && (
              <div className="mt-4 rounded-xl bg-white border border-emerald-200 p-3 flex items-center gap-3">
                <Flame className="h-5 w-5 text-emerald-500 shrink-0" />
                <p className="text-sm text-slate-600">
                  Tu objetivo es consumir <span className="font-semibold text-emerald-700">{calTarget} kcal</span> en{' '}
                  <span className="font-semibold">{formatHours(active.eat_hours)}</span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {phase === 'eating' && (
                <Button className="flex-1" onClick={() => endFast('complete')} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4" /> Completar ayuno
                </Button>
              )}
              <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => endFast('break')} disabled={saving}>
                <XCircle className="h-4 w-4" /> Romper ayuno
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Selector de protocolo */
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Iniciar nuevo ayuno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {PROTOCOLS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    selected === p.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <p className="font-bold text-lg text-slate-800">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {p.fast}h ayuno · {p.eat}h comida
                  </p>
                </button>
              ))}
            </div>

            {/* Integration info */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-3">
              <Flame className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Integración con tu plan nutricional</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Con {PROTOCOLS.find(p => p.id === selected)?.label}, concentrás tus{' '}
                  <span className="font-semibold">{calTarget} kcal/día</span> en una ventana de{' '}
                  <span className="font-semibold">
                    {formatHours(PROTOCOLS.find(p => p.id === selected)?.eat ?? 8)}
                  </span>.
                  Esto genera un déficit natural al reducir el tiempo disponible para comer.
                </p>
              </div>
            </div>

            <Button className="w-full" onClick={startFast} disabled={saving}>
              <Play className="h-4 w-4" />
              Iniciar ayuno {selected}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {history.slice(0, 7).map(s => {
                const start   = new Date(s.started_at)
                const end     = new Date(s.ended_at)
                const durationH = Math.round((end.getTime() - start.getTime()) / 3600000 * 10) / 10
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.completed
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-red-400" />
                      }
                      <div>
                        <p className="text-sm font-medium text-slate-700">{s.protocol}</p>
                        <p className="text-xs text-slate-400">{formatDate(start)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={s.completed ? 'default' : 'secondary'}>
                        {s.completed ? 'Completado' : 'Interrumpido'}
                      </Badge>
                      <p className="text-xs text-slate-400 mt-1">{durationH}h</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
