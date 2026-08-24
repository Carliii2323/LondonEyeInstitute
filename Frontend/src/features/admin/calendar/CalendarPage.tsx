import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { SearchInput } from '@/components/ui/SearchInput'
import { NewEventModal } from './NewEventModal'
import { CalendarToolbar } from './CalendarToolbar'
import { CalendarGrid } from '@/features/shared/calendar/CalendarGrid'
import { CalendarLegend } from '@/features/shared/calendar/CalendarLegend'
import { shiftMonth } from '@/features/shared/calendar/calendarHelpers'
import { calendarService } from '@/services/calendarService'
import { courseService } from '@/services/courseService'
import type { CalendarEvent } from '@/features/shared/calendar/types'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * CalendarPage — Calendario del administrador (conectado)
 *
 * Carga los eventos del mes visible (GET /calendar/events) y permite
 * crear nuevos (POST /admin/calendar/events).
 * ============================================================ */

export function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await calendarService.list(viewDate.getMonth() + 1, viewDate.getFullYear())
      setEvents(data)
    } catch (err) {
      setError(formatBackendError(err))
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [viewDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  /* Cursos para el select del modal — una vez */
  useEffect(() => {
    courseService
      .list({ status: 'activo', page_size: 100 })
      .then((res) => setCourses(res.data.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
  }, [])

  const filteredEvents = search
    ? events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : events

  return (
    <PageContainer
      title="Calendario"
      actions={
        <SearchInput
          placeholder="Buscar eventos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="w-64"
        />
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <CalendarToolbar
          viewDate={viewDate}
          onPrevMonth={() => setViewDate((d) => shiftMonth(d, -1))}
          onNextMonth={() => setViewDate((d) => shiftMonth(d, 1))}
          onMonthYearChange={(month, year) => setViewDate(new Date(year, month, 1))}
          onNewEvent={() => { setSelectedEvent(null); setSelectedDate(new Date()) }}
        />

        <div className="p-5">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CalendarGrid
              viewDate={viewDate}
              events={filteredEvents}
              onDayClick={(date) => { setSelectedEvent(null); setSelectedDate(date) }}
              onEventClick={(ev) => { setSelectedEvent(ev); setSelectedDate(isoToDate(ev.date)) }}
            />
          )}
        </div>

        <CalendarLegend />
      </div>

      <NewEventModal
        isOpen={selectedDate !== null}
        onClose={() => { setSelectedDate(null); setSelectedEvent(null) }}
        onCreated={fetchEvents}
        selectedDate={selectedDate}
        event={selectedEvent}
        courses={courses}
      />
    </PageContainer>
  )
}

/** "YYYY-MM-DD" → Date local (sin corrimiento UTC). */
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}
