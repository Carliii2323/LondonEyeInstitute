import type { StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * enrollmentService — Endpoints de /admin/enrollments
 *
 * A diferencia de GET /admin/courses/:id/students (que devuelve el
 * id del ALUMNO), este listado trae el id de la INSCRIPCION, que es
 * el que se necesita para dar de baja (DELETE /admin/enrollments/:id).
 * ============================================================ */

export interface EnrollmentListItem {
  id: string // id de la inscripcion
  enrolled_at: string
  status: string
  student_id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  course_id: string
  course_name: string
  course_level: string
}

export interface EnrollmentResponse {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  status: string
  payment_generated: boolean
}

export interface ListEnrollmentsParams {
  student_id?: string
  course_id?: string
  status?: string
}

function buildQuery(params: ListEnrollmentsParams): string {
  const q = new URLSearchParams()
  if (params.student_id) q.set('student_id', params.student_id)
  if (params.course_id) q.set('course_id', params.course_id)
  if (params.status) q.set('status', params.status)
  return q.toString()
}

export const enrollmentService = {
  list(params: ListEnrollmentsParams = {}) {
    return httpClient.get<EnrollmentListItem[]>(`/admin/enrollments?${buildQuery(params)}`)
  },

  enroll(studentId: string, courseId: string) {
    return httpClient.post<EnrollmentResponse>('/admin/enrollments', {
      student_id: studentId,
      course_id: courseId,
    })
  },

  drop(enrollmentId: string) {
    return httpClient.delete<StatusResponse>(`/admin/enrollments/${enrollmentId}`)
  },
}
