'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Crown, Users, TrendingUp, Search, Crown as CrownIcon, UserX } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'

export default function AdminPage() {
  const router    = useRouter()
  const profile   = useAuthStore(s => s.profile)
  const loaded    = useAuthStore(s => s.loaded)

  const [users, setUsers]       = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch]     = useState('')
  const [loading, setLoad]      = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [notes, setNotes]       = useState('')
  const [saving, setSave]       = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    if (!loaded) return
    if (!profile?.is_admin) { router.replace('/dashboard'); return }
    loadUsers()
  }, [loaded, profile])

  useEffect(() => {
    if (!search.trim()) { setFiltered(users); return }
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    ))
  }, [search, users])

  async function loadUsers() {
    setLoad(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) { setMsg(`Error ${res.status}: ${data.error || 'desconocido'}`); return }
      setUsers(data.users || [])
      setFiltered(data.users || [])
    } catch (e: any) {
      setMsg(`Error de conexión: ${e?.message}`)
    } finally {
      setLoad(false)
    }
  }

  async function changePlan(userId: string, plan: 'free' | 'premium') {
    setSave(true)
    setMsg('')
    const res = await fetch('/api/admin/update-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, plan, notes }),
    })
    const data = await res.json()
    if (data.success) {
      setMsg(`Plan cambiado a ${plan} correctamente`)
      await loadUsers()
      setSelected(null)
      setNotes('')
    } else {
      setMsg(`Error: ${data.error}`)
    }
    setSave(false)
  }

  const premiumCount = users.filter(u => u.plan === 'premium').length
  const freeCount    = users.filter(u => u.plan === 'free').length
  const totalCount   = users.length

  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
              <p className="text-sm text-slate-500">Usuarios totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Crown className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{premiumCount}</p>
              <p className="text-sm text-slate-500">Usuarios premium</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {totalCount > 0 ? Math.round((premiumCount / totalCount) * 100) : 0}%
              </p>
              <p className="text-sm text-slate-500">Tasa de conversión</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Gestión de usuarios</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por email o nombre..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {msg && (
            <div className={`mb-4 rounded-xl p-3 text-sm ${msg.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {msg}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Usuario</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Plan</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Estado</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Registrado</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Último acceso</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Notas</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-slate-800">{u.full_name || '—'}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {u.plan === 'premium'
                          ? <Badge variant="premium"><Crown className="h-3 w-3" /> Premium</Badge>
                          : <Badge variant="free">Gratis</Badge>
                        }
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={u.is_active ? 'default' : 'secondary'}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs">
                        {u.created_at ? formatDate(u.created_at) : '—'}
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs">
                        {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Nunca'}
                      </td>
                      <td className="py-3 px-2 text-slate-400 text-xs max-w-32 truncate" title={u.sub_notes || ''}>
                        {u.sub_notes || '—'}
                      </td>
                      <td className="py-3 px-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelected(u); setNotes(u.sub_notes || '') }}>
                          Gestionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-slate-400 py-8">No se encontraron usuarios</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de gestión de plan */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar plan de usuario</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4">
              {/* Info del usuario */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">{selected.full_name || selected.email}</p>
                <p className="text-sm text-slate-500">{selected.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-600">Plan actual:</span>
                  {selected.plan === 'premium'
                    ? <Badge variant="premium"><Crown className="h-3 w-3" /> Premium</Badge>
                    : <Badge variant="free">Gratis</Badge>
                  }
                </div>
              </div>

              {/* Notas */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Motivo / Notas (visible solo para admin)
                </label>
                <Input placeholder="Ej: Pagó transferencia 15/04, código PREM25..." value={notes}
                  onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Botones de cambio */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-600">Cambiar plan a:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => changePlan(selected.id, 'premium')}
                    disabled={saving || selected.plan === 'premium'}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all disabled:opacity-50 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer disabled:cursor-not-allowed">
                    <CrownIcon className="h-6 w-6 text-amber-500" />
                    <span className="font-semibold text-amber-700">Premium</span>
                    <span className="text-xs text-amber-500">Acceso completo</span>
                    {saving && selected.plan !== 'premium' && <span className="text-xs">Guardando…</span>}
                  </button>
                  <button
                    onClick={() => changePlan(selected.id, 'free')}
                    disabled={saving || selected.plan === 'free'}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all disabled:opacity-50 border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed">
                    <UserX className="h-6 w-6 text-slate-400" />
                    <span className="font-semibold text-slate-600">Gratuito</span>
                    <span className="text-xs text-slate-400">Funciones limitadas</span>
                    {saving && selected.plan !== 'free' && <span className="text-xs">Guardando…</span>}
                  </button>
                </div>
              </div>

              {selected.sub_updated_at && (
                <p className="text-xs text-slate-400 text-center">
                  Último cambio: {formatDate(selected.sub_updated_at)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
