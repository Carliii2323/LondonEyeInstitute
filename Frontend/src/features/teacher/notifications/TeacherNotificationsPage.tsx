import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/Badge'
import { notificationService, type NotificationItem, type NotificationType } from '@/services/notificationService'
import { TYPE_LABEL, TYPE_BADGE_VARIANT } from '@/features/shared/notifications/notificationHelpers'
import { relativeTime } from '@/lib/relativeTime'
import { formatBackendError } from '@/lib/formatBackendError'
import { AlertTriangle, Info, CalendarDays, Archive } from 'lucide-react'
import type { ReactNode } from 'react'

/* ============================================================
 * TeacherNotificationsPage — Avisos del instituto para el docente
 *
 * Solo lectura. GET /notifications (el backend filtra por audiencia).
 * ============================================================ */

const TYPE_ICON: Record<NotificationType, { icon: ReactNode; bg: string; color: string }> = {
  urgente: { icon: <AlertTriangle size={20} />, bg: 'bg-accent-50', color: 'text-accent-500' },
  informativo: { icon: <Info size={20} />, bg: 'bg-royal-50', color: 'text-royal-500' },
  evento: { icon: <CalendarDays size={20} />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  archivado: { icon: <Archive size={20} />, bg: 'bg-surface-100', color: 'text-surface-500' },
}

export function TeacherNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    notificationService
      .list()
      .then((data) => active && setItems(data))
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  return (
    <PageContainer title="Notificaciones">
      <div className="bg-white rounded-card shadow-card p-6">
        <h2 className="font-heading text-section-title text-surface-900">Avisos del Instituto</h2>
        <p className="text-small text-surface-500 mt-0.5 mb-4">Avisos y novedades dirigidos a vos.</p>

        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-body text-surface-400">No tenes notificaciones.</p>
        ) : (
          <div className="flex flex-col divide-y divide-surface-100">
            {items.map((n) => {
              const meta = TYPE_ICON[n.type] ?? TYPE_ICON.informativo
              return (
                <div key={n.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className={`w-10 h-10 rounded-card ${meta.bg} flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-semibold text-surface-900">{n.title}</h3>
                    <p className="text-small text-surface-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={TYPE_BADGE_VARIANT[n.type]}>{TYPE_LABEL[n.type].toUpperCase()}</Badge>
                      {n.course_name && (
                        <span className="inline-block px-2.5 py-0.5 rounded-badge border border-surface-200 text-[0.6875rem] font-semibold text-surface-500 uppercase tracking-wider">
                          {n.course_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-small text-surface-400 whitespace-nowrap flex-shrink-0">{relativeTime(n.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
