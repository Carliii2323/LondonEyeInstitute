/* ============================================================
 * Tipos del modulo Cursos
 * ============================================================ */

export type CourseStatus = 'activo' | 'cupo_completo' | 'inactivo'

export type CourseLevel =
  | 'ELEMENTAL A1'
  | 'PRE-INTERMEDIO'
  | 'INTERMEDIO'
  | 'INTERMEDIO ALTO'
  | 'C1 ADVANCED'

export interface Course {
  id: string
  name: string
  level: CourseLevel
  schedule: string
  priceMonthly: number
  capacity: number
  enrolled: number
  status: CourseStatus
}