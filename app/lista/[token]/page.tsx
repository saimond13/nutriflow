import { db, shoppingLists, shoppingListItems } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { CheckCircle, Circle, ShoppingCart, Tag } from 'lucide-react'

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

export default async function PublicListPage({ params }: { params: { token: string } }) {
  const [list] = await db.select().from(shoppingLists)
    .where(eq(shoppingLists.share_token, params.token))

  if (!list) notFound()

  const items = await db.select().from(shoppingListItems)
    .where(eq(shoppingListItems.shopping_list_id, list.id))
    .orderBy(shoppingListItems.sort_order)

  const byCategory: Record<string, typeof items> = {}
  items.forEach(item => {
    const cat = item.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  })

  const purchasedCount = items.filter(i => i.is_purchased).length
  const totalCount = items.length
  const pct = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{list.name}</h1>
            <p className="text-sm text-slate-500">Lista compartida · NutriFlow</p>
          </div>
        </div>

        {/* Progreso */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              {list.estimated_total_cost_usd && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> Estimado: ${list.estimated_total_cost_usd} USD
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">{pct}%</p>
              <p className="text-xs text-slate-400">{purchasedCount}/{totalCount} ítems</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-emerald-100 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && (
            <p className="mt-2 text-center text-sm font-medium text-emerald-600">¡Lista completa! 🎉</p>
          )}
        </div>

        {/* Ítems por categoría */}
        {CATEGORY_ORDER.filter(cat => byCategory[cat]?.length > 0).map(cat => {
          const catItems = byCategory[cat]
          const catLabel = CATEGORY_LABELS[cat]

          return (
            <div key={cat} className="rounded-2xl bg-white border border-slate-100 shadow-sm mb-3 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <span>{catLabel.emoji}</span>
                  <span className="font-semibold text-slate-800">{catLabel.label}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {catItems.filter(i => i.is_purchased).length}/{catItems.length}
                </span>
              </div>
              <div className="px-4 py-2 flex flex-col gap-1">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-1 py-2.5">
                    {item.is_purchased
                      ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                      : <Circle className="h-5 w-5 text-slate-200 shrink-0" />
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
                    {item.estimated_cost_usd && (
                      <span className="text-xs text-slate-400 shrink-0">${item.estimated_cost_usd}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <p className="text-center text-xs text-slate-400 mt-6">Generado con NutriFlow · nutriflow.app</p>
      </div>
    </div>
  )
}
