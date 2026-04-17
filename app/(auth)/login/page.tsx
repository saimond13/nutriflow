'use client'
import { useState } from 'react'
import { useSignIn, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf } from 'lucide-react'

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn()
  const { setActive } = useClerk()
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const isReady = fetchStatus === 'idle'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn) {
      setError('La página todavía está cargando, intenta de nuevo.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await signIn.create({ identifier: email, password })

      if (signInError) {
        const msg = signInError.longMessage || signInError.message || ''
        setError(
          msg.toLowerCase().includes('password') ? 'Contraseña incorrecta' :
          msg.toLowerCase().includes('identifier') || msg.toLowerCase().includes('no se encontró') ? 'Email no encontrado' :
          msg || 'Error al iniciar sesión'
        )
        return
      }

      if (signIn.status === 'complete') {
        await setActive({ session: signIn.createdSessionId })
        const res = await fetch('/api/auth/check-onboarding').catch(() => null)
        const data = res?.ok ? await res.json().catch(() => null) : null
        window.location.href = data?.completed ? '/dashboard' : '/onboarding'
        return
      }

      setError('No se pudo completar el inicio de sesión. Intenta de nuevo.')
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ longMessage?: string; message: string }> }
      const msg = clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message || ''
      setError(
        msg.toLowerCase().includes('password') ? 'Contraseña incorrecta' :
        msg.toLowerCase().includes('identifier') ? 'Email no encontrado' :
        msg || 'Error al iniciar sesión'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg">
            <Leaf className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">NutriFlow</h1>
          <p className="text-sm text-slate-500">Tu asistente nutricional inteligente</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
          <h2 className="mb-6 text-xl font-semibold text-slate-800">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/forgot-password" className="text-xs text-emerald-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••"
                value={password} onChange={e => setPass(e.target.value)} required />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} disabled={!email || !password || !isReady}>
              {isReady ? 'Iniciar sesión' : 'Cargando...'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-emerald-600 font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
