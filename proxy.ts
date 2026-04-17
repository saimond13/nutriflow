import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/reset-password(.*)',
  '/lista/(.*)',
])

const isAuthRoute = createRouteMatcher(['/login(.*)', '/register(.*)', '/forgot-password(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  // Rate limit auth pages: 20 req/min per IP
  if (isAuthRoute(req)) {
    const rl = checkRateLimit(`auth:${ip}`, { limit: 20, windowMs: 60_000 })
    if (!rl.success) {
      return new NextResponse('Demasiados intentos. Espera un momento.', {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
      })
    }
  }

  const { userId } = await auth()

  // Rutas públicas — dejar pasar
  if (isPublicRoute(req)) return NextResponse.next()

  // Rutas protegidas sin sesión → login
  if (!userId) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
