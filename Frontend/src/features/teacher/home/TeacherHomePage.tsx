import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { courseService, type CourseListItem } from '@/services/courseService'
import { notificationService, type NotificationItem } from '@/services/notificationService'
import { formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { Clock } from 'lucide-react'

/* ============================================================
 * TeacherHomePage — Inicio del docente (conectado)
 *
 * Banner + Mis Cursos (GET /teacher/courses) + Anuncios (/notifications).
 * ============================================================ */

const TYPE_BAR: Record<string, string> = {
  urgente: 'bg-accent-500', evento: 'bg-royal-500', informativo: 'bg-amber-500', archivado: 'bg-surface-300',
}

export function TeacherHomePage() {
  const user = useAuthStore((s) => s.user)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([courseService.listMine(), notificationService.list()])
      .then(([cs, ns]) => {
        if (!active) return
        setCourses(cs)
        setNotifications(ns.filter((n) => n.type !== 'archivado'))
      })
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="relative bg-navy-500 rounded-card p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-navy-400/20 -mr-10 -mt-10" />
        <div className="relative">
          <h1 className="font-heading text-page-title text-white">
            Bienvenido/a{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className="text-body text-navy-100/70 mt-2">
            {isLoading ? 'Cargando tu resumen...' : `Tenes ${courses.length} curso(s) asignado(s) y ${notifications.length} anuncio(s).`}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mis Cursos */}
        <div className="lg:col-span-2 bg-white rounded-card shadow-card p-6">
          <div className="mb-4">
            <h2 className="font-heading text-section-title text-surface-900">Mis Cursos</h2>
            <p className="text-small text-surface-500 mt-0.5">Cursos asignados.</p>
          </div>

          {isLoading ? (
            <SkeletonLines />
          ) : courses.length === 0 ? (
            <p className="text-body text-surface-400 italic">No tenes cursos asignados.</p>
          ) : (
            <div className="flex flex-col divide-y divide-surface-100">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <Avatar initials={course.name.slice(0, 2).toUpperCase()} size="md" className="!bg-navy-500 !text-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-surface-800">{course.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} className="text-surface-400" />
                      <span className="text-small text-surface-500">{course.schedule}</span>
                    </div>
                  </div>
                  <div className="text-right mr-3">
                    <span className="font-heading text-section-title text-surface-900">{course.enrolled_count}</span>
                    <p className="text-[0.625rem] font-semibold text-surface-400 uppercase">Alumnos</p>
                  </div>
                  <Badge variant={course.status === 'inactivo' ? 'default' : 'success'}>{course.status.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anuncios */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="font-heading text-section-title text-surface-900 mb-4">Anuncios</h2>

          {isLoading ? (
            <SkeletonLines />
          ) : notifications.length === 0 ? (
            <p className="text-body text-surface-400 italic">No hay anuncios.</p>
          ) : (
            <div className="flex flex-col divide-y divide-surface-100">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="relative py-3 pl-4 first:pt-0 last:pb-0">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${TYPE_BAR[n.type] ?? 'bg-surface-300'}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-surface-900">{n.title}</h3>
                      <p className="text-small text-surface-500 mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-small text-surface-400 whitespace-nowrap">{formatDateOnly(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-surface-100">
            <Link to="/profesor/notificaciones" className="text-body font-medium text-royal-500 hover:text-royal-600 transition-colors">
              Ver todos &rsaquo;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonLines() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-button bg-surface-100 animate-pulse" />)}
    </div>
  )
}
