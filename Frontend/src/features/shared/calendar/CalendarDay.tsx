import { cn } from '@/lib/cn'
import type { CalendarEvent } from './types'
import { CalendarEventBadge } from './CalendarEventBadge'

/* ============================================================
 * CalendarDay — Celda de dia individual del grid
 *
 * Estados visuales:
 *   - isCurrentMonth: dias del mes en vista vs mes adyacente
 *   - isToday: dia actual (numero con circulo navy)
 *   - hasHoliday: fondo amber si hay feriado
 * ============================================================ */

interface CalendarDayProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  onClick: (date: Date) => void
  /** Si viene, los eventos son clickeables (para ver/editar). */
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarDay({ date, isCurrentMonth, isToday, events, onClick, onEventClick }: CalendarDayProps) {
  const hasHoliday = events.some((e) => e.type === 'feriado')

  return (
    <div
      onClick={() => onClick(date)}
      className={cn(
        'flex flex-col gap-1 min-h-[110px] p-2 cursor-pointer',
        'border-r border-b border-surface-100 last:border-r-0',
        'text-left transition-colors',
        hasHoliday ? 'bg-amber-50/60' : 'hover:bg-surface-50',
      )}
    >
      {/* Numero de dia */}
      <DayNumber
        day={date.getDate()}
        isCurrentMonth={isCurrentMonth}
        isToday={isToday}
      />

      {/* Eventos */}
      {events.length > 0 && (
        <div className="flex flex-col gap-1 mt-0.5">
          {events.map((event) =>
            onEventClick ? (
              <button
                key={event.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                className="text-left rounded-badge focus:outline-none focus:ring-2 focus:ring-royal-500/30"
              >
                <CalendarEventBadge title={event.title} type={event.type} />
              </button>
            ) : (
              <CalendarEventBadge key={event.id} title={event.title} type={event.type} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

/* ---- Numero del dia con estilo segun estado ---- */

interface DayNumberProps {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

function DayNumber({ day, isCurrentMonth, isToday }: DayNumberProps) {
  if (isToday) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-navy-500 text-white text-small font-bold">
        {day}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'text-small font-medium',
        isCurrentMonth ? 'text-surface-700' : 'text-surface-300',
      )}
    >
      {day}
    </span>
  )
}