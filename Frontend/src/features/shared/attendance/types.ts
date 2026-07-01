/* ============================================================
 * Tipos del modulo Asistencia
 * ============================================================ */

export type AttendanceStatus = 'presente' | 'ausente' | 'justificado'

export interface AttendanceRecord {
  studentId: string
  studentName: string
  studentInitials: string
  status: AttendanceStatus
  note: string
}

export interface AttendanceHistoryEntry {
  date: string
  status: AttendanceStatus
  observation: string
}