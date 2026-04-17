'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { useUserData } from '@/hooks/use-user-data'
import { useAuthStore } from '@/stores/auth-store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useUserData()
  const router  = useRouter()
  const loaded  = useAuthStore(s => s.loaded)
  const profile = useAuthStore(s => s.profile)

  useEffect(() => {
    if (loaded && profile && !profile.onboarding_completed) {
      router.replace('/onboarding')
    }
  }, [loaded, profile])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
