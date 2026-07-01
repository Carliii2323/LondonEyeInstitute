import type { StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * notificationService — Notificaciones / anuncios
 *
 *   GET    /notifications                (cualquier rol; backend filtra por audiencia)
 *   POST   /admin/notifications          (admin)
 *   PUT    /admin/notifications/:id       (admin)
 *   DELETE /admin/notifications/:id       (admin)
 *
 * El admin ve todas; alumno/docente solo las dirigidas a su audiencia.
 * ============================================================ */

export type NotificationType = 'urgente' | 'informativo' | 'evento' | 'archivado'

export type AudienceType =
  | 'todos'
  | 'estudiantes'
  | 'docentes'
  | 'curso'
  | 'estudiante_especifico'
  | 'docente_especifico'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  audience_type: AudienceType
  audience_course_id?: string
  course_name?: string
  audience_user_id?: string
  created_at: string
}

export interface CreateNotificationInput {
  title: string
  message: string
  type: NotificationType
  audience_type: AudienceType
  audience_course_id?: string
  audience_user_id?: string
}

export const notificationService = {
  list() {
    return httpClient.get<NotificationItem[]>('/notifications')
  },

  create(input: CreateNotificationInput) {
    return httpClient.post<{ id: string }>('/admin/notifications', input)
  },

  update(id: string, input: CreateNotificationInput) {
    return httpClient.put<StatusResponse>(`/admin/notifications/${id}`, input)
  },

  remove(id: string) {
    return httpClient.delete<StatusResponse>(`/admin/notifications/${id}`)
  },
}
