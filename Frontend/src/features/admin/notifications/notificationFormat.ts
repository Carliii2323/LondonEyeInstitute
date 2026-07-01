import type { AudienceType, NotificationItem } from '@/services/notificationService'

/* ============================================================
 * notificationFormat — Etiquetas de audiencia (admin)
 *
 * Mapea el modelo de audiencia del backend a texto legible.
 * ============================================================ */

/** Audiencias soportadas hoy por el formulario. */
export const AUDIENCE_OPTIONS: { value: AudienceType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'estudiantes', label: 'Estudiantes' },
  { value: 'docentes', label: 'Docentes' },
  { value: 'curso', label: 'Curso especifico' },
  { value: 'estudiante_especifico', label: 'Alumno especifico' },
]

const AUDIENCE_BASE: Record<AudienceType, string> = {
  todos: 'Todos',
  estudiantes: 'Estudiantes',
  docentes: 'Docentes',
  curso: 'Curso',
  estudiante_especifico: 'Alumno especifico',
  docente_especifico: 'Docente especifico',
}

/** Etiqueta para la card: incluye el nombre del curso si aplica. */
export function audienceLabel(item: NotificationItem): string {
  if (item.audience_type === 'curso') {
    return item.course_name ? `Curso: ${item.course_name}` : 'Curso'
  }
  return AUDIENCE_BASE[item.audience_type] ?? item.audience_type
}
