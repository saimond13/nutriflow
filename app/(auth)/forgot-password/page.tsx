'use client'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, MailCheck } from 'lucide-react'

type Step = 'email' | 'code' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const { signIn, fetchStatus } = useSignIn()
  const router = useRouter()
  const [step, setStep]       = useState<Step>('email')
  const [email, setEmail]     = useState('')
  const [code, setCode]       = useState('')
  const [newPass, setNewPass] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoad]    = useState(false)
  const isReady = fetchStatus !== 'fetching'

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!isReady || !signIn) return
    setError('')
    setLoad(true)
    try {
      const { error: createError } = await signIn.create({ identifier: email })
      if (createError) { setError(createError.longMessage || 'No se encontró una cuenta con ese email'); return }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode()
      if (sendError) { setError(sendError.longMessage || 'Error al enviar código'); return }
      setStep('code')
    } catch {
      setError('No se encontró una cuenta con ese email')
    } finally {
      setLoad(false)
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn) return
    setError('')
    setLoad(true)
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code })
      if (verifyError) { setError(verifyError.longMessage || 'Código incorrecto'); return }
      setStep('password')
    } catch {
      setError('Código incorrecto. Intenta de nuevo.')
    } finally {
      setLoad(false)
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn) return
    if (newPass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setError('')
    setLoad(true)
    try {
      const { error: passError } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPass, signOutOfOtherSessions: true,
      })
      if (passError) { setError(passError.longMessage || 'Error al cambiar contraseña'); return }
      if (signIn.status === 'complete') {
        await signIn.finalize()
        router.push('/dashboard')
      }
    } catch {
      setError('Error al cambiar la contraseña. Intenta de nuevo.')
    } finally {
      setLoad(false)
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
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">

          {step === 'email' && (
            <>
              <h2 className="mb-2 text-xl font-semibold text-slate-800">Recuperar contraseña</h2>
              <p className="mb-6 text-sm text-slate-500">Ingresa tu correo y te enviaremos un código.</p>
              <form onSubmit={sendCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Correo electrónico</Label>
                  <Input type="email" placeholder="tu@email.com" value={email}
                    onChange={e => setEmail(e.target.value)} required />
                </div>
                {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
                <Button type="submit" loading={loading} className="w-full">Enviar código</Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <Link href="/login" className="text-emerald-600 hover:underline">Volver al login</Link>
              </p>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="flex flex-col items-center gap-3 mb-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <MailCheck className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Ingresa el código</h2>
                  <p className="mt-1 text-sm text-slate-500">Enviamos un código a <strong>{email}</strong></p>
                </div>
              </div>
              <form onSubmit={verifyCode} className="flex flex-col gap-4">
                <Input placeholder="123456" value={code} onChange={e => setCode(e.target.value)}
                  className="text-center text-lg tracking-widest" maxLength={6} required />
                {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
                <Button type="submit" loading={loading} disabled={code.length < 6}>Verificar código</Button>
              </form>
            </>
          )}

          {step === 'password' && (
            <>
              <h2 className="mb-2 text-xl font-semibold text-slate-800">Nueva contraseña</h2>
              <p className="mb-6 text-sm text-slate-500">Elige una contraseña segura de al menos 8 caracteres.</p>
              <form onSubmit={submitPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Nueva contraseña</Label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" value={newPass}
                    onChange={e => setNewPass(e.target.value)} required />
                </div>
                {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
                <Button type="submit" loading={loading} disabled={newPass.length < 8}>Cambiar contraseña</Button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
