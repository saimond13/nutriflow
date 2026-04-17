import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, shoppingLists, shoppingListItems } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const list_id = req.nextUrl.searchParams.get('list_id')

  if (list_id) {
    const [list] = await db.select().from(shoppingLists)
      .where(and(eq(shoppingLists.id, list_id), eq(shoppingLists.user_id, userId)))
    if (!list) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })

    const items = await db.select().from(shoppingListItems)
      .where(eq(shoppingListItems.shopping_list_id, list_id))
      .orderBy(shoppingListItems.sort_order)

    return NextResponse.json({ list, items })
  }

  const lists = await db.select().from(shoppingLists)
    .where(eq(shoppingLists.user_id, userId))
    .orderBy(desc(shoppingLists.created_at))
    .limit(10)

  return NextResponse.json({ lists })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { item_id, is_purchased } = await req.json()

  // Verificar que el ítem pertenece al usuario
  const [item] = await db.select({ id: shoppingListItems.id, list_id: shoppingListItems.shopping_list_id })
    .from(shoppingListItems).where(eq(shoppingListItems.id, item_id))

  if (!item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })

  const [list] = await db.select({ user_id: shoppingLists.user_id })
    .from(shoppingLists).where(eq(shoppingLists.id, item.list_id))

  if (list?.user_id !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await db.update(shoppingListItems).set({ is_purchased }).where(eq(shoppingListItems.id, item_id))

  return NextResponse.json({ success: true })
}
