'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import {
  Leaf, LayoutDashboard, BookOpen, CalendarDays, ShoppingCart,
  TrendingUp, MessageSquare, User, LogOut, Crown, Shield, Timer, Menu, X,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Inicio',             icon: LayoutDashboard },
  { href: '/registro',  label: 'Mi Registro',         icon: BookOpen        },
  { href: '/plan',      label: 'Plato Semanal',       icon: CalendarDays    },
  { href: '/ayuno',     label: 'Ayuno',               icon: Timer           },
  { href: '/canasta',   label: 'Canasta Inteligente', icon: ShoppingCart    },
  { href: '/evolucion', label: 'Mi Evolución',        icon: TrendingUp      },
  { href: '/asistente', label: 'NutriBot',            icon: MessageSquare   },
]

export function Sidebar() {
  const pathname    = usePathname()
  const router      = useRouter()
  const { signOut } = useClerk()
  const profile     = useAuthStore(s => s.profile)
  const isPremium   = useAuthStore(s => s.isPremium)()
  const isAdmin     = profile?.is_admin
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shrink-0">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 leading-none">NutriFlow</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPremium ? '✨ Premium' : 'Plan gratuito'}
          </p>
        </div>
        <button
          className="ml-auto md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}>
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}

        {isAdmin && (
          <Link href="/admin" onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all mt-2',
              pathname.startsWith('/admin') ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'
            )}>
            <Shield className={cn('h-4 w-4 shrink-0', pathname.startsWith('/admin') ? 'text-amber-600' : 'text-slate-400')} />
            Panel Admin
            <Badge variant="premium" className="ml-auto text-[10px] px-1.5 py-0">Admin</Badge>
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-3 flex flex-col gap-1">
        <Link href="/perfil" onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
            pathname === '/perfil' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
          )}>
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{profile?.full_name || 'Mi Perfil'}</p>
            <p className="truncate text-xs text-slate-400">{profile?.email}</p>
          </div>
          {isPremium && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
        </Link>
        <button onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex h-full w-64 flex-col bg-white border-r border-slate-100 shrink-0">
        {navContent}
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-white border-b border-slate-100 px-4 py-3">
        <button onClick={() => setOpen(true)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <p className="font-bold text-slate-800 text-sm">NutriFlow</p>
        </div>
        <Link href="/perfil" className="ml-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <User className="h-4 w-4 text-emerald-600" />
          </div>
        </Link>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white shadow-xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
