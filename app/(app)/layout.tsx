'use client'
import { Sidebar } from '@/components/layout/sidebar'
import { useUserData } from '@/hooks/use-user-data'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useUserData()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
