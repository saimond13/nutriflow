'use client'
import { useState } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const { signUp, setActive, fetchStatus } = useSignUp()
  const router = useRouter()
  const [form, setForm]       = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode]       = useState('')
  const isReady = fetchStatus !== 'fetching'

  function update(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isReady || !signUp) return
    setError('')
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)

    try {
      const nameParts = form.full_name.trim().split(' ')
      await signUp.create({
        emailAddress: form.email,
        password:     form.password,
        firstName:    nameParts[0],
        lastName:     nameParts.slice(1).join(' ') || undefined,
      })

      if (signUp.status === 'complete') {
        await setActive!({ session: signUp.createdSessionId })
        router.push('/onboarding')
      } else if (signUp.unverifiedFields.includes('email_address')) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        setVerifying(true)
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ longMessage?: string; message: string }> }
      const msg = clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message || 'Error al crear cuenta'
      setError(msg.includes('email') || msg.includes('taken') ? 'Este email ya está registrado' : msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!signUp) return
    setLoading(true)
    try {
      await signUp.attemptEmailAddressVerification({ code })
      if (signUp.status === 'complete') {
        await setActive!({ session: signUp.createdSessionId })
        router.push('/onboarding')
      }
    } catch {
      setError('Error al verificar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Verifica tu email</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa el código que enviamos a {form.email}</p>
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <Input placeholder="123456" value={code} onChange={e => setCode(e.target.value)}
              className="text-center text-lg tracking-widest" maxLength={6} required />
            {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
            <Button type="submit" loading={loading} disabled={code.length < 6}>Verificar</Button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg">
            <Leaf className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">NutriFlow</h1>
          <p className="text-sm text-slate-500">Crea tu cuenta gratis</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
          <h2 className="mb-6 text-xl font-semibold text-slate-800">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo</Label>
              <Input placeholder="Juan García" value={form.full_name} onChange={update('full_name')} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Correo electrónico</Label>
              <Input type="email" placeholder="tu@email.com" value={form.email} onChange={update('email')} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Contraseña</Label>
              <Input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={update('password')} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirmar contraseña</Label>
              <Input type="password" placeholder="Repetir contraseña" value={form.confirm} onChange={update('confirm')} required />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">Crear cuenta gratis</Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-emerald-600 hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
