/* ============================================================
 * Tipos del modulo Notificaciones
 * ============================================================ */

export type NotificationType = 'urgente' | 'informativo' | 'evento' | 'archivado'

export type NotificationAudience =
  | 'todos'
  | 'conv_teen_1'
  | 'conv_teen_2'
  | 'adultos_b1'
  | 'adults_advanced'
  | 'docentes'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  audience: NotificationAudience
  /** Texto relativo para mostrar (ej. "Hace 2 horas", "Ayer") */
  timestamp: string
  createdAt: string
}