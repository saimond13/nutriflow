'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const controlRef = useRef<{ stop: () => void } | null>(null)
  const [status, setStatus]     = useState<'loading' | 'scanning' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let active = true

    async function start() {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser')
        const { DecodeHintType } = await import('@zxing/library')

        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ])

        const reader = new BrowserMultiFormatReader(hints)
        if (!videoRef.current || !active) return

        setStatus('scanning')

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result, error) => {
            if (result && active) {
              onDetected(result.getText())
            }
            if (error && error.name !== 'NotFoundException') {
              console.warn('Scan error:', error.name)
            }
          }
        )

        if (active) controlRef.current = controls

      } catch (err: unknown) {
        if (!active) return
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMsg(
          msg.includes('Permission') || msg.includes('NotAllowed')
            ? 'Permiso de cámara denegado. Actívalo en la configuración del navegador.'
            : msg.includes('NotFound') || msg.includes('Devices')
            ? 'No se encontró una cámara en este dispositivo.'
            : 'No se pudo acceder a la cámara. Intenta de nuevo.'
        )
        setStatus('error')
      }
    }

    start()

    return () => {
      active = false
      controlRef.current?.stop()
      controlRef.current = null
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5" />
            <span className="font-semibold">Escanear código de barras</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-36">
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400 opacity-80 animate-scan" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br" />
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-white text-sm">Iniciando cámara…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
              <Camera className="h-8 w-8 text-slate-400" />
              <p className="text-white text-sm">{errorMsg}</p>
              <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
            </div>
          )}
        </div>

        {status === 'scanning' && (
          <p className="text-center text-white/70 text-xs mt-3">
            Apunta la cámara al código de barras del producto
          </p>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%  { top: 10%; }
          50% { top: 85%; }
          100%{ top: 10%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
          position: absolute;
        }
      `}</style>
    </div>
  )
}
