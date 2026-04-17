type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Clean up expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 60_000).unref?.()
}

export function checkRateLimit(
  identifier: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { success: boolean; remaining: number; reset: number } {
  const now   = Date.now()
  const entry = store.get(identifier)

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt }
}

// Pre-configured limiters
export const LIMITERS = {
  // AI endpoints: 10 req/min per user
  ai:        (id: string) => checkRateLimit(`ai:${id}`,        { limit: 10,  windowMs: 60_000 }),
  // General API: 60 req/min per user
  api:       (id: string) => checkRateLimit(`api:${id}`,       { limit: 60,  windowMs: 60_000 }),
  // Fasting: 30 req/min per user
  fasting:   (id: string) => checkRateLimit(`fasting:${id}`,   { limit: 30,  windowMs: 60_000 }),
  // Public routes (by IP): 20 req/min
  public:    (ip: string) => checkRateLimit(`public:${ip}`,    { limit: 20,  windowMs: 60_000 }),
}

export function rateLimitResponse(reset: number) {
  return Response.json(
    { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}
