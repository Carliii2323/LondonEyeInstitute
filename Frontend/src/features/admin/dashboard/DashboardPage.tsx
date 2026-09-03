import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
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
import { cn } from '@/lib/cn'

/* ============================================================
 * DashboardPage — Panel de Control (Admin Home, conectado)
 *
 * La plata es lo que más pesa: bloque de recaudación destacado
 * arriba (Recaudado grande + Pendiente/Vencido/Otros), conteos
 * operativos como fila secundaria, y gráfico de recaudado por mes.
 * ============================================================ */

const NOW = new Date()
const MONTHS_BACK = 6

/** Últimos N meses (viejo -> nuevo, terminando en el mes actual). */
const PERIODS = Array.from({ length: MONTHS_BACK }, (_, i) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - (MONTHS_BACK - 1 - i), 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
})

export function DashboardPage() {
  const [statsSeries, setStatsSeries] = useState<DashboardStats[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [events, setEvents] = useState<UpcomingEventItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      Promise.all(PERIODS.map((p) => dashboardService.stats(p.month, p.year))),
      dashboardService.activity(8),
      dashboardService.events(3),
    ])
      .then(([series, a, e]) => {
        if (!active) return
        setStatsSeries(series)
        setActivity(a)
        setEvents(e)
      })
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const current = statsSeries[statsSeries.length - 1] ?? null
  const prev = statsSeries[statsSeries.length - 2] ?? null
  const period = current ? periodLabel(current.month, current.year) : ''

  const collectedDelta = current && prev ? moneyDelta(current.collected, prev.collected) : null
  const otherDelta = current && prev ? moneyDelta(current.other_collected, prev.other_collected) : null

  const collectionSeries = useMemo(
    () =>
      statsSeries.map((s) => ({
        month: `${s.year}-${String(s.month).padStart(2, '0')}`,
        amount: Number(s.collected) || 0,
      })),
    [statsSeries],
  )

  return (
    <PageContainer title="Panel de Control">
      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {/* Bloque de plata destacado */}
      <section className="bg-white rounded-card shadow-card p-6">
        <h2 className="mb-5 text-small font-semibold uppercase tracking-wider text-surface-500">
          Recaudación {period ? `de ${period}` : 'del mes'}
        </h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Hero: Recaudado del mes */}
          <div className="flex flex-col justify-between rounded-card bg-royal-500 p-6 text-white">
            <span className="text-small font-medium uppercase tracking-wider text-royal-100">Recaudado del mes</span>
            <span className="mt-3 font-heading text-4xl font-bold leading-none">
              {current ? formatMoney(current.collected) : '--'}
            </span>
            <span className="mt-3 text-small text-royal-100">
              {collectedDelta ? collectedDelta.text : 'Cuotas aprobadas'}
            </span>
          </div>

          {/* Soporte: Pendiente / Vencido / Otros */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
            <MoneyFigure label="Pendiente" sub="Por vencer" value={current?.pending_amount} />
            <MoneyFigure label="Vencido" sub="En mora" value={current?.overdue_amount} danger />
            <MoneyFigure label="Otros cobrados" sub={otherDelta ? otherDelta.text : 'Cargos y derechos'} value={current?.other_collected} />
          </div>
        </div>
      </section>

      {/* Conteos operativos (secundarios) */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CompactStat label="Estudiantes activos" value={current ? String(current.active_students) : '--'} />
        <CompactStat label="Cursos activos" value={current ? String(current.active_courses) : '--'} />
        <CompactStat label="Docentes activos" value={current ? String(current.active_teachers) : '--'} />
      </div>

      {/* Recaudado por mes */}
      <div className="mt-6">
        <CollectionChart series={collectionSeries} isLoading={isLoading} />
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

/** Monto de soporte del bloque de plata. `danger` resalta la mora cuando hay saldo. */
function MoneyFigure({ label, sub, value, danger }: { label: string; sub: string; value?: string; danger?: boolean }) {
  const isDanger = danger && Number(value ?? 0) > 0
  return (
    <div className={cn('flex flex-col rounded-card border p-5', isDanger ? 'border-accent-200 bg-accent-50' : 'border-surface-200 bg-surface-50')}>
      <span className="text-small font-medium uppercase tracking-wider text-surface-400">{label}</span>
      <span className={cn('mt-2 font-heading text-[1.75rem] font-bold leading-none', isDanger ? 'text-accent-600' : 'text-surface-900')}>
        {value !== undefined ? formatMoney(value) : '--'}
      </span>
      <span className="mt-2 text-small text-surface-400">{sub}</span>
    </div>
  )
}

/** Conteo operativo compacto (fila secundaria). */
function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-card bg-white px-5 py-4 shadow-card">
      <span className="text-small font-medium uppercase tracking-wider text-surface-400">{label}</span>
      <span className="font-heading text-2xl font-bold leading-none text-surface-900">{value}</span>
    </div>
  )
}

type Delta = { text: string; type: 'positive' | 'negative' | 'neutral' }

/** Delta porcentual de un monto (string) vs el mes anterior. */
function moneyDelta(cur: string, prev: string): Delta {
  const c = Number(cur)
  const p = Number(prev)
  if (Number.isNaN(c) || Number.isNaN(p)) return { text: 'Este mes', type: 'neutral' }
  const diff = c - p
  if (p === 0) return diff > 0 ? { text: 'Nuevo este mes', type: 'positive' } : { text: 'vs mes anterior', type: 'neutral' }
  const pct = Math.round((diff / p) * 100)
  if (pct === 0) return { text: 'Igual al mes ant.', type: 'neutral' }
  return { text: `${pct > 0 ? '+' : ''}${pct}% vs mes ant.`, type: pct > 0 ? 'positive' : 'negative' }
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7))
  return m >= 1 && m <= 12 ? (MONTHS_SHORT[m - 1] ?? ym) : ym
}

/** Monto compacto para las etiquetas del gráfico: $12,4k / $1,2M. */
function compactMoney(n: number): string {
  if (n <= 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`
  if (n >= 1000) return `$${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`
  return `$${n.toLocaleString('es-AR')}`
}

/** Bar chart simple (sin dependencias) de recaudado por mes. */
function CollectionChart({ series, isLoading }: { series: { month: string; amount: number }[]; isLoading: boolean }) {
  const max = Math.max(1, ...series.map((d) => d.amount))
  const total = series.reduce((acc, d) => acc + d.amount, 0)
  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="mb-4 text-small font-semibold uppercase tracking-wider text-surface-500">Recaudado por mes</h2>
      {isLoading ? (
        <div className="h-44 animate-pulse rounded-button bg-surface-100" />
      ) : series.length === 0 ? (
        <p className="text-body italic text-surface-400">Sin datos.</p>
      ) : total === 0 ? (
        <p className="text-body italic text-surface-400">Sin cobros registrados en el período.</p>
      ) : (
        <div className="flex items-stretch gap-3" style={{ height: '11rem' }}>
          {series.map((d) => (
            <div key={d.month} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="text-small font-semibold text-surface-600">{compactMoney(d.amount)}</span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="mx-auto w-8 max-w-full rounded-t bg-emerald-500"
                  style={{ height: `${(d.amount / max) * 100}%`, minHeight: d.amount > 0 ? '4px' : '0px' }}
                  title={formatMoney(String(d.amount))}
                />
              </div>
              <span className="mt-1.5 text-small capitalize text-surface-400">{monthLabel(d.month)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
