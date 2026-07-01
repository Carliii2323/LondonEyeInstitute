import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ============================================================
 * NotFoundPage — Pagina 404
 * ============================================================ */

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Barra superior accent */}
      <div className="h-1 bg-accent-500" />

      {/* Header minimal */}
      <div className="px-8 py-5">
        <div>
          <span className="font-heading font-bold text-body text-surface-900 tracking-wider">
            LONDON EYE
          </span>
          <p className="text-[0.625rem] font-semibold text-surface-400 uppercase tracking-[0.15em]">
            Academic Management
          </p>
        </div>
      </div>

      {/* Card centrada */}
      <div className="flex items-center justify-center px-4 mt-16">
        <div className="w-full max-w-lg bg-white rounded-card shadow-card p-12 text-center">
          {/* 4_4 con icono en el medio */}
          <div className="flex items-center justify-center gap-1 mb-6">
            <span className="text-[5rem] font-heading font-bold text-surface-200 leading-none">4</span>
            <div className="w-16 h-16 rounded-xl bg-navy-500 flex items-center justify-center -mt-2">
              <Compass size={28} className="text-white" />
            </div>
            <span className="text-[5rem] font-heading font-bold text-surface-200 leading-none">4</span>
          </div>

          <h1 className="font-heading text-page-title text-surface-900">
            Pagina no encontrada
          </h1>
          <p className="text-body text-surface-500 mt-3 max-w-xs mx-auto">
            La pagina que buscas no existe o fue movida por el administrador del sistema.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 mt-8 px-8 py-3 rounded-button bg-accent-500 text-white font-medium hover:bg-accent-600 active:bg-accent-700 transition-colors"
          >
            Volver al inicio
          </Link>

          <p className="text-small text-surface-400 mt-6">
            London Eye — Panel de Gestion
          </p>
        </div>
      </div>
    </div>
  )
}