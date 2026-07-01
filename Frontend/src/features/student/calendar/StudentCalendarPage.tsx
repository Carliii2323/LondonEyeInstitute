import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { CalendarGrid } from '@/features/shared/calendar/CalendarGrid'
import { CalendarLegend } from '@/features/shared/calendar/CalendarLegend'
import { shiftMonth } from '@/features/shared/calendar/calendarHelpers'
import { calendarService } from '@/services/calendarService'
import type { CalendarEvent } from '@/features/shared/calendar/types'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * StudentCalendarPage — Calendario del alumno (solo lectura)
 *
 * Carga eventos generales + los de sus cursos (GET /calendar/events,
 * el backend filtra por rol/cursos del alumno).
 * ============================================================ */

export function StudentCalendarPage() {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await calendarService.list(viewDate.getMonth() + 1, viewDate.getFullYear()))
    } catch (err) {
      setError(formatBackendError(err))
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [viewDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return (
    <PageContainer title="Calendario">
      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="flex items-center justify-center gap-4 px-5 py-4 border-b border-surface-100">
          <ArrowBtn onClick={() => setViewDate((d) => shiftMonth(d, -1))} dir="prev" />
          <MonthYearPicker
            month={viewDate.getMonth()}
            year={viewDate.getFullYear()}
            onChange={(month, year) => setViewDate(new Date(year, month, 1))}
          />
          <ArrowBtn onClick={() => setViewDate((d) => shiftMonth(d, 1))} dir="next" />
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CalendarGrid viewDate={viewDate} events={events} onDayClick={() => {}} />
          )}
        </div>

        <CalendarLegend />

        <div className="px-5 pb-4 text-center">
          <p className="text-small text-surface-400 italic">
            El calendario es gestionado por administracion. Solo lectura.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}

function ArrowBtn({ onClick, dir }: { onClick: () => void; dir: 'prev' | 'next' }) {
  return (
    <button onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-500 transition-colors hover:border-surface-300 hover:bg-surface-50 hover:text-surface-700" aria-label={dir === 'prev' ? 'Mes anterior' : 'Mes siguiente'}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'prev' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} />
      </svg>
    </button>
  )
}
