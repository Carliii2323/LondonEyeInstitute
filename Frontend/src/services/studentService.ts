import type { PaginatedResponse, StatusResponse, UserStatus } from '@/types'
import type { PaymentStatus, PaymentType } from './paymentService'
import { httpClient } from './httpClient'

/* ============================================================
 * studentService — Endpoints de /admin/students
 *
 * Shapes exactos del backend (StudentListItem / StudentDetail DTOs).
 * ============================================================ */

/** Fila del listado — GET /admin/students */
export interface StudentListItem {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  phone: string
  tutor_name: string
  courses: string
  status: UserStatus
  email_verified: boolean
  created_at: string
}

/** Detalle completo — GET /admin/students/:id */
export interface StudentDetail {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  phone: string
  avatar_url: string
  status: UserStatus
  email_verified: boolean
  address: string
  tutor_name: string
  tutor_phone: string
  birth_date: string
  has_dni_front: boolean
  has_dni_back: boolean
  created_at: string
  updated_at: string
}

export type DniSide = 'front' | 'back'

/** Cuerpo de POST /admin/students */
export interface CreateStudentInput {
  email: string
  password: string
  first_name: string
  last_name: string
  dni: string
  phone: string
  address: string
  tutor_name: string
  tutor_phone: string
  birth_date?: string
}

/** Cuerpo de PUT /admin/students/:id */
export interface UpdateStudentInput {
  first_name: string
  last_name: string
  dni: string
  phone: string
  address: string
  tutor_name: string
  tutor_phone: string
  birth_date?: string
}

/** Pago de un alumno — GET /admin/students/:id/payments */
export interface StudentPaymentItem {
  id: string
  course_id: string
  course_name: string
  type: PaymentType
  month: number | null
  year: number
  amount: string
  late_fee_applied: string
  total: string
  due_date: string
  status: PaymentStatus
  receipt_url?: string
  rejection_reason?: string
  created_at: string
}

export interface ListStudentsParams {
  search?: string
  status?: string
  /** Filtra por inscripcion a ese curso. Vacio = todos. */
  course_id?: string
  /** Anio lectivo: alumnos cuya inscripcion se solapa con ese anio. 0 = todos. */
  year?: number
  page?: number
  page_size?: number
}

function buildQuery(params: ListStudentsParams): string {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.status) q.set('status', params.status)
  if (params.course_id) q.set('course_id', params.course_id)
  if (params.year) q.set('year', String(params.year))
  q.set('page', String(params.page ?? 1))
  q.set('page_size', String(params.page_size ?? 20))
  return q.toString()
}

export const studentService = {
  list(params: ListStudentsParams = {}) {
    return httpClient.get<PaginatedResponse<StudentListItem>>(`/admin/students?${buildQuery(params)}`)
  },

  getById(id: string) {
    return httpClient.get<StudentDetail>(`/admin/students/${id}`)
  },

  create(data: CreateStudentInput) {
    return httpClient.post<StudentDetail>('/admin/students', data)
  },

  update(id: string, data: UpdateStudentInput) {
    return httpClient.put<StudentDetail>(`/admin/students/${id}`, data)
  },

  updateStatus(id: string, status: 'active' | 'inactive') {
    return httpClient.patch<StatusResponse>(`/admin/students/${id}/status`, { status })
  },

  approve(id: string) {
    return httpClient.patch<StatusResponse>(`/admin/students/${id}/approve`)
  },

  getPayments(id: string) {
    return httpClient.get<StudentPaymentItem[]>(`/admin/students/${id}/payments`)
  },

  /** Sube el archivo del DNI (frente/dorso). PDF o imagen, máx 5 MB. */
  uploadDni(id: string, side: DniSide, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return httpClient.post<StatusResponse>(`/admin/students/${id}/dni/${side}`, fd)
  },

  /** Abre el archivo del DNI en una pestaña nueva (stream autenticado). */
  async openDni(id: string, side: DniSide) {
    const blob = await httpClient.getBlob(`/admin/students/${id}/dni/${side}`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },

  /** Datos propios del alumno autenticado — GET /student/profile (para el contrato). */
  getMyProfile() {
    return httpClient.get<StudentDetail>('/student/profile')
  },

  /** El alumno edita su propia dirección — PUT /student/profile/address (F9). */
  updateMyAddress(address: string) {
    return httpClient.put<StudentDetail>('/student/profile/address', { address })
  },
}
