import type { StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * libretaService — Descarga de la libreta (REPORT CARD) con autorización
 *
 * La 1ra descarga de cada libreta (curso/año) es libre; las siguientes
 * requieren que el alumno solicite autorización y el admin la apruebe
 * (cada aprobación habilita una única descarga).
 *
 *   Alumno:
 *     GET  /student/libreta/requests   -> mis filas (para computar el estado)
 *     POST /student/libreta/download   -> consume una descarga (1ra libre / autorizada)
 *     POST /student/libreta/request    -> solicita autorización
 *   Admin:
 *     GET  /admin/libreta/requests           -> solicitudes pendientes
 *     POST /admin/libreta/requests/:id/approve
 *     POST /admin/libreta/requests/:id/reject
 * ============================================================ */

export type LibretaStatus = 'pending' | 'approved' | 'rejected' | 'consumed'

export interface LibretaRequestRow {
  id: string
  course_id: string
  year: number
  status: LibretaStatus
  created_at: string
}

export interface AdminLibretaRequest {
  id: string
  student_id: string
  student_name: string
  course_id: string
  course_name: string
  year: number
  status: LibretaStatus
  created_at: string
}

export interface LibretaTarget {
  course_id: string
  year: number
}

export const libretaService = {
  listMine() {
    return httpClient.get<LibretaRequestRow[]>('/student/libreta/requests')
  },

  download(target: LibretaTarget) {
    return httpClient.post<StatusResponse>('/student/libreta/download', target)
  },

  request(target: LibretaTarget) {
    return httpClient.post<StatusResponse>('/student/libreta/request', target)
  },

  listPending() {
    return httpClient.get<AdminLibretaRequest[]>('/admin/libreta/requests')
  },

  approve(id: string) {
    return httpClient.post<StatusResponse>(`/admin/libreta/requests/${id}/approve`)
  },

  reject(id: string) {
    return httpClient.post<StatusResponse>(`/admin/libreta/requests/${id}/reject`)
  },
}
