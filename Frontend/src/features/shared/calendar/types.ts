/* ============================================================
 * Tipos del modulo Calendario
 * ============================================================ */

export type EventType = 'vencimiento' | 'evento' | 'feriado' | 'otro'

export type CalendarView = 'mes' | 'semana' | 'dia'

export interface CalendarEvent {
  id: string
  title: string
  type: EventType
  /** Fecha en formato ISO (YYYY-MM-DD) */
  date: string
  start_time?: string
  end_time?: string
  message?: string
  course_id?: string
  course_name?: string
  created_at?: string
}