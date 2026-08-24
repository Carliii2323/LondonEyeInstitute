import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { NewEventModal } from '@/features/admin/calendar/NewEventModal'
import { CalendarGrid } from '@/features/shared/calendar/CalendarGrid'
import { CalendarLegend } from '@/features/shared/calendar/CalendarLegend'
import { shiftMonth } from '@/features/shared/calendar/calendarHelpers'
import { calendarService } from '@/services/calendarService'
import { courseService } from '@/services/courseService'
import { useAuthStore } from '@/stores/authStore'
import type { CalendarEvent } from '@/features/shared/calendar/types'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * TeacherCalendarPage — Calendario del docente
 *
 * Ve eventos generales + los de sus cursos. Puede crear eventos de SUS
 * cursos, y editar/eliminar solo los que él creó (el backend lo valida).
 * ============================================================ */

export function TeacherCalendarPage() {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
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

  // Cursos del docente para el select del modal.
  useEffect(() => {
    courseService
      .listMine()
      .then((list) => setCourses(list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
  }, [])

  return (
    <PageContainer
      title="Calendario"
      actions={
        <Button variant="danger" onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()) }}>
          + Nuevo Evento
        </Button>
      }
    >
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
            <CalendarGrid
              viewDate={viewDate}
              events={events}
              onDayClick={(date) => { setSelectedEvent(null); setSelectedDate(date) }}
              onEventClick={(ev) => {
                // Solo puede editar los eventos que él creó.
                if (ev.created_by && ev.created_by === userId) {
                  setSelectedEvent(ev)
                  setSelectedDate(isoToDate(ev.date))
                }
              }}
            />
          )}
        </div>

        <CalendarLegend />

        <div className="px-5 pb-4 text-center">
          <p className="text-small text-surface-400 italic">Podés crear eventos de tus cursos y editar los que vos creaste.</p>
        </div>
      </div>

      <NewEventModal
        isOpen={selectedDate !== null}
        onClose={() => { setSelectedDate(null); setSelectedEvent(null) }}
        onCreated={fetchEvents}
        selectedDate={selectedDate}
        event={selectedEvent}
        courses={courses}
        asTeacher
      />
    </PageContainer>
  )
}

/** "YYYY-MM-DD" → Date local (sin corrimiento UTC). */
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
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
