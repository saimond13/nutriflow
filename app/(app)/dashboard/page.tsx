'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatDate, todayISO } from '@/lib/utils/date'
import { CalendarDays, Plus, Flame, Beef, Wheat, Droplets, TrendingUp, ShoppingCart, Sparkles, Timer } from 'lucide-react'

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Desayuno', morning_snack: '🍎 Merienda AM',
  lunch: '☀️ Almuerzo', afternoon_snack: '🥜 Merienda PM',
  dinner: '🌙 Cena', other: '🍽️ Otro',
}

export default function DashboardPage() {
  const metrics = useAuthStore(s => s.metrics)
  const profile = useAuthStore(s => s.profile)
  const [entries, setEntries]   = useState<any[]>([])
  const [plan, setPlan]         = useState<any>(null)
  const [fasting, setFasting]   = useState<any>(null)
  const [loading, setLoad]      = useState(true)
  const [now, setNow]           = useState(Date.now())
  const today = todayISO()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    const [entriesRes, planRes, fastingRes] = await Promise.all([
      fetch(`/api/food-entries?date=${today}`),
      fetch('/api/meal-plans?active=true'),
      fetch('/api/fasting'),
    ])
    const { entries: e } = await entriesRes.json()
    const { plan: p }    = await planRes.json()
    const { active: f }  = await fastingRes.json()
    setEntries(e || [])
    setPlan(p || null)
    setFasting(f || null)
    setLoad(false)
  }, [today])

  useEffect(() => { load() }, [load])

  const totals = {
    calories: entries.reduce((s, e) => s + parseFloat(e.calories || 0), 0),
    protein:  entries.reduce((s, e) => s + parseFloat(e.protein_g || 0), 0),
    carbs:    entries.reduce((s, e) => s + parseFloat(e.carbs_g || 0), 0),
    fat:      entries.reduce((s, e) => s + parseFloat(e.fat_g || 0), 0),
  }

  const calTarget  = metrics?.calorie_target  || 2000
  const protTarget = metrics?.protein_target_g || 150
  const carbTarget = metrics?.carbs_target_g   || 250
  const fatTarget  = metrics?.fat_target_g     || 65
  const calPct   = Math.min(100, Math.round((totals.calories / Number(calTarget)) * 100))
  const remaining = Math.max(0, Number(calTarget) - totals.calories)

  const byMeal: Record<string, any[]> = {}
  entries.forEach(e => { if (!byMeal[e.meal_type]) byMeal[e.meal_type] = []; byMeal[e.meal_type].push(e) })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Bienvenido'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(new Date(), "EEEE dd 'de' MMMM")}
          </p>
        </div>
        <Link href="/registro">
          <Button><Plus className="h-4 w-4" /> Registrar comida</Button>
        </Link>
      </div>

      {/* Resumen calórico */}
      <Card className="mb-6 bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Calorías consumidas</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl font-bold">{Math.round(totals.calories)}</span>
                <span className="text-emerald-200 text-lg mb-1">/ {calTarget} kcal</span>
              </div>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Flame className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="h-3 rounded-full bg-white/30 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${calPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-sm text-emerald-100">
            <span>{calPct}% completado</span>
            <span>{Math.round(remaining)} kcal restantes</span>
          </div>
        </CardContent>
      </Card>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MacroCard label="Proteínas"     value={totals.protein} target={Number(protTarget)} icon={<Beef className="h-4 w-4" />}    color="emerald" unit="g" />
        <MacroCard label="Carbohidratos" value={totals.carbs}   target={Number(carbTarget)} icon={<Wheat className="h-4 w-4" />}   color="amber"   unit="g" />
        <MacroCard label="Grasas"        value={totals.fat}     target={Number(fatTarget)}  icon={<Droplets className="h-4 w-4" />} color="blue"    unit="g" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Comidas de hoy */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Comidas de hoy</CardTitle>
              <Link href="/registro"><Button variant="ghost" size="sm">Ver todo</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Plus className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Aún no registraste comidas hoy</p>
                <Link href="/registro"><Button variant="secondary" size="sm">Registrar ahora</Button></Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(byMeal).map(([mt, items]) => (
                  <div key={mt} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">{MEAL_LABELS[mt]}</p>
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{item.food_name}</span>
                        <span className="text-slate-400">{Math.round(parseFloat(item.calories))} kcal</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Plan activo */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Plato Semanal</CardTitle>
                {plan && <Badge variant="default">Activo</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {plan ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">{plan.name || 'Plan semanal activo'}</p>
                  <p className="text-sm text-slate-400">~{Math.round(parseFloat(plan.avg_daily_calories || 0))} kcal/día</p>
                  <Link href="/plan"><Button variant="secondary" size="sm" className="w-full">Ver plan</Button></Link>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <p className="text-sm text-slate-500">No tienes un plan activo</p>
                  <Link href="/plan">
                    <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> Generar plan</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ayuno widget */}
          <FastingWidget fasting={fasting} now={now} />

          <div className="grid grid-cols-2 gap-3">
            <Link href="/canasta">
              <Card className="hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Canasta</p>
                  <p className="text-xs text-slate-400">Lista de compras</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/evolucion">
              <Card className="hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Evolución</p>
                  <p className="text-xs text-slate-400">Ver progreso</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function MacroCard({ label, value, target, icon, color, unit }: { label: string; value: number; target: number; icon: React.ReactNode; color: 'emerald'|'amber'|'blue'; unit: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const colors = { emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600' }
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-slate-800">{Math.round(value)}<span className="text-sm font-normal text-slate-400">{unit}</span></p>
        <p className="text-xs text-slate-400 mb-2">de {target}{unit}</p>
        <Progress value={pct} color={color} />
      </CardContent>
    </Card>
  )
}

function pad(n: number) { return String(n).padStart(2, '0') }

function FastingWidget({ fasting, now }: { fasting: any; now: number }) {
  if (!fasting) {
    return (
      <Link href="/ayuno">
        <Card className="hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
              <Timer className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Ayuno Intermitente</p>
              <p className="text-xs text-slate-400">Iniciar sesión de ayuno</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const startedAt = new Date(fasting.started_at).getTime()
  const fastMs    = fasting.fast_hours * 3600 * 1000
  const eatMs     = fasting.eat_hours  * 3600 * 1000
  const eatStart  = startedAt + fastMs
  const eatEnd    = eatStart + eatMs

  const isFasting = now < eatStart
  const remaining = isFasting ? eatStart - now : eatEnd - now
  const total     = isFasting ? fastMs : eatMs
  const pct       = Math.min(100, Math.round(((total - remaining) / total) * 100))

  const s   = Math.max(0, Math.floor(remaining / 1000))
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60

  return (
    <Link href="/ayuno">
      <Card className={`hover:shadow-md transition-all cursor-pointer border-2 ${isFasting ? 'border-blue-200 bg-blue-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className={`h-4 w-4 ${isFasting ? 'text-blue-500' : 'text-emerald-500'}`} />
              <p className="text-sm font-medium text-slate-700">
                {isFasting ? '🔵 Ayunando' : '🟢 Ventana de comida'} · {fasting.protocol}
              </p>
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-800 tabular-nums">
            {`${pad(h)}:${pad(m)}:${pad(sec)}`}
          </p>
          <p className="text-xs text-slate-400 mb-2">
            {isFasting ? 'hasta poder comer' : 'tiempo restante'}
          </p>
          <Progress value={pct} color={isFasting ? 'blue' : 'emerald'} />
        </CardContent>
      </Card>
    </Link>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
