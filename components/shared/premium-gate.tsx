'use client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Crown, Lock } from 'lucide-react'

interface PremiumGateProps {
  children: React.ReactNode
  feature?: string
  fallback?: React.ReactNode
}

export function PremiumGate({ children, feature, fallback }: PremiumGateProps) {
  const isPremium = useAuthStore(s => s.isPremium)()

  if (isPremium) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Función Premium</p>
            {feature && <p className="text-sm text-slate-500 mt-0.5">{feature}</p>}
          </div>
          <Button variant="premium" size="sm">
            <Lock className="h-3.5 w-3.5" />
            Activar Premium
          </Button>
        </div>
      </div>
    </div>
  )
}

// Componente de aviso inline para límites del plan free
export function FreeLimitWarning({ used, max, label }: { used: number; max: number; label: string }) {
  const remaining = max - used
  if (remaining > 3) return null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      <Crown className="h-4 w-4 shrink-0" />
      <span>
        {remaining === 0
          ? `Alcanzaste el límite de ${label} en el plan gratuito.`
          : `Te quedan ${remaining} ${label} gratuitos este mes.`}
      </span>
    </div>
  )
}
