import { AttendancePage } from '@/features/admin/attendance/AttendancePage'

/* ============================================================
 * TeacherAttendancePage — Asistencia del docente
 *
 * Reutiliza la pantalla de asistencia en modo 'teacher' (usa los
 * endpoints /teacher/* con verificación de propiedad del curso).
 * ============================================================ */

export function TeacherAttendancePage() {
  return <AttendancePage scope="teacher" />
}
