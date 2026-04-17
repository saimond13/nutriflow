'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, User, Target, Utensils, LogOut, ChevronRight, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Bajar de peso', maintain: 'Mantener peso',
  gain_muscle: 'Ganar músculo', body_recomposition: 'Recomposición corporal',
}
const DIET_LABELS: Record<string, string> = {
  omnivore: 'Omnívoro', vegetarian: 'Vegetariano', vegan: 'Vegano',
  keto: 'Keto / Low carb', mediterranean: 'Mediterráneo', paleo: 'Paleo', gluten_free: 'Sin gluten',
}
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentario', light: 'Ligero', moderate: 'Moderado',
  active: 'Activo', very_active: 'Muy activo',
}

export default function PerfilPage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const profile    = useAuthStore(s => s.profile)
  const metrics    = useAuthStore(s => s.metrics)
  const prefs      = useAuthStore(s => s.prefs)
  const subscription = useAuthStore(s => s.subscription)
  const isPremium  = useAuthStore(s => s.isPremium)()
  const [loggingOut, setOut] = useState(false)

  async function handleSignOut() {
    setOut(true)
    await signOut()
    router.push('/login')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mi Perfil</h1>

      {/* Info del usuario */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 shrink-0">
              <User className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{profile?.full_name || 'Usuario'}</p>
              <p className="text-sm text-slate-500 truncate">{profile?.email}</p>
            </div>
            {isPremium
              ? <Badge variant="premium"><Crown className="h-3 w-3" /> Premium</Badge>
              : <Badge variant="free">Gratis</Badge>
            }
          </div>
        </CardContent>
      </Card>

      {/* Plan y suscripción */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Suscripción</CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          {isPremium ? (
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-amber-500" />
                <p className="font-semibold text-amber-700">Plan Premium activo</p>
              </div>
              <p className="text-sm text-slate-500">Tienes acceso completo a todas las funciones de NutriFlow.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-medium text-slate-700">Plan Gratuito</p>
                <p className="text-sm text-slate-500 mt-1">Límites: 3 planes/mes, 20 mensajes/mes, 10 análisis IA/mes.</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="font-semibold text-emerald-700 mb-2">¿Quieres premium?</p>
                <p className="text-sm text-slate-600 mb-3">
                  Contacta al equipo de NutriFlow para activar tu plan premium con planes ilimitados, chat sin límites y más.
                </p>
                <a href="mailto:heraldoh13@gmail.com?subject=Solicitud%20Premium%20NutriFlow"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors">
                  <Crown className="h-4 w-4" /> Solicitar Premium
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mis métricas */}
      {metrics && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Mis métricas</CardTitle></CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Objetivo" value={GOAL_LABELS[metrics.goal_type as string] || metrics.goal_type as string} />
              <InfoRow label="Actividad" value={ACTIVITY_LABELS[metrics.activity_level as string] || metrics.activity_level as string} />
              <InfoRow label="Peso actual" value={metrics.weight_kg ? `${Number(metrics.weight_kg).toFixed(1)} kg` : '—'} />
              <InfoRow label="Peso objetivo" value={metrics.target_weight_kg ? `${Number(metrics.target_weight_kg).toFixed(1)} kg` : '—'} />
              <InfoRow label="Calorías/día" value={metrics.calorie_target ? `${metrics.calorie_target} kcal` : '—'} />
              <InfoRow label="Proteínas" value={metrics.protein_target_g ? `${metrics.protein_target_g}g` : '—'} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferencias alimentarias */}
      {prefs && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="h-4 w-4" /> Preferencias</CardTitle></CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Dieta" value={DIET_LABELS[prefs.diet_type as string] || prefs.diet_type as string} />
              <InfoRow label="Complejidad" value={prefs.meal_complexity as string || '—'} />
              <InfoRow label="Personas" value={prefs.people_count ? `${prefs.people_count}` : '—'} />
              <InfoRow label="Presupuesto" value={prefs.weekly_budget_usd ? `$${prefs.weekly_budget_usd}/semana` : '—'} />
              {prefs.region && <InfoRow label="Región" value={prefs.region as string} />}
              {(prefs.allergies as string[])?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-slate-400 mb-1">Alergias</p>
                  <div className="flex flex-wrap gap-1">
                    {(prefs.allergies as string[]).map(a => (
                      <span key={a} className="rounded-full bg-red-50 text-red-600 text-xs px-2 py-0.5">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <Card className="mb-4">
        <CardContent className="p-2">
          <Link href="/onboarding"
            className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors">
            <span className="text-sm font-medium text-slate-700">Actualizar mi perfil nutricional</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleSignOut} loading={loggingOut} className="w-full text-red-500 border-red-200 hover:bg-red-50">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </Button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-medium text-slate-700 capitalize">{value || '—'}</p>
    </div>
  )
}
