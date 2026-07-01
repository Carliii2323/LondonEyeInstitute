import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatCard } from '@/components/ui/StatCard'
import { RecentActivity } from './RecentActivity'
import { UpcomingEvents } from './UpcomingEvents'
import {
  dashboardService,
  type DashboardStats,
  type ActivityItem,
  type UpcomingEventItem,
} from '@/services/dashboardService'
import { formatMoney, periodLabel } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * DashboardPage — Panel de Control (Admin Home, conectado)
 *
 * Stats del mes en curso + actividad reciente + proximos eventos.
 * ============================================================ */

const NOW = new Date()

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [events, setEvents] = useState<UpcomingEventItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      dashboardService.stats(NOW.getMonth() + 1, NOW.getFullYear()),
      dashboardService.activity(8),
      dashboardService.events(5),
    ])
      .then(([s, a, e]) => {
        if (!active) return
        setStats(s)
        setActivity(a)
        setEvents(e)
      })
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const period = stats ? periodLabel(stats.month, stats.year) : ''

  return (
    <PageContainer title="Panel de Control">
      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Estudiantes Activos" value={stats ? String(stats.active_students) : '--'} change="Activos" changeType="neutral" />
        <StatCard label="Cursos Activos" value={stats ? String(stats.active_courses) : '--'} change="En curso" changeType="neutral" />
        <StatCard label="Recaudado del Mes" value={stats ? formatMoney(stats.collected) : '--'} change={period || 'Este mes'} changeType="positive" />
        <StatCard label="Pendiente del Mes" value={stats ? formatMoney(stats.pending_amount) : '--'} change="Por cobrar" changeType="neutral" />
      </div>

      {/* Actividad + eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <UpcomingEvents events={events} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity items={activity} isLoading={isLoading} />
        </div>
      </div>
    </PageContainer>
  )
}
