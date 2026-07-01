import { EventItem } from '@/components/ui/EventItem'
import type { UpcomingEventItem } from '@/services/dashboardService'

/* ============================================================
 * UpcomingEvents — Card de proximas actividades (conectada)
 *
 * Recibe los eventos ya cargados (GET /admin/dashboard/events).
 * ============================================================ */

interface UpcomingEventsProps {
  events: UpcomingEventItem[]
  isLoading: boolean
}

const MONTH_ABBR = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export function UpcomingEvents({ events, isLoading }: UpcomingEventsProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h3 className="text-small font-semibold text-surface-500 uppercase tracking-wider mb-2">Proximas Actividades</h3>

      {isLoading ? (
        <div className="flex flex-col gap-3 pt-1">
          {[0, 1].map((i) => <div key={i} className="h-12 rounded-button bg-surface-100 animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <p className="text-body text-surface-400 italic pt-1">No hay eventos proximos.</p>
      ) : (
        <div className="divide-y divide-surface-100">
          {events.map((event) => {
            const { day, month } = parseDate(event.date)
            return (
              <EventItem
                key={event.id}
                day={day}
                month={month}
                title={event.title}
                subtitle={buildSubtitle(event)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Parseo local de "YYYY-MM-DD" (evita corrimiento UTC). */
function parseDate(iso: string): { day: number; month: string } {
  const [, m, d] = iso.split('-').map(Number)
  return { day: d ?? 0, month: MONTH_ABBR[(m ?? 1) - 1] ?? '' }
}

function buildSubtitle(event: UpcomingEventItem): string {
  const parts: string[] = []
  if (event.start_time) parts.push(`${event.start_time} hs`)
  if (event.course_name) parts.push(event.course_name)
  return parts.join(' · ') || event.type
}
