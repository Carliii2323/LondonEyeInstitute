import { GradesPage } from '@/features/admin/grades/GradesPage'

/* ============================================================
 * TeacherGradesPage — Notas del docente
 *
 * Reutiliza la planilla de notas en modo 'teacher' (endpoints
 * /teacher/grades con verificación de propiedad del curso).
 * ============================================================ */

export function TeacherGradesPage() {
  return <GradesPage scope="teacher" />
}
