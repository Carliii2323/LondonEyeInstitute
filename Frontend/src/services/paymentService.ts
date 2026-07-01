import type { PaginatedResponse, StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * paymentService — Endpoints de /admin/payments
 *
 * Shapes exactos del backend (PaymentListItem / PaymentDetail DTOs).
 * Estados del backend: pending | submitted | approved | rejected | overdue
 * Tipos: cuota_mensual | cargo_adicional
 * ============================================================ */

export type PaymentStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue' | 'anulado'
export type PaymentType = 'cuota_mensual' | 'cargo_adicional' | 'derecho_inscripcion' | 'derecho_examen'
export type PaymentMethod = 'transferencia' | 'efectivo'

/** Fila del listado — GET /admin/payments */
export interface PaymentListItem {
  id: string
  student_id: string
  first_name: string
  last_name: string
  dni: string
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
  payment_method?: PaymentMethod
  receipt_url?: string
  receipt_uploaded_at?: string
  created_at: string
}

/** Detalle — GET /admin/payments/:id */
export interface PaymentDetail extends PaymentListItem {
  observation?: string
  receipt_uploaded_at?: string
  reviewed_at?: string
  rejection_reason?: string
  updated_at: string
}

export interface ListPaymentsParams {
  student_id?: string
  course_id?: string
  status?: string
  type?: string
  search?: string
  month?: number
  year?: number
  page?: number
  page_size?: number
}

/** Fila del historial de revisiones — GET /admin/payments/reviews */
export interface ReviewedPaymentItem {
  id: string
  student_id: string
  student_name: string
  dni: string
  course_name: string
  type: PaymentType
  month: number | null
  year: number
  amount: string
  late_fee_applied: string
  total: string
  status: PaymentStatus
  payment_method?: PaymentMethod
  reviewed_at: string
  rejection_reason?: string
}

function buildQuery(params: ListPaymentsParams): string {
  const q = new URLSearchParams()
  if (params.student_id) q.set('student_id', params.student_id)
  if (params.course_id) q.set('course_id', params.course_id)
  if (params.status) q.set('status', params.status)
  if (params.type) q.set('type', params.type)
  if (params.search) q.set('search', params.search)
  if (params.month) q.set('month', String(params.month))
  if (params.year) q.set('year', String(params.year))
  q.set('page', String(params.page ?? 1))
  q.set('page_size', String(params.page_size ?? 20))
  return q.toString()
}

export const paymentService = {
  list(params: ListPaymentsParams = {}) {
    return httpClient.get<PaginatedResponse<PaymentListItem>>(`/admin/payments?${buildQuery(params)}`)
  },

  listPending() {
    return httpClient.get<PaymentListItem[]>('/admin/payments/pending')
  },

  /** Historial de revisiones (filtrable por mes/año de la revisión). */
  listReviews(year: number, month: number) {
    const q = new URLSearchParams()
    if (year) q.set('year', String(year))
    if (month) q.set('month', String(month))
    return httpClient.get<ReviewedPaymentItem[]>(`/admin/payments/reviews?${q.toString()}`)
  },

  getById(id: string) {
    return httpClient.get<PaymentDetail>(`/admin/payments/${id}`)
  },

  approve(id: string, paymentMethod?: PaymentMethod) {
    return httpClient.patch<StatusResponse>(
      `/admin/payments/${id}/approve`,
      paymentMethod ? { payment_method: paymentMethod } : undefined,
    )
  },

  reject(id: string, reason: string) {
    return httpClient.patch<StatusResponse>(`/admin/payments/${id}/reject`, { reason })
  },

  annul(id: string) {
    return httpClient.patch<StatusResponse>(`/admin/payments/${id}/annul`)
  },

  /** Crea un cobro individual (a un solo alumno). paid=true lo crea ya pagado. */
  createAdditionalCharge(input: {
    student_id: string
    course_id: string
    amount: string
    due_date: string
    observation: string
    paid?: boolean
    payment_method?: PaymentMethod
  }) {
    return httpClient.post<{ id: string }>('/admin/payments', input)
  },

  /** Pago adelantado: crea N cuotas mensuales futuras ya marcadas como pagadas. */
  createAdvance(input: {
    student_id: string
    course_id: string
    start_month: number
    start_year: number
    months: number
    payment_method?: PaymentMethod
  }) {
    return httpClient.post<{ created: number }>('/admin/payments/advance', input)
  },

  /** Crea un derecho (inscripción/examen) para todos los alumnos activos del curso. */
  createCourseCharge(input: {
    course_id: string
    type: 'derecho_inscripcion' | 'derecho_examen'
    amount: string
    due_date: string
    observation?: string
  }) {
    return httpClient.post<{ created: number }>('/admin/payments/course-charge', input)
  },

  /** Abre el comprobante en una pestaña nueva (descarga autenticada + blob URL). */
  async openReceipt(id: string) {
    const blob = await httpClient.getBlob(`/admin/payments/${id}/receipt`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    // Liberar el object URL despues de un rato (la pestaña ya lo cargo)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
