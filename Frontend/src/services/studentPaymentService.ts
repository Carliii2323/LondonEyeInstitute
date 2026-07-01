import type { StatusResponse } from '@/types'
import type { StudentPaymentItem } from './studentService'
import { httpClient } from './httpClient'

/* ============================================================
 * studentPaymentService — Endpoints propios del alumno
 *
 *   GET  /student/payments            → mis cuotas/cargos
 *   POST /student/payments/:id/receipt → subir comprobante (multipart)
 *
 * Reutiliza el DTO StudentPaymentItem (mismo shape que el backend
 * devuelve en /admin/students/:id/payments).
 * ============================================================ */

export const studentPaymentService = {
  listMine() {
    return httpClient.get<StudentPaymentItem[]>('/student/payments')
  },

  /** Sube un comprobante a un pago propio. Estados permitidos: pending/overdue/rejected. */
  submitReceipt(paymentId: string, file: File) {
    const form = new FormData()
    form.append('receipt', file)
    return httpClient.post<StatusResponse>(`/student/payments/${paymentId}/receipt`, form)
  },

  /** Abre el propio comprobante en una pestaña nueva (descarga autenticada + blob). */
  async openReceipt(paymentId: string) {
    const blob = await httpClient.getBlob(`/student/payments/${paymentId}/receipt`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
