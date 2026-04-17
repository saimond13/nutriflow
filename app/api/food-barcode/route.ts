import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,serving_size,nutriments`,
      { headers: { 'User-Agent': 'NutriFlow/1.0 (heraldoh13@gmail.com)' } }
    )
    const data = await res.json()

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Producto no encontrado en la base de datos' }, { status: 404 })
    }

    const p = data.product
    const n = p.nutriments ?? {}

    return NextResponse.json({
      item: {
        food_name:     [p.product_name, p.brands].filter(Boolean).join(' – ') || 'Producto sin nombre',
        portion_label: p.serving_size ?? '100g',
        quantity_g:    100,
        calories:      Math.round(n['energy-kcal_100g'] ?? 0),
        protein_g:     Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        carbs_g:       Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat_g:         Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        source:        'openfoodfacts',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 })
  }
}
