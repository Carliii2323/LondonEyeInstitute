import type { NotificationAudience, NotificationType } from './types'

/* ============================================================
 * notificationHelpers — Mapeos de label / variante UI
 *
 * Centralizar estos diccionarios evita strings magicos
 * desparramados por la UI.
 * ============================================================ */

export const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  todos: 'Todos los alumnos',
  conv_teen_1: 'Conv. Teen I',
  conv_teen_2: 'Conv. Teen II',
  adultos_b1: 'Adultos B1',
  adults_advanced: 'Adults Advanced',
  docentes: 'Solo docentes',
}

export const AUDIENCE_BADGE_LABEL: Record<NotificationAudience, string> = {
  todos: 'TODOS LOS ALUMNOS',
  conv_teen_1: 'CONV. TEEN I',
  conv_teen_2: 'CONV. TEEN II',
  adultos_b1: 'ADULTOS B1',
  adults_advanced: 'ADULTS ADVANCED',
  docentes: 'SOLO DOCENTES',
}

export const TYPE_LABEL: Record<NotificationType, string> = {
  urgente: 'Urgente',
  informativo: 'Informativo',
  evento: 'Evento',
  archivado: 'Archivado',
}

/** Color de la barra lateral izquierda en cada card */
export const TYPE_BAR_COLOR: Record<NotificationType, string> = {
  urgente: 'bg-accent-500',
  informativo: 'bg-royal-500',
  evento: 'bg-emerald-500',
  archivado: 'bg-surface-300',
}

/** Variante del Badge segun tipo */
export const TYPE_BADGE_VARIANT: Record<NotificationType, 'danger' | 'info' | 'success' | 'default'> = {
  urgente: 'danger',
  informativo: 'info',
  evento: 'success',
  archivado: 'default',
}