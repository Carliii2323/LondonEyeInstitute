import { httpClient } from './httpClient'

/* ============================================================
 * certificateService — Certificados
 *
 *   Admin:
 *     GET  /admin/certificates    -> todos
 *     POST /admin/certificates    -> emitir (valida elegibilidad: cuotas al día)
 *   Alumno:
 *     GET  /student/certificates       -> los míos
 *     GET  /student/certificates/:id   -> detalle (para el preview)
 * ============================================================ */

export interface CertificateItem {
  id: string
  student_id: string
  first_name: string
  last_name: string
  dni: string
  course_id: string
  course_name: string
  year: number
  issued_at: string
  avg_grade: number | null
  attendance_pct: number | null
  presential_hours: number | null
  status: string
}

export interface CertificateDetail {
  id: string
  student_id: string
  first_name: string
  last_name: string
  dni: string
  course_id: string
  course_name: string
  course_level: string
  year: number
  issued_at: string
  avg_grade: number | null
  attendance_pct: number | null
  presential_hours: number | null
  status: string
}

export interface StudentCertificateItem {
  id: string
  course_id: string
  course_name: string
  year: number
  issued_at: string
  avg_grade: number | null
  attendance_pct: number | null
  presential_hours: number | null
  status: string
}

export interface IssueCertificateInput {
  student_id: string
  course_id: string
  year: number
  avg_grade?: number | null
  attendance_pct?: number | null
  presential_hours?: number | null
}

export const certificateService = {
  list() {
    return httpClient.get<CertificateItem[]>('/admin/certificates')
  },

  issue(input: IssueCertificateInput) {
    return httpClient.post<CertificateDetail>('/admin/certificates', input)
  },

  listMine() {
    return httpClient.get<StudentCertificateItem[]>('/student/certificates')
  },

  getById(id: string) {
    return httpClient.get<CertificateDetail>(`/student/certificates/${id}`)
  },
}
