'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { computeUserTargets } from '@/lib/nutrition/tdee'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, ChevronRight, ChevronLeft, Target, Activity, Salad, ShoppingCart, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ── Tipos internos ─────────────────────────────────────────
interface OnboardingData {
  // Paso 1
  goal_type: string
  // Paso 2
  age: string; sex: string; height_cm: string; weight_kg: string; target_weight_kg: string
  // Paso 3
  activity_level: string; training_days_per_week: string
  // Paso 4
  diet_type: string; allergies: string; excluded_foods: string; meal_complexity: string
  // Paso 5
  people_count: string; weekly_budget_usd: string; region: string
}

const INITIAL: OnboardingData = {
  goal_type: '', age: '', sex: '', height_cm: '', weight_kg: '', target_weight_kg: '',
  activity_level: '', training_days_per_week: '3',
  diet_type: 'omnivore', allergies: '', excluded_foods: '', meal_complexity: 'simple',
  people_count: '1', weekly_budget_usd: '50', region: '',
}

const STEPS = [
  { icon: Target,       label: 'Objetivo'       },
  { icon: Activity,     label: 'Datos físicos'   },
  { icon: Activity,     label: 'Estilo de vida'  },
  { icon: Salad,        label: 'Alimentación'    },
  { icon: ShoppingCart, label: 'Personalizar'    },
]

// ── Opciones ──────────────────────────────────────────────
const GOALS = [
  { value: 'lose_weight',        label: 'Bajar de peso',     emoji: '⬇️', desc: 'Déficit calórico controlado' },
  { value: 'maintain',           label: 'Mantener peso',     emoji: '⚖️', desc: 'Mantenimiento y hábitos sanos' },
  { value: 'gain_muscle',        label: 'Ganar músculo',     emoji: '💪', desc: 'Superávit moderado con proteína' },
  { value: 'body_recomposition', label: 'Recomposición',     emoji: '🔄', desc: 'Bajar grasa y ganar músculo' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentario',  desc: 'Sin ejercicio' },
  { value: 'light',       label: 'Ligero',      desc: '1-3 días/semana' },
  { value: 'moderate',    label: 'Moderado',    desc: '3-5 días/semana' },
  { value: 'active',      label: 'Activo',      desc: '6-7 días/semana' },
  { value: 'very_active', label: 'Muy activo',  desc: 'Atleta / trabajo físico' },
]

const DIETS = [
  { value: 'omnivore',      label: 'Omnívoro' },
  { value: 'vegetarian',    label: 'Vegetariano' },
  { value: 'vegan',         label: 'Vegano' },
  { value: 'keto',          label: 'Keto / Low carb' },
  { value: 'mediterranean', label: 'Mediterráneo' },
  { value: 'paleo',         label: 'Paleo' },
  { value: 'gluten_free',   label: 'Sin gluten' },
]

const COMPLEXITIES = [
  { value: 'simple',    label: 'Simple',     desc: 'Recetas rápidas, pocos ingredientes' },
  { value: 'medium',    label: 'Intermedio', desc: 'Balance entre variedad y tiempo' },
  { value: 'elaborate', label: 'Elaborado',  desc: 'Recetas completas, más preparación' },
]

// ── Componente principal ───────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]   = useState(0)
  const [data, setData]   = useState<OnboardingData>(INITIAL)
  const [saving, setSave] = useState(false)
  const [error, setError] = useState('')

  function update(k: keyof OnboardingData, v: string) {
    setData(d => ({ ...d, [k]: v }))
  }

  function next() { if (step < 4) setStep(s => s + 1) }
  function prev() { if (step > 0) setStep(s => s - 1) }

  async function finish() {
    setSave(true)
    setError('')

    // Calcular TDEE y macros
    const targets = computeUserTargets({
      sex:            data.sex,
      weight_kg:      parseFloat(data.weight_kg),
      height_cm:      parseFloat(data.height_cm),
      age:            parseInt(data.age),
      activity_level: data.activity_level as any,
      goal_type:      data.goal_type as any,
    })

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age:                    data.age,
        sex:                    data.sex,
        height_cm:              data.height_cm,
        weight_kg:              data.weight_kg,
        target_weight_kg:       data.target_weight_kg || null,
        activity_level:         data.activity_level,
        goal_type:              data.goal_type,
        calorie_target:         targets.calorie_target,
        protein_g:              targets.protein_g,
        carbs_g:                targets.carbs_g,
        fat_g:                  targets.fat_g,
        diet_type:              data.diet_type,
        allergies:              data.allergies ? data.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        excluded_foods:         data.excluded_foods ? data.excluded_foods.split(',').map(s => s.trim()).filter(Boolean) : [],
        meal_complexity:        data.meal_complexity,
        people_count:           data.people_count,
        weekly_budget_usd:      data.weekly_budget_usd || null,
        region:                 data.region || null,
        training_days_per_week: data.training_days_per_week,
      }),
    })

    const result = await res.json()
    if (!res.ok || result.error) {
      setError('Error al guardar. Intenta de nuevo.')
      setSave(false)
      return
    }

    router.push('/dashboard')
  }

  const canNext = [
    !!data.goal_type,
    !!data.age && !!data.sex && !!data.height_cm && !!data.weight_kg,
    !!data.activity_level,
    !!data.diet_type && !!data.meal_complexity,
    !!data.people_count,
  ][step]

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="m-auto w-full max-w-2xl px-4 py-10">

        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">NutriFlow</span>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                i < step  && 'bg-emerald-500 text-white',
                i === step && 'bg-emerald-500 text-white ring-4 ring-emerald-100',
                i > step  && 'bg-slate-100 text-slate-400',
              )}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < 4 && <div className={cn('h-0.5 w-8 rounded', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />}
            </div>
          ))}
          <span className="ml-3 text-sm font-medium text-slate-600">{STEPS[step].label}</span>
        </div>

        {/* Card contenido */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">

          {/* PASO 1: Objetivo */}
          {step === 0 && (
            <div>
              <h2 className="mb-1 text-2xl font-bold text-slate-800">¿Cuál es tu objetivo?</h2>
              <p className="mb-6 text-slate-500">Esto define tus calorías y macros diarios.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => update('goal_type', g.value)}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                      data.goal_type === g.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                    )}>
                    <span className="text-3xl">{g.emoji}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{g.label}</p>
                      <p className="text-xs text-slate-500">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Datos físicos */}
          {step === 1 && (
            <div>
              <h2 className="mb-1 text-2xl font-bold text-slate-800">Tus datos físicos</h2>
              <p className="mb-6 text-slate-500">Necesarios para calcular tu metabolismo basal.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Edad</Label>
                  <Input type="number" placeholder="25" value={data.age} onChange={e => update('age', e.target.value)} min={10} max={100} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Sexo biológico</Label>
                  <div className="flex gap-2">
                    {[['male','Masculino'],['female','Femenino']].map(([v,l]) => (
                      <button key={v} onClick={() => update('sex', v)}
                        className={cn('flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all',
                          data.sex === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                        )}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Altura (cm)</Label>
                  <Input type="number" placeholder="170" value={data.height_cm} onChange={e => update('height_cm', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Peso actual (kg)</Label>
                  <Input type="number" placeholder="70" value={data.weight_kg} onChange={e => update('weight_kg', e.target.value)} step="0.1" />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Peso objetivo (kg) <span className="text-slate-400 font-normal text-xs">opcional</span></Label>
                  <Input type="number" placeholder="65" value={data.target_weight_kg} onChange={e => update('target_weight_kg', e.target.value)} step="0.1" />
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Estilo de vida */}
          {step === 2 && (
            <div>
              <h2 className="mb-1 text-2xl font-bold text-slate-800">Estilo de vida</h2>
              <p className="mb-6 text-slate-500">Tu nivel de actividad ajusta tu gasto calórico total.</p>
              <div className="flex flex-col gap-2 mb-6">
                {ACTIVITY_LEVELS.map(a => (
                  <button key={a.value} onClick={() => update('activity_level', a.value)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all',
                      data.activity_level === a.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                    )}>
                    <span className="font-medium text-slate-800">{a.label}</span>
                    <span className="text-sm text-slate-400">{a.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Días de entrenamiento por semana</Label>
                <Input type="number" min={0} max={7} value={data.training_days_per_week}
                  onChange={e => update('training_days_per_week', e.target.value)} />
              </div>
            </div>
          )}

          {/* PASO 4: Alimentación */}
          {step === 3 && (
            <div>
              <h2 className="mb-1 text-2xl font-bold text-slate-800">Preferencias alimentarias</h2>
              <p className="mb-6 text-slate-500">Usamos esto para adaptar todas tus recomendaciones.</p>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label>Tipo de dieta</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DIETS.map(d => (
                      <button key={d.value} onClick={() => update('diet_type', d.value)}
                        className={cn('rounded-xl border-2 py-2 px-3 text-sm font-medium transition-all',
                          data.diet_type === d.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                        )}>{d.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Alergias e intolerancias <span className="text-slate-400 font-normal text-xs">separadas por coma</span></Label>
                  <Input placeholder="gluten, lactosa, maní..." value={data.allergies} onChange={e => update('allergies', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Alimentos que no quieres incluir <span className="text-slate-400 font-normal text-xs">separados por coma</span></Label>
                  <Input placeholder="brócoli, hígado..." value={data.excluded_foods} onChange={e => update('excluded_foods', e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Complejidad de recetas</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {COMPLEXITIES.map(c => (
                      <button key={c.value} onClick={() => update('meal_complexity', c.value)}
                        className={cn('rounded-xl border-2 p-3 text-left transition-all',
                          data.meal_complexity === c.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'
                        )}>
                        <p className="font-medium text-slate-800 text-sm">{c.label}</p>
                        <p className="text-xs text-slate-400">{c.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 5: Personalización */}
          {step === 4 && (
            <div>
              <h2 className="mb-1 text-2xl font-bold text-slate-800">Últimos detalles</h2>
              <p className="mb-6 text-slate-500">Para ajustar tu plan y lista de compras.</p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>¿Para cuántas personas cocinas?</Label>
                  <div className="flex gap-2">
                    {['1','2','3','4','5+'].map(n => (
                      <button key={n} onClick={() => update('people_count', n === '5+' ? '5' : n)}
                        className={cn('flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-all',
                          data.people_count === (n === '5+' ? '5' : n)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                        )}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Presupuesto semanal aproximado (USD)</Label>
                  <Input type="number" placeholder="50" value={data.weekly_budget_usd} onChange={e => update('weekly_budget_usd', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>País o región <span className="text-slate-400 font-normal text-xs">para estimar costos</span></Label>
                  <Input placeholder="Argentina, México, España..." value={data.region} onChange={e => update('region', e.target.value)} />
                </div>

                {/* Resumen */}
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-semibold text-emerald-700">Tu perfil nutricional</p>
                  </div>
                  {data.age && data.weight_kg && data.height_cm && data.sex && data.activity_level && data.goal_type && (() => {
                    const t = computeUserTargets({
                      sex: data.sex, weight_kg: parseFloat(data.weight_kg),
                      height_cm: parseFloat(data.height_cm), age: parseInt(data.age),
                      activity_level: data.activity_level as any, goal_type: data.goal_type as any,
                    })
                    return (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-slate-500">Calorías/día</span><p className="font-bold text-emerald-700">{t.calorie_target} kcal</p></div>
                        <div><span className="text-slate-500">Proteínas</span><p className="font-bold text-slate-700">{t.protein_g}g</p></div>
                        <div><span className="text-slate-500">Carbohidratos</span><p className="font-bold text-slate-700">{t.carbs_g}g</p></div>
                        <div><span className="text-slate-500">Grasas</span><p className="font-bold text-slate-700">{t.fat_g}g</p></div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}

          {/* Navegación */}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={prev} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            {step < 4 ? (
              <Button onClick={next} disabled={!canNext}>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} loading={saving} disabled={!canNext}>
                <Sparkles className="h-4 w-4" /> Comenzar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
