import { NextRequest, NextResponse } from 'next/server'

interface OFFProduct {
  product_name?: string
  brands?: string
  serving_size?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    'proteins_100g'?: number
    'carbohydrates_100g'?: number
    'fat_100g'?: number
    'fiber_100g'?: number
  }
}

function normalize(product: OFFProduct, quantity_g = 100) {
  const n = product.nutriments ?? {}
  const factor = quantity_g / 100
  return {
    food_name:    [product.product_name, product.brands].filter(Boolean).join(' – ') || 'Producto sin nombre',
    portion_label: product.serving_size ? `${product.serving_size}` : `${quantity_g}g`,
    quantity_g,
    calories:     Math.round((n['energy-kcal_100g'] ?? 0) * factor),
    protein_g:    Math.round((n['proteins_100g'] ?? 0) * factor * 10) / 10,
    carbs_g:      Math.round((n['carbohydrates_100g'] ?? 0) * factor * 10) / 10,
    fat_g:        Math.round((n['fat_100g'] ?? 0) * factor * 10) / 10,
    source: 'openfoodfacts' as const,
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ items: [] })

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', q)
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '8')
  url.searchParams.set('fields', 'product_name,brands,serving_size,nutriments')
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'NutriFlow/1.0 (heraldoh13@gmail.com)' },
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const products: OFFProduct[] = data.products ?? []

    const items = products
      .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
      .slice(0, 6)
      .map(p => normalize(p))

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
