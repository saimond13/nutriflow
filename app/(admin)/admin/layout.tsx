'use client'
import { useUserData } from '@/hooks/use-user-data'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useUserData()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Panel de Administración</h1>
          <span className="text-sm text-slate-400">NutriFlow</span>
        </div>
      </div>
      <div className="max-w-6xl mx-auto">
        {children}
      </div>
    </div>
  )
}
