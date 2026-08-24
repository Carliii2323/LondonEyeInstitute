import type { CalendarEvent } from './types'
import { buildMonthMatrix, isSameDay, isSameMonth, toIsoDate } from './calendarHelpers'
import { CalendarDay } from './CalendarDay'

/* ============================================================
 * CalendarGrid — Grid de 7 columnas x 6 filas del mes
 * ============================================================ */

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

interface CalendarGridProps {
  viewDate: Date
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarGrid({ viewDate, events, onDayClick, onEventClick }: CalendarGridProps) {
  const days = buildMonthMatrix(viewDate)
  const today = new Date()

  /* Agrupar eventos por fecha ISO para lookup O(1) */
  const eventsByDate = groupEventsByDate(events)

  return (
    <div className="border-t border-l border-surface-100 rounded-button overflow-hidden">
      {/* Header de dias de la semana */}
      <div className="grid grid-cols-7 bg-surface-50/50">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-2 py-3 text-small font-semibold text-surface-500 uppercase tracking-wider text-center border-r border-b border-surface-100 last:border-r-0"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const isoDate = toIsoDate(date)
          return (
            <CalendarDay
              key={isoDate}
              date={date}
              isCurrentMonth={isSameMonth(date, viewDate)}
              isToday={isSameDay(date, today)}
              events={eventsByDate.get(isoDate) ?? []}
              onClick={onDayClick}
              onEventClick={onEventClick}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ---- Helper local ---- */

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const existing = map.get(event.date) ?? []
    existing.push(event)
    map.set(event.date, existing)
  }
  return map
}