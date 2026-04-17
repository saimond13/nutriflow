'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FreeLimitWarning } from '@/components/shared/premium-gate'
import { Sparkles, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'

const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const MEALS_ORDER = ['breakfast','morning_snack','lunch','afternoon_snack','dinner']
const MEAL_LABEL: Record<string, string> = {
  breakfast: '🌅 Desayuno', morning_snack: '🍎 Merienda AM',
  lunch: '☀️ Almuerzo', afternoon_snack: '🥜 Merienda PM', dinner: '🌙 Cena',
}

export default function PlanPage() {
  const [plan, setPlan]           = useState<any>(null)
  const [items, setItems]         = useState<any[]>([])
  const [generating, setGen]      = useState(false)
  const [genList, setGenList]     = useState(false)
  const [error, setError]         = useState('')
  const [expandedDay, setExpDay]  = useState<number | null>(1)
  const [usage, setUsage]         = useState<any>(null)
  const isPremium = useAuthStore(s => s.isPremium)()

  const loadActivePlan = useCallback(async () => {
    const res = await fetch('/api/meal-plans?active=true')
    const { plan: p, items: i } = await res.json()
    setPlan(p || null)
    setItems(i || [])
  }, [])

  useEffect(() => { loadActivePlan() }, [loadActivePlan])

  async function generatePlan() {
    setGen(true); setError('')
    try {
      const res = await fetch('/api/ai/generate-plan', { method: 'POST' })
      const data = await res.json()
      if (res.status === 402) { setError(data.message); return }
      if (data.error) { setError(data.error); return }
      await loadActivePlan()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGen(false)
    }
  }

  async function generateShoppingList() {
    if (!plan) return
    setGenList(true)
    const res = await fetch('/api/ai/generate-shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id }),
    })
    const data = await res.json()
    setGenList(false)
    if (data.error) { setError(data.error); return }
    window.location.href = '/canasta'
  }

  const itemsByDay: Record<number, any[]> = {}
  items.forEach(item => {
    if (!itemsByDay[item.day_number]) itemsByDay[item.day_number] = []
    itemsByDay[item.day_number].push(item)
  })

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Plato Semanal</h1>
          <p className="text-sm text-slate-500">Plan de comidas personalizado con IA</p>
        </div>
        <div className="flex gap-2">
          {plan && (
            <Button variant="secondary" onClick={generateShoppingList} loading={genList}>
              <ShoppingCart className="h-4 w-4" /> Generar canasta
            </Button>
          )}
          <Button onClick={generatePlan} loading={generating}>
            <Sparkles className="h-4 w-4" />
            {plan ? 'Regenerar plan' : 'Generar plan con IA'}
          </Button>
        </div>
      </div>

      {!isPremium && (
        <div className="mb-4">
          <FreeLimitWarning used={usage?.plan_generations || 0} max={3} label="generaciones de plan" />
        </div>
      )}

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}

      {generating && (
        <Card className="mb-6">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 animate-pulse">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">Generando tu plan personalizado…</p>
              <p className="text-sm text-slate-400 mt-1">La IA está creando 7 días de comidas adaptadas a tu perfil</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!plan && !generating && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Genera tu primer plan</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">La IA crea un plan de 7 días personalizado según tu objetivo, restricciones y presupuesto.</p>
            </div>
            <Button onClick={generatePlan} size="lg">
              <Sparkles className="h-5 w-5" /> Generar plan con IA
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && !generating && (
        <>
          <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{plan.name}</p>
                  <p className="text-sm text-slate-500">{plan.start_date} → {plan.end_date}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{Math.round(parseFloat(plan.avg_daily_calories || 0))}</p>
                    <p className="text-xs text-slate-400">kcal/día</p>
                  </div>
                  {plan.estimated_weekly_cost_usd && (
                    <div>
                      <p className="text-lg font-bold text-slate-700">${parseFloat(plan.estimated_weekly_cost_usd).toFixed(0)}</p>
                      <p className="text-xs text-slate-400">est. semana</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {DAYS.map((dayName, idx) => {
            const dayNum  = idx + 1
            const dayItems = (itemsByDay[dayNum] || []).sort(
              (a, b) => MEALS_ORDER.indexOf(a.meal_type) - MEALS_ORDER.indexOf(b.meal_type)
            )
            const dayCalories = dayItems.reduce((s, i) => s + parseFloat(i.calories || 0), 0)
            const expanded = expandedDay === dayNum

            return (
              <Card key={dayNum} className="mb-3 overflow-hidden">
                <button className="w-full" onClick={() => setExpDay(expanded ? null : dayNum)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">{dayNum}</div>
                        <CardTitle>{dayName}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{Math.round(dayCalories)} kcal</span>
                        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {expanded && (
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {dayItems.map(item => (
                        <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-0.5">{MEAL_LABEL[item.meal_type]}</p>
                              <p className="font-semibold text-slate-800">{item.recipe_name}</p>
                            </div>
                            <Badge variant="secondary">{Math.round(parseFloat(item.calories || 0))} kcal</Badge>
                          </div>
                          {item.description && <p className="text-sm text-slate-500 mb-2">{item.description}</p>}
                          <div className="flex gap-3 text-xs text-slate-400 mb-2">
                            <span>P: {Math.round(parseFloat(item.protein_g || 0))}g</span>
                            <span>C: {Math.round(parseFloat(item.carbs_g || 0))}g</span>
                            <span>G: {Math.round(parseFloat(item.fat_g || 0))}g</span>
                          </div>
                          {((item.ingredients as any[])?.length > 0 || item.quick_instructions) && (
                            <details className="mt-1">
                              <summary className="text-xs text-emerald-600 cursor-pointer font-medium">Ver receta completa</summary>
                              <div className="mt-3 flex flex-col gap-3">
                                {(item.ingredients as any[])?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-600 mb-1.5">🛒 Ingredientes</p>
                                    <ul className="flex flex-col gap-1">
                                      {(item.ingredients as any[]).map((ing: any, k: number) => (
                                        <li key={k} className="flex items-center justify-between text-xs text-slate-600 bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                                          <span>{ing.name}</span>
                                          <span className="font-semibold text-slate-800">{ing.quantity} {ing.unit}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {item.quick_instructions && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-600 mb-1.5">👨‍🍳 Preparación</p>
                                    <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                                      {item.quick_instructions.split(/\d+\.\s+/).filter(Boolean).map((step: string, k: number) => (
                                        <p key={k} className="flex gap-2">
                                          <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">{k + 1}</span>
                                          <span>{step.trim()}</span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
