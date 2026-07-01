import { Link } from 'react-router-dom'
import { Hourglass, Mail, Check, GraduationCap, BookOpen } from 'lucide-react'

/* ============================================================
 * RequestPendingPage — Solicitud en revision (post-registro)
 * ============================================================ */

export function RequestPendingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <BookOpen size={20} className="text-navy-500" />
        <span className="font-heading font-bold text-body text-navy-500">London Eye</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-card shadow-card p-8 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <GraduationCap size={24} className="text-navy-500" />
          <span className="font-heading font-bold text-body text-surface-900">London Eye</span>
        </div>
        <p className="text-small text-surface-400 uppercase tracking-wider mb-6">Panel de Gestion</p>

        <div className="border-t border-surface-100 pt-6" />

        {/* Icono reloj de arena */}
        <div className="flex justify-center mb-4">
          <Hourglass size={48} className="text-amber-500" />
        </div>

        <h1 className="font-heading text-page-title text-surface-900">
          Solicitud en revision
        </h1>
        <p className="text-body text-surface-500 mt-3 max-w-sm mx-auto">
          Tu solicitud de registro fue enviada correctamente. Un administrador revisara tus datos y te enviara un mail de confirmacion una vez aprobado el acceso.
        </p>

        {/* Info box */}
        <div className="mt-6 p-4 bg-royal-50/50 border border-royal-100 rounded-button text-left flex items-start gap-2">
          <Mail size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-small text-royal-700">
              Revisamos las solicitudes en un plazo de <strong>24 a 48 horas habiles</strong>. Recibiras un correo en:
            </span>
            <p className="text-small font-semibold text-royal-700 mt-1">sofia.m@gmail.com</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mt-8">
          <StepItem number={1} label="Registro Enviado" status="completed" />
          <StepConnector active />
          <StepItem number={2} label="En Revision" status="active" />
          <StepConnector />
          <StepItem number={3} label="Acceso Habilitado" status="pending" />
        </div>

        {/* Actions */}
        <div className="mt-8">
          <Link
            to="/login"
            className="text-body font-semibold text-navy-500 hover:text-navy-600 transition-colors"
          >
            Volver al inicio
          </Link>
          <p className="text-small text-surface-400 mt-3">
            Si tenes alguna consulta contacta al instituto.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---- Stepper sub-componentes ---- */

type StepStatus = 'completed' | 'active' | 'pending'

function StepItem({ number, label, status }: { number: number; label: string; status: StepStatus }) {
  const circleClass = {
    completed: 'bg-emerald-500 text-white',
    active: 'bg-accent-500 text-white',
    pending: 'bg-white border-2 border-surface-200 text-surface-400',
  }

  const labelClass = {
    completed: 'text-emerald-600',
    active: 'text-accent-600',
    pending: 'text-surface-400',
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-28">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-small font-bold ${circleClass[status]}`}>
        {status === 'completed' ? <Check size={14} strokeWidth={2.5} /> : number}
      </div>
      <span className={`text-[0.625rem] font-semibold uppercase tracking-wider ${labelClass[status]}`}>
        {label}
      </span>
    </div>
  )
}

function StepConnector({ active }: { active?: boolean }) {
  return (
    <div className={`w-10 h-0.5 -mt-5 ${active ? 'bg-emerald-500' : 'bg-surface-200'}`} />
  )
}