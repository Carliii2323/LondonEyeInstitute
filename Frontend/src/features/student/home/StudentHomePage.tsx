import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { studentPaymentService } from '@/services/studentPaymentService'
import { notificationService, type NotificationItem } from '@/services/notificationService'
import { courseService, type StudentCourse } from '@/services/courseService'
import type { StudentPaymentItem } from '@/services/studentService'
import { periodLabel, formatMoney, formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * StudentHomePage — Inicio del alumno
 *
 * Banner (nombre real + resumen) + Anuncios (GET /notifications) +
 * Cuotas por pagar (GET /student/payments).
 * ============================================================ */

/** Cuotas accionables (requieren que el alumno suba comprobante). */
function isActionable(status: StudentPaymentItem['status']): boolean {
  return status === 'pending' || status === 'overdue' || status === 'rejected'
}

const TYPE_BAR: Record<string, string> = {
  urgente: 'bg-accent-500',
  evento: 'bg-royal-500',
  informativo: 'bg-amber-500',
  archivado: 'bg-surface-300',
}

export function StudentHomePage() {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [payments, setPayments] = useState<StudentPaymentItem[]>([])
  const [courses, setCourses] = useState<StudentCourse[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([notificationService.list(), studentPaymentService.listMine(), courseService.studentCourses()])
      .then(([nots, pays, myCourses]) => {
        if (!active) return
        setNotifications(nots.filter((n) => n.type !== 'archivado'))
        setPayments(pays)
        setCourses(myCourses)
      })
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const duePayments = payments.filter((p) => isActionable(p.status))
  const latestAnnouncements = notifications.slice(0, 4)

  function copyCode(id: string, code: string) {
    navigator.clipboard?.writeText(code)
      .then(() => {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
      })
      .catch(() => {})
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="relative bg-navy-500 rounded-card p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-navy-400/15 -mr-12 -mt-12" />
        <div className="relative">
          <h1 className="font-heading text-page-title text-white">
            Bienvenido/a de vuelta{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className="text-body text-navy-100/70 mt-2">
            {isLoading
              ? 'Cargando tu resumen...'
              : `Tenes ${duePayments.length} cuota(s) por pagar y ${notifications.length} anuncio(s).`}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anuncios (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-card shadow-card p-6">
          <h2 className="text-small font-semibold text-surface-500 uppercase tracking-wider mb-4">Anuncios del Instituto</h2>

          {isLoading ? (
            <SkeletonLines />
          ) : latestAnnouncements.length === 0 ? (
            <p className="text-body text-surface-400 italic">No hay anuncios por ahora.</p>
          ) : (
            <div className="flex flex-col divide-y divide-surface-100">
              {latestAnnouncements.map((a) => (
                <div key={a.id} className="relative py-4 pl-4 first:pt-0 last:pb-0">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${TYPE_BAR[a.type] ?? 'bg-surface-300'}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-surface-900">{a.title}</h3>
                      <p className="text-small text-surface-500 mt-0.5">{a.message}</p>
                    </div>
                    <span className="text-small font-medium text-surface-400 whitespace-nowrap">{formatDateOnly(a.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-surface-100">
            <Link to="/app/notificaciones" className="text-body font-medium text-royal-500 hover:text-royal-600 transition-colors">
              Ver todos los anuncios &rsaquo;
            </Link>
          </div>
        </div>

        {/* Cuotas por pagar (1/3) */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="text-small font-semibold text-surface-500 uppercase tracking-wider mb-4">Cuotas por Pagar</h2>

          {isLoading ? (
            <SkeletonLines />
          ) : duePayments.length === 0 ? (
            <p className="text-body text-surface-400 italic">Estas al dia. No tenes cuotas pendientes.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {duePayments.slice(0, 4).map((p) => (
                <div key={p.id} className="p-4 bg-surface-50 rounded-card border border-surface-100">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-body font-bold text-surface-900 truncate">{p.course_name}</h3>
                    <span className="text-body font-bold text-surface-900 whitespace-nowrap">{formatMoney(p.total)}</span>
                  </div>
                  <p className="text-small text-surface-500 mt-1">{periodLabel(p.month, p.year)} · Vence {formatDateOnly(p.due_date)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-surface-100">
            <Link to="/app/pagos" className="text-body font-medium text-royal-500 hover:text-royal-600 transition-colors">
              Ir a Mis Pagos &rsaquo;
            </Link>
          </div>
        </div>
      </div>

      {/* Mis Cursos */}
      <div className="bg-white rounded-card shadow-card p-6">
        <h2 className="text-small font-semibold text-surface-500 uppercase tracking-wider mb-4">Mis Cursos</h2>

        {isLoading ? (
          <SkeletonLines />
        ) : courses.length === 0 ? (
          <p className="text-body text-surface-400 italic">No estas inscripto/a en ningun curso.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {courses.map((c) => (
              <div key={c.id} className="p-4 bg-surface-50 rounded-card border border-surface-100">
                <h3 className="text-body font-bold text-surface-900 truncate">{c.name}</h3>
                <p className="text-small text-surface-500 mt-0.5">{c.schedule}</p>
                <p className="text-small text-surface-500">{c.teacher_name ? `Docente: ${c.teacher_name}` : 'Sin docente asignado'}</p>
                {c.classroom_code && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-small text-surface-500">Classroom:</span>
                    <code className="px-2 py-0.5 rounded-badge border border-surface-200 bg-white font-mono text-small text-surface-800">{c.classroom_code}</code>
                    <button
                      onClick={() => copyCode(c.id, c.classroom_code)}
                      className="text-small font-medium text-royal-500 hover:text-royal-600 transition-colors"
                    >
                      {copiedId === c.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonLines() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 rounded-button bg-surface-100 animate-pulse" />
      ))}
    </div>
  )
}
