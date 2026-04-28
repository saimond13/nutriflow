'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Share2, ShoppingCart, Tag } from 'lucide-react'

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  meats:      { label: 'Carnes y pescados', emoji: '🥩' },
  dairy:      { label: 'Lácteos y huevos',  emoji: '🥛' },
  vegetables: { label: 'Verduras',           emoji: '🥦' },
  fruits:     { label: 'Frutas',             emoji: '🍎' },
  grains:     { label: 'Cereales y pan',     emoji: '🌾' },
  legumes:    { label: 'Legumbres',          emoji: '🫘' },
  condiments: { label: 'Condimentos',        emoji: '🧂' },
  beverages:  { label: 'Bebidas',            emoji: '💧' },
  frozen:     { label: 'Congelados',         emoji: '❄️' },
  other:      { label: 'Otros',              emoji: '🛒' },
}
const CATEGORY_ORDER = ['meats','dairy','vegetables','fruits','grains','legumes','condiments','beverages','frozen','other']

export default function CanastaPage() {
  const [lists, setLists]       = useState<any[]>([])
  const [activeList, setActive] = useState<any>(null)
  const [items, setItems]       = useState<any[]>([])
  const [copied, setCopied]     = useState(false)

  const loadLists = useCallback(async () => {
    const res = await fetch('/api/shopping-lists')
    const { lists: l } = await res.json()
    setLists(l || [])
    if (l && l.length > 0) await loadItems(l[0])
  }, [])

  useEffect(() => { loadLists() }, [loadLists])

  async function loadItems(list: any) {
    setActive(list)
    const res = await fetch(`/api/shopping-lists?list_id=${list.id}`)
    const { items: i } = await res.json()
    setItems(i || [])
  }

  async function toggleItem(id: string, current: boolean) {
    await fetch('/api/shopping-lists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: id, is_purchased: !current }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_purchased: !current } : i))
  }

  async function shareList() {
    if (!activeList?.share_token) return
    const url = `${window.location.origin}/lista/${activeList.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const purchasedCount = items.filter(i => i.is_purchased).length
  const totalCount     = items.length
  const pct = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0

  const byCategory: Record<string, any[]> = {}
  items.forEach(item => {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  })

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Canasta Inteligente</h1>
          <p className="text-sm text-slate-500">Lista de compras generada desde tu plan semanal</p>
        </div>
        {activeList && (
          <Button variant="outline" onClick={shareList}>
            <Share2 className="h-4 w-4" />
            {copied ? '¡Copiado!' : 'Compartir'}
          </Button>
        )}
      </div>

      {/* Selector de listas */}
      {lists.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {lists.map(list => (
            <button key={list.id} onClick={() => loadItems(list)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
                activeList?.id === list.id ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-200'
              }`}>
              {new Date(list.created_at).toLocaleDateString('es', { day:'numeric', month:'short' })}
            </button>
          ))}
        </div>
      )}

      {!activeList && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <ShoppingCart className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Sin lista de compras</h2>
              <p className="text-sm text-slate-500 mt-1">Genera tu plan semanal y luego crea la canasta desde ahí.</p>
            </div>
            <Button variant="secondary" onClick={() => window.location.href = '/plan'}>
              Ir al Plato Semanal
            </Button>
          </CardContent>
        </Card>
      )}

      {activeList && (
        <>
          {/* Progreso */}
          <Card className="mb-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{activeList.name}</p>
                  {activeList.estimated_total_cost_usd && (
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Estimado: ${activeList.estimated_total_cost_usd} USD
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">{pct}%</p>
                  <p className="text-xs text-slate-400">{purchasedCount}/{totalCount} ítems</p>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              {pct === 100 && (
                <p className="mt-2 text-center text-sm font-medium text-emerald-600">¡Lista completa! 🎉</p>
              )}
            </CardContent>
          </Card>

          {/* Ítems por categoría */}
          {CATEGORY_ORDER.filter(cat => byCategory[cat]?.length > 0).map(cat => {
            const catItems = byCategory[cat]
            const catLabel = CATEGORY_LABELS[cat]
            const catPurchased = catItems.filter(i => i.is_purchased).length

            return (
              <Card key={cat} className="mb-3">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span>{catLabel.emoji}</span>
                      <span>{catLabel.label}</span>
                    </CardTitle>
                    <span className="text-xs text-slate-400">{catPurchased}/{catItems.length}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1.5">
                    {catItems.map(item => (
                      <button key={item.id} onClick={() => toggleItem(item.id, item.is_purchased)}
                        className="flex items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors w-full group min-h-[48px]">
                        {item.is_purchased
                          ? <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
                          : <Circle className="h-6 w-6 text-slate-300 shrink-0 group-hover:text-emerald-300" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.is_purchased ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {item.ingredient_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.quantity} {item.unit}
                            {item.substitute_for && ` · Reemplazo: ${item.substitute_for}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.estimated_cost_usd && (
                            <span className="text-xs text-slate-400">${item.estimated_cost_usd}</span>
                          )}
                          {item.is_optional && (
                            <Badge variant="secondary" className="text-[10px]">Opcional</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
