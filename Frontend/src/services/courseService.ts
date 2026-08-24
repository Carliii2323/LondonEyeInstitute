import type { PaginatedResponse, StatusResponse, UserStatus } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * courseService — Endpoints de /admin/courses
 *
 * Shapes del backend (CourseListItem / CourseDetail DTOs).
 * El backend trae enrolled_count y datos del docente asignado.
 * ============================================================ */

export type CourseStatus = 'activo' | 'cupo_completo' | 'inactivo'

export type CourseLevel =
  | 'ELEMENTAL A1'
  | 'PRE-INTERMEDIO'
  | 'INTERMEDIO'
  | 'INTERMEDIO ALTO'
  | 'C1 ADVANCED'

export const COURSE_LEVELS: CourseLevel[] = [
  'ELEMENTAL A1',
  'PRE-INTERMEDIO',
  'INTERMEDIO',
  'INTERMEDIO ALTO',
  'C1 ADVANCED',
]

export interface CourseListItem {
  id: string
  name: string
  level: CourseLevel
  schedule: string
  price_monthly: string
  inscripcion_price: string | null
  examen_price: string | null
  classroom_code: string
  capacity: number
  enrolled_count: number
  status: CourseStatus
  teacher_id: string
  teacher_first_name: string
  teacher_last_name: string
  created_at: string
}

export interface CourseDetail extends CourseListItem {
  updated_at: string
}

/** Alumno inscripto — GET /admin/courses/:id/students */
export interface CourseStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  phone: string
  status: UserStatus
  enrolled_at: string
  /** Estado de la cuota mensual del mes en curso ("" = sin cuota generada). */
  payment_status: string
}

export interface CourseInput {
  name: string
  level: string
  schedule: string
  price_monthly: string
  inscripcion_price?: string | null
  examen_price?: string | null
  classroom_code?: string
  capacity: number
  teacher_id: string
}

/** Agregados de cursos — GET /admin/courses/stats. */
export interface CourseStats {
  active: number
  full: number
  inactive: number
  enrolled: number
}

/** Curso del alumno — GET /student/courses ("Mis Cursos"). */
export interface StudentCourse {
  id: string
  name: string
  level: CourseLevel
  schedule: string
  classroom_code: string
  teacher_name: string
}

export interface ListCoursesParams {
  search?: string
  status?: string
  page?: number
  page_size?: number
}

function buildQuery(params: ListCoursesParams): string {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.status) q.set('status', params.status)
  q.set('page', String(params.page ?? 1))
  q.set('page_size', String(params.page_size ?? 20))
  return q.toString()
}

export const courseService = {
  list(params: ListCoursesParams = {}) {
    return httpClient.get<PaginatedResponse<CourseListItem>>(`/admin/courses?${buildQuery(params)}`)
  },

  getById(id: string) {
    return httpClient.get<CourseDetail>(`/admin/courses/${id}`)
  },

  stats() {
    return httpClient.get<CourseStats>('/admin/courses/stats')
  },

  create(data: CourseInput) {
    return httpClient.post<CourseDetail>('/admin/courses', data)
  },

  update(id: string, data: CourseInput) {
    return httpClient.put<CourseDetail>(`/admin/courses/${id}`, data)
  },

  updateStatus(id: string, status: CourseStatus) {
    return httpClient.patch<StatusResponse>(`/admin/courses/${id}/status`, { status })
  },

  getStudents(id: string) {
    return httpClient.get<CourseStudent[]>(`/admin/courses/${id}/students`)
  },

  /** Cursos del docente autenticado — GET /teacher/courses */
  listMine() {
    return httpClient.get<CourseListItem[]>('/teacher/courses')
  },

  /** Cursos del alumno autenticado — GET /student/courses */
  studentCourses() {
    return httpClient.get<StudentCourse[]>('/student/courses')
  },

  /** Cursos asignados a un docente (admin) — GET /admin/teachers/:id/courses */
  listByTeacher(teacherId: string) {
    return httpClient.get<CourseListItem[]>(`/admin/teachers/${teacherId}/courses`)
  },

  /** Roster de un curso del docente — GET /teacher/courses/:id/students */
  getStudentsAsTeacher(id: string) {
    return httpClient.get<CourseStudent[]>(`/teacher/courses/${id}/students`)
  },
}
