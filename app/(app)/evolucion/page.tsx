'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { todayISO } from '@/lib/utils/date'
import { Plus, TrendingDown, TrendingUp, Minus, Scale } from 'lucide-react'

export default function EvolucionPage() {
  const metrics = useAuthStore(s => s.metrics)
  const [data, setData]     = useState<any[]>([])
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({ logged_date: todayISO(), weight_kg: '', body_fat_pct: '', notes: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/body-metrics?limit=60')
    const { metrics: m } = await res.json()
    setData((m || []).reverse())
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.weight_kg) return
    setSaving(true)
    await fetch('/api/body-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logged_date:  form.logged_date,
        weight_kg:    parseFloat(form.weight_kg),
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        notes:        form.notes || null,
      }),
    })
    await load()
    setForm({ logged_date: todayISO(), weight_kg: '', body_fat_pct: '', notes: '' })
    setSaving(false)
    setOpen(false)
  }

  const latest  = data[data.length - 1]
  const prev    = data[data.length - 2]
  const diff    = latest && prev ? (parseFloat(latest.weight_kg) - parseFloat(prev.weight_kg)) : null
  const initial = data[0]
  const totalDiff = latest && initial ? (parseFloat(latest.weight_kg) - parseFloat(initial.weight_kg)) : null
  const target = metrics?.target_weight_kg ? Number(metrics.target_weight_kg) || null : null

  const chartData = data.map(d => ({
    date:   d.logged_date,
    peso:   parseFloat(d.weight_kg),
    grasa:  d.body_fat_pct ? parseFloat(d.body_fat_pct) : undefined,
  }))

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mi Evolución</h1>
          <p className="text-sm text-slate-500">Seguimiento de peso y composición corporal</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Registrar medición</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva medición</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={form.logged_date} onChange={e => setForm(f => ({ ...f, logged_date: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" placeholder="70.5" value={form.weight_kg}
                  onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>% Grasa corporal <span className="text-slate-400 text-xs font-normal">opcional</span></Label>
                <Input type="number" step="0.1" placeholder="18.5" value={form.body_fat_pct}
                  onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Notas <span className="text-slate-400 text-xs font-normal">opcional</span></Label>
                <Input placeholder="Ej: después de vacaciones..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button onClick={save} loading={saving} disabled={!form.weight_kg}>
                Guardar medición
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <StatCard
          label="Peso actual"
          value={latest ? `${parseFloat(latest.weight_kg).toFixed(1)} kg` : '—'}
          icon={<Scale className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          label="Vs. anterior"
          value={diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg` : '—'}
          icon={diff === null ? <Minus className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          color={diff === null ? 'slate' : diff < 0 ? 'emerald' : 'red'}
        />
        <StatCard
          label="Cambio total"
          value={totalDiff !== null ? `${totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(1)} kg` : '—'}
          icon={totalDiff === null ? <Minus className="h-4 w-4" /> : totalDiff < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          color={totalDiff === null ? 'slate' : totalDiff < 0 ? 'emerald' : 'red'}
        />
        <StatCard
          label="Peso objetivo"
          value={target ? `${target.toFixed(1)} kg` : '—'}
          icon={<Scale className="h-4 w-4" />}
          color="blue"
        />
      </div>

      {/* Gráfico de peso */}
      {data.length > 1 ? (
        <Card className="mb-6">
          <CardHeader><CardTitle>Evolución del peso</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }}
                  domain={['auto', 'auto']} unit=" kg" width={52} />
                <Tooltip
                  formatter={(v: any) => [`${parseFloat(v).toFixed(1)} kg`, 'Peso']}
                  labelFormatter={l => `Fecha: ${l}`}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                {target && (
                  <Line type="monotone" dataKey={() => target} stroke="#94a3b8"
                    strokeDasharray="6 3" dot={false} name="Objetivo" strokeWidth={1.5} />
                )}
                <Line type="monotone" dataKey="peso" stroke="#10b981"
                  strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Sin datos todavía</h2>
              <p className="text-sm text-slate-500 mt-1">Registra al menos 2 mediciones para ver tu gráfico de evolución.</p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Primera medición
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {data.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {[...data].reverse().map((m, i) => {
                const prev = [...data].reverse()[i + 1]
                const d = prev ? parseFloat(m.weight_kg) - parseFloat(prev.weight_kg) : null
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-xl hover:bg-slate-50 px-3 py-2.5 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{m.logged_date}</p>
                      {m.notes && <p className="text-xs text-slate-400">{m.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      {m.body_fat_pct && (
                        <span className="text-xs text-slate-400">{parseFloat(m.body_fat_pct).toFixed(1)}% grasa</span>
                      )}
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">{parseFloat(m.weight_kg).toFixed(1)} kg</p>
                        {d !== null && (
                          <p className={`text-xs ${d < 0 ? 'text-emerald-500' : d > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {d > 0 ? '+' : ''}{d.toFixed(1)} kg
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue:    'bg-blue-50 text-blue-600',
    red:     'bg-red-50 text-red-500',
    slate:   'bg-slate-100 text-slate-500',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${colors[color]}`}>{icon}</div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </CardContent>
    </Card>
  )
}
