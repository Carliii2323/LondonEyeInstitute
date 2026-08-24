import { httpClient } from './httpClient'
import type { StatusResponse } from '@/types'

/* ============================================================
 * inboundService — Bandeja de comprobantes recibidos por mail
 *
 *   GET  /admin/inbound-receipts?status=
 *   GET  /admin/inbound-receipts/:id/candidates
 *   GET  /admin/inbound-receipts/:id/attachment
 *   POST /admin/inbound-receipts/:id/link      { payment_id, approve?, method? }
 *   POST /admin/inbound-receipts/:id/discard
 * ============================================================ */

export type InboundStatus = 'sin_identificar' | 'identificado' | 'vinculado' | 'descartado'

export interface InboundReceiptItem {
  id: string
  from_email: string
  subject: string
  body_excerpt: string
  attachment_filename: string
  status: InboundStatus
  received_at: string
  student_id: string
  student_name: string
  student_email: string
  linked_payment_id: string
  detected_dni: string
  detected_amount: string
}

export interface InboundCandidatePayment {
  id: string
  label: string
  total: string
  status: string
  matches_amount: boolean
}

export interface InboundSuggestion {
  receipt_id: string
  suggested_student_id: string
  suggested_student_name: string
  match_source: 'email' | 'dni' | ''
  detected_dni: string
  detected_amount: string
  payments: InboundCandidatePayment[]
}

export interface LinkInboundInput {
  payment_id: string
  approve?: boolean
  method?: string
}

export const inboundService = {
  list(status?: InboundStatus) {
    const q = status ? `?status=${status}` : ''
    return httpClient.get<InboundReceiptItem[]>(`/admin/inbound-receipts${q}`)
  },

  candidates(id: string, studentId?: string) {
    const q = studentId ? `?student_id=${studentId}` : ''
    return httpClient.get<InboundSuggestion>(`/admin/inbound-receipts/${id}/candidates${q}`)
  },

  link(id: string, input: LinkInboundInput) {
    return httpClient.post<StatusResponse>(`/admin/inbound-receipts/${id}/link`, input)
  },

  discard(id: string) {
    return httpClient.post<StatusResponse>(`/admin/inbound-receipts/${id}/discard`, {})
  },

  /** Dispara el poll IMAP al instante (no espera el ciclo de cron). */
  pollNow() {
    return httpClient.post<{ result?: { processed?: number } }>('/admin/cron/run/poll-inbound', {})
  },

  async openAttachment(id: string) {
    const blob = await httpClient.getBlob(`/admin/inbound-receipts/${id}/attachment`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
