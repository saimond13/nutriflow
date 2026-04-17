import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'NutriFlow – Tu asistente nutricional inteligente',
  description: 'Planifica tus comidas, controla tus calorías y genera tu lista de compras con IA.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className="h-full">
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  )
}
