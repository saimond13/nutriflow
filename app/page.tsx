import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="text-xl font-bold text-slate-800">NutriFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Iniciar sesión</Link>
          <Link href="/register" className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700 font-medium mb-6">
          ✨ Planificación nutricional con IA
        </div>
        <h1 className="text-5xl font-bold text-slate-800 leading-tight mb-6">
          Tu plan de comidas,<br />tu lista de compras,<br />
          <span className="text-emerald-500">todo en un flujo</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Dinos tu objetivo y restricciones. En segundos tendrás tu plan semanal personalizado
          y tu lista de compras inteligente lista para el supermercado.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200">
            Crear cuenta gratis
          </Link>
          <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">Sin tarjeta de crédito · Plan gratuito disponible</p>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { emoji: '🎯', title: 'Objetivos personalizados', desc: 'Bajar peso, ganar músculo o mantener. Calculamos tus macros exactos.' },
            { emoji: '🤖', title: 'Plan generado por IA', desc: 'GPT-4o crea tu menú semanal respetando tus preferencias y presupuesto.' },
            { emoji: '🛒', title: 'Canasta inteligente', desc: 'Lista de compras organizada por categoría, con cantidades consolidadas.' },
            { emoji: '📈', title: 'Seguimiento real', desc: 'Registra lo que comes y ve tu progreso día a día.' },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl bg-white p-6 border border-slate-100 shadow-sm">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-slate-800 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center pb-8 text-sm text-slate-400">
        NutriFlow es un asistente de planificación. No reemplaza a un nutricionista profesional.
      </footer>
    </div>
  )
}
