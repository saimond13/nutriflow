'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { BarcodeScanner } from '@/components/shared/barcode-scanner'
import { todayISO, formatDate } from '@/lib/utils/date'
import { Plus, Sparkles, Trash2, ChevronLeft, ChevronRight, Flame, Search, Barcode, Loader2, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const MEAL_TYPES = [
  { value: 'breakfast',       label: '🌅 Desayuno' },
  { value: 'morning_snack',   label: '🍎 Merienda AM' },
  { value: 'lunch',           label: '☀️ Almuerzo' },
  { value: 'afternoon_snack', label: '🥜 Merienda PM' },
  { value: 'dinner',          label: '🌙 Cena' },
  { value: 'other',           label: '🍽️ Otro' },
]

type Tab = 'ai' | 'search' | 'manual'

export default function RegistroPage() {
  const metrics = useAuthStore(s => s.metrics)
  const [date, setDate]         = useState(todayISO())
  const [entries, setEntries]   = useState<any[]>([])
  const [open, setOpen]         = useState(false)
  const [tab, setTab]           = useState<Tab>('ai')
  const [mealType, setMealType] = useState('lunch')

  // AI parser
  const [aiText, setAiText]       = useState('')
  const [aiLoading, setAiL]       = useState(false)
  const [aiItems, setAiItems]     = useState<any[]>([])
  const [recipeMode, setRecipeMode] = useState(false)
  const [recipeServings, setRecipeServings] = useState(4)

  // Búsqueda OpenFoodFacts
  const [searchQ, setSearchQ]             = useState('')
  const [searching, setSearching]         = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Escáner código de barras
  const [scanning, setScanning]           = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeResult, setBarcodeResult] = useState<any | null>(null)
  const [barcodeError, setBarcodeError]   = useState('')

  // Formulario manual
  const [form, setForm] = useState({ food_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', quantity_g: '100' })
  const [saving, setSaving] = useState(false)

  const loadEntries = useCallback(async () => {
    const res = await fetch(`/api/food-entries?date=${date}`)
    const { entries: e } = await res.json()
    setEntries(e || [])
  }, [date])

  useEffect(() => { loadEntries() }, [loadEntries])

  // Buscar en OpenFoodFacts con debounce de 400ms
  useEffect(() => {
    if (tab !== 'search') return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return }

    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(searchQ)}`)
        const data = await res.json()
        setSearchResults(data.items || [])
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQ, tab])

  async function handleBarcodeDetected(code: string) {
    setScanning(false)
    setBarcodeLoading(true)
    setBarcodeError('')
    setBarcodeResult(null)
    try {
      const res = await fetch(`/api/food-barcode?code=${code}`)
      const data = await res.json()
      if (data.error) { setBarcodeError(data.error); return }
      setBarcodeResult(data.item)
    } finally {
      setBarcodeLoading(false)
    }
  }

  const [aiError, setAiError] = useState('')

  async function parseWithAI() {
    if (!aiText.trim()) return
    setAiL(true); setAiItems([]); setAiError('')
    try {
      const res = await fetch('/api/ai/parse-food', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, servings: recipeMode ? recipeServings : 1 }),
      })
      const data = await res.json()
      if (data.error === 'limit_reached') {
        setAiError('Límite mensual de análisis IA alcanzado (plan gratuito: 10/mes).')
      } else if (data.items?.length > 0) {
        setAiItems(data.items)
      } else if (data.error) {
        setAiError('No se pudo analizar. Intenta describir el alimento más simplemente.')
      } else {
        setAiError('No se identificaron alimentos. Intenta ser más específico.')
      }
    } catch {
      setAiError('Error de conexión. Verifica tu internet e intenta de nuevo.')
    } finally {
      setAiL(false)
    }
  }

  async function saveEntry(entry: any) {
    setSaving(true)
    await fetch('/api/food-entries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logged_date:   date,
        meal_type:     entry.meal_type || mealType,
        food_name:     entry.food_name,
        quantity_g:    parseFloat(entry.quantity_g || '100'),
        calories:      parseFloat(entry.calories || '0'),
        protein_g:     parseFloat(entry.protein_g || '0'),
        carbs_g:       parseFloat(entry.carbs_g || '0'),
        fat_g:         parseFloat(entry.fat_g || '0'),
        source:        entry.source || 'manual',
        portion_label: entry.portion_label || null,
      }),
    })
    await loadEntries()
    setForm({ food_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', quantity_g: '100' })
    setAiText(''); setAiItems([])
    setSearchQ(''); setSearchResults([])
    setBarcodeResult(null); setBarcodeError('')
    setSaving(false); setOpen(false)
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/food-entries?id=${id}`, { method: 'DELETE' })
    await loadEntries()
  }

  function changeDate(days: number) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const totals = {
    calories: entries.reduce((s, e) => s + parseFloat(e.calories || 0), 0),
    protein:  entries.reduce((s, e) => s + parseFloat(e.protein_g || 0), 0),
    carbs:    entries.reduce((s, e) => s + parseFloat(e.carbs_g || 0), 0),
    fat:      entries.reduce((s, e) => s + parseFloat(e.fat_g || 0), 0),
  }
  const calTarget = Number(metrics?.calorie_target) || 2000
  const calPct    = Math.min(100, Math.round((totals.calories / calTarget) * 100))

  const byMeal: Record<string, any[]> = {}
  entries.forEach(e => { if (!byMeal[e.meal_type]) byMeal[e.meal_type] = []; byMeal[e.meal_type].push(e) })

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Scanner de código de barras (pantalla completa) */}
      {scanning && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setScanning(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Mi Registro</h1>
          <p className="text-sm text-slate-500">Registra lo que comes cada día</p>
        </div>

        <Dialog open={open} onOpenChange={o => {
          setOpen(o)
          if (!o) { setTab('ai'); setAiItems([]); setAiError(''); setSearchResults([]); setBarcodeResult(null); setRecipeMode(false) }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Agregar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar alimento</DialogTitle></DialogHeader>

            {/* Tipo de comida (siempre visible) */}
            <div className="flex flex-col gap-1.5 mb-1">
              <Label>Tipo de comida</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-4">
              {([
                { id: 'ai',     icon: Sparkles, label: 'IA'     },
                { id: 'search', icon: Search,   label: 'Buscar' },
                { id: 'manual', icon: Plus,     label: 'Manual' },
              ] as { id: Tab; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all',
                    tab === id ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'
                  )}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* ── TAB: IA ── */}
            {tab === 'ai' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Registrar con IA
                </p>
                <p className="text-xs text-slate-500 mb-3">Escribe en lenguaje natural lo que comiste</p>
                {/* Toggle modo receta */}
                <button
                  onClick={() => setRecipeMode(m => !m)}
                  className={cn(
                    'self-start flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all mb-2',
                    recipeMode
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'
                  )}>
                  🍲 Modo receta
                </button>

                {recipeMode && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500">Porciones que rinde:</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {[1,2,3,4,5,6,8,10].map(n => (
                        <button key={n} onClick={() => setRecipeServings(n)}
                          className={cn(
                            'w-7 h-7 rounded-lg text-xs font-medium border transition-all',
                            recipeServings === n
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                          )}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder={recipeMode ? 'Pegá los ingredientes de tu receta…' : 'Ej: 2 huevos revueltos con tostada'}
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !recipeMode && parseWithAI()} />
                  <Button variant="secondary" onClick={parseWithAI} loading={aiLoading} size="sm">Analizar</Button>
                </div>
                {aiError && (
                  <p className="mt-3 text-xs text-red-500 text-center">{aiError}</p>
                )}
                {aiItems.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {aiItems.map((item, i) => (
                      <FoodResultRow key={i} item={item} onSave={() => saveEntry({ ...item, meal_type: mealType })} saving={saving} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: BÚSQUEDA ── */}
            {tab === 'search' && (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar alimento (ej: yogur griego, avena...)"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>

                {/* Botón escanear código de barras */}
                <button
                  onClick={() => { setOpen(false); setTimeout(() => setScanning(true), 150) }}
                  className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left w-full">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                    <ScanLine className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Escanear código de barras</p>
                    <p className="text-xs text-slate-400">Apunta la cámara al código del producto</p>
                  </div>
                  <Barcode className="h-4 w-4 text-slate-300 ml-auto shrink-0" />
                </button>

                {searching && (
                  <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Buscando en OpenFoodFacts…</span>
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-400 px-1">{searchResults.length} resultados encontrados</p>
                    {searchResults.map((item, i) => (
                      <FoodResultRow key={i} item={item} onSave={() => saveEntry({ ...item, meal_type: mealType })} saving={saving} />
                    ))}
                  </div>
                )}

                {!searching && searchQ.length >= 2 && searchResults.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">
                    Sin resultados para "{searchQ}"
                  </p>
                )}
              </div>
            )}

            {/* ── TAB: MANUAL ── */}
            {tab === 'manual' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Nombre del alimento</Label>
                  <Input placeholder="Pechuga de pollo a la plancha" value={form.food_name}
                    onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['calories','Calorías (kcal)','200'],
                    ['quantity_g','Cantidad (g)','100'],
                    ['protein_g','Proteínas (g)','25'],
                    ['carbs_g','Carbohidratos (g)','30'],
                  ] as [string,string,string][]).map(([k,l,p]) => (
                    <div key={k} className="flex flex-col gap-1.5">
                      <Label>{l}</Label>
                      <Input type="number" placeholder={p} value={(form as any)[k]}
                        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Grasas (g)</Label>
                    <Input type="number" placeholder="8" value={form.fat_g}
                      onChange={e => setForm(f => ({ ...f, fat_g: e.target.value }))} />
                  </div>
                </div>
                <Button
                  onClick={() => saveEntry({ ...form, meal_type: mealType })}
                  loading={saving}
                  disabled={!form.food_name || !form.calories}>
                  Guardar entrada
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Modal resultado de código de barras ── */}
      {(barcodeResult || barcodeLoading || barcodeError) && (
        <Dialog open={true} onOpenChange={() => { setBarcodeResult(null); setBarcodeError(''); setOpen(true) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="h-4 w-4" /> Producto encontrado
              </DialogTitle>
            </DialogHeader>

            {barcodeLoading && (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="text-sm text-slate-500">Buscando producto…</span>
              </div>
            )}

            {barcodeError && (
              <div className="py-4 text-center">
                <p className="text-sm text-red-600 mb-4">{barcodeError}</p>
                <Button variant="secondary" onClick={() => { setBarcodeError(''); setScanning(true) }}>
                  Escanear de nuevo
                </Button>
              </div>
            )}

            {barcodeResult && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="font-semibold text-slate-800 mb-1">{barcodeResult.food_name}</p>
                  <p className="text-xs text-slate-500 mb-3">Valores por 100g</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {([['kcal', barcodeResult.calories], ['Prot', `${barcodeResult.protein_g}g`], ['Carb', `${barcodeResult.carbs_g}g`], ['Gras', `${barcodeResult.fat_g}g`]] as [string,any][]).map(([l,v]) => (
                      <div key={l} className="rounded-lg bg-white p-2 border border-emerald-100">
                        <p className="text-xs text-slate-400">{l}</p>
                        <p className="font-bold text-slate-700 text-sm">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo de comida</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => { saveEntry({ ...barcodeResult, meal_type: mealType }); setBarcodeResult(null) }}
                  loading={saving}>
                  Guardar en mi registro
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Navegación de fecha ── */}
      <Card className="mb-4">
        <CardContent className="p-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="font-semibold text-slate-700">{formatDate(new Date(date + 'T12:00:00'), "EEEE dd 'de' MMMM")}</p>
            {date === todayISO() && <Badge variant="default" className="text-xs">Hoy</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)} disabled={date >= todayISO()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* ── Resumen del día ── */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold text-slate-800">
                {Math.round(totals.calories)}{' '}
                <span className="text-slate-400 font-normal text-sm">/ {calTarget} kcal</span>
              </span>
            </div>
            <span className="text-sm text-slate-500">{calPct}%</span>
          </div>
          <Progress value={calPct} />
          <div className="grid grid-cols-3 gap-3 mt-3 text-center text-sm">
            <div><p className="text-slate-400 text-xs">Proteínas</p><p className="font-semibold text-slate-700">{Math.round(totals.protein)}g</p></div>
            <div><p className="text-slate-400 text-xs">Carbos</p><p className="font-semibold text-slate-700">{Math.round(totals.carbs)}g</p></div>
            <div><p className="text-slate-400 text-xs">Grasas</p><p className="font-semibold text-slate-700">{Math.round(totals.fat)}g</p></div>
          </div>
        </CardContent>
      </Card>

      {/* ── Entradas por tipo de comida ── */}
      {MEAL_TYPES.map(({ value: mt, label }) => {
        const items = byMeal[mt] || []
        return (
          <Card key={mt} className="mb-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{label}</CardTitle>
                {items.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {Math.round(items.reduce((s, i) => s + parseFloat(i.calories || 0), 0))} kcal
                  </span>
                )}
              </div>
            </CardHeader>
            {items.length > 0 && (
              <CardContent>
                <div className="flex flex-col gap-1.5">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg hover:bg-slate-50 px-2 py-2 group">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium text-slate-700 truncate">{item.food_name}</p>
                        <p className="text-xs text-slate-400">
                          {Math.round(parseFloat(item.calories))} kcal · P:{Math.round(parseFloat(item.protein_g))}g C:{Math.round(parseFloat(item.carbs_g))}g G:{Math.round(parseFloat(item.fat_g))}g
                        </p>
                      </div>
                      <button onClick={() => deleteEntry(item.id)}
                        className="shrink-0 p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 active:bg-red-50 active:text-red-500 transition-all md:opacity-0 md:group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function FoodResultRow({ item, onSave, saving }: { item: any; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white border border-slate-100 p-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{item.food_name}</p>
        <p className="text-xs text-slate-400">
          {item.portion_label} · {Math.round(item.calories)} kcal · P:{item.protein_g}g C:{item.carbs_g}g G:{item.fat_g}g
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onSave} loading={saving}>
        Guardar
      </Button>
    </div>
  )
}
