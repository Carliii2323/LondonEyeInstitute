import type { StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * attendanceService — Asistencia
 *
 *   Admin/teacher:
 *     GET  /admin/attendance?course_id&date       -> sesion (records guardados)
 *     POST /admin/attendance                       -> guardar sesion
 *     GET  /admin/attendance/annual?course_id&year -> planilla anual
 *     GET  /admin/attendance/:studentId/history?course_id -> historial alumno
 *   Alumno:
 *     GET  /student/attendance                      -> mi asistencia (todos los cursos)
 *
 * Estados: presente | ausente | justificado (igual que el backend).
 * ============================================================ */

export type AttendanceStatusValue = 'presente' | 'ausente' | 'justificado'

export interface SessionRecord {
  student_id: string
  first_name: string
  last_name: string
  dni: string
  status: AttendanceStatusValue
  observation: string
}

export interface AttendanceSession {
  session_id: string
  course_id: string
  date: string
  records: SessionRecord[]
}

export interface AttendanceHistoryItem {
  date: string
  course_id: string
  course_name: string
  status: AttendanceStatusValue
  observation: string
}

export interface AnnualAttendanceRow {
  student_id: string
  first_name: string
  last_name: string
  dni: string
  date: string
  status: AttendanceStatusValue
}

export interface SaveAttendanceInput {
  course_id: string
  date: string
  records: { student_id: string; status: AttendanceStatusValue; observation: string }[]
}

/** 'admin' usa /admin/attendance; 'teacher' usa /teacher/attendance (con ownership). */
export type AttendanceScope = 'admin' | 'teacher'

export const attendanceService = {
  getSession(courseId: string, date: string, scope: AttendanceScope = 'admin') {
    return httpClient.get<AttendanceSession>(`/${scope}/attendance?course_id=${courseId}&date=${date}`)
  },

  save(input: SaveAttendanceInput, scope: AttendanceScope = 'admin') {
    return httpClient.post<StatusResponse>(`/${scope}/attendance`, input)
  },

  // El listado anual solo existe para admin.
  getAnnual(courseId: string, year: number) {
    return httpClient.get<AnnualAttendanceRow[]>(`/admin/attendance/annual?course_id=${courseId}&year=${year}`)
  },

  getHistory(studentId: string, courseId: string | undefined, scope: AttendanceScope = 'admin') {
    const q = courseId ? `?course_id=${courseId}` : ''
    return httpClient.get<AttendanceHistoryItem[]>(`/${scope}/attendance/${studentId}/history${q}`)
  },

  getMine(courseId?: string) {
    const q = courseId ? `?course_id=${courseId}` : ''
    return httpClient.get<AttendanceHistoryItem[]>(`/student/attendance${q}`)
  },
}
