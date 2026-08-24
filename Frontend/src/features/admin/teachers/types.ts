/* ============================================================
 * Tipos del modulo Docentes
 * ============================================================ */

export type TeacherStatus = 'activo' | 'sin_cursos' | 'inactivo'

export interface Teacher {
  id: string
  name: string
  initials: string
  dni: string
  assignedCourses: string[]
  email: string
  status: TeacherStatus
}

export interface TeacherDetail extends Teacher {
  phone: string
  joinDate: string
  totalStudents: number
  notes: string | null
}