import type { StatusResponse } from '@/types'
import type { CalendarEvent, EventType } from '@/features/shared/calendar/types'
import { httpClient } from './httpClient'

/* ============================================================
 * calendarService — Eventos del calendario
 *
 *   GET    /calendar/events?month&year   (cualquier rol, filtrado por backend)
 *   POST   /admin/calendar/events        (admin)
 *   PUT    /admin/calendar/events/:id    (admin)
 *   DELETE /admin/calendar/events/:id    (admin)
 *
 * El backend devuelve el shape CalendarEventItem, que mapeamos 1:1 al
 * tipo compartido CalendarEvent (snake_case, sin traduccion).
 * ============================================================ */

export interface CreateEventInput {
  title: string
  type: EventType
  date: string // YYYY-MM-DD
  start_time?: string // HH:MM
  end_time?: string // HH:MM
  message?: string
  course_id?: string
}

export const calendarService = {
  list(month: number, year: number) {
    return httpClient.get<CalendarEvent[]>(`/calendar/events?month=${month}&year=${year}`)
  },

  create(input: CreateEventInput) {
    return httpClient.post<{ id: string }>('/admin/calendar/events', input)
  },

  update(id: string, input: CreateEventInput) {
    return httpClient.put<StatusResponse>(`/admin/calendar/events/${id}`, input)
  },

  remove(id: string) {
    return httpClient.delete<StatusResponse>(`/admin/calendar/events/${id}`)
  },
}
