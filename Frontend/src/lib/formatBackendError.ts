import { HttpError } from '@/services/httpClient'

/* ============================================================
 * formatBackendError — Traduce los `code` del backend a mensajes
 * en español para el usuario.
 *
 * Centraliza el manejo de errores: en vez de recordar cada code en
 * cada page, se llama formatBackendError(err) y se muestra el string.
 * ============================================================ */

const MESSAGES: Record<string, string> = {
  // Auth
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
  ACCOUNT_NOT_ACTIVE: 'Tu cuenta está pendiente de aprobación o inactiva.',
  INVALID_TOKEN: 'Tu sesión expiró. Iniciá sesión de nuevo.',
  SESSION_EXPIRED: 'Tu sesión expiró. Iniciá sesión de nuevo.',

  // Usuarios / unicidad
  EMAIL_TAKEN: 'El email ya está registrado.',
  DNI_TAKEN: 'El DNI ya está registrado.',

  // Inscripciones / cursos
  COURSE_FULL: 'El curso no tiene cupo disponible.',
  NOT_ENROLLED: 'El estudiante no está inscripto en este curso.',
  ALREADY_ENROLLED: 'El estudiante ya está inscripto en este curso.',
  COURSE_NOT_YOURS: 'No tenés acceso a este curso.',

  // Pagos
  PAYMENT_INVALID_STATE: 'El estado del pago cambió. Actualizá la información e intentá de nuevo.',
  PAYMENT_NOT_FOUND: 'No se encontró el pago.',
  INVALID_AMOUNT: 'El monto ingresado no es válido.',

  // Certificados
  NOT_ELIGIBLE: 'El alumno no es elegible: tiene cuotas mensuales sin aprobar.',
  ALREADY_ISSUED: 'Ya existe un certificado para este alumno, curso y año.',

  // Notas / asistencia
  OUTSIDE_EDITABLE_WINDOW: 'No se pueden editar registros de períodos anteriores.',
  INVALID_SCORE: 'Las notas deben estar entre 0 y 10.',

  // Validación de formularios (binding de Gin)
  VALIDATION_ERROR: 'Revisá los datos del formulario.',

  // Notificaciones / configuración
  INVALID_AUDIENCE: 'La audiencia de la notificación no es válida.',
  INVALID_LATE_FEE: 'El recargo configurado no es válido.',
  INVALID_MONTHS: 'Los meses sin pago no son válidos.',

  // Genéricos
  NOT_YOURS: 'No tenés acceso a este recurso.',
  NOT_FOUND: 'No se encontró el recurso solicitado.',
  UNKNOWN_JOB: 'Tarea desconocida.',
}

/**
 * Devuelve un mensaje legible para el usuario a partir de un error.
 * - Si es HttpError con un code conocido → el mensaje mapeado.
 * - Si es HttpError sin code conocido → el `error` que mandó el backend.
 * - Cualquier otra cosa → mensaje genérico.
 */
export function formatBackendError(err: unknown): string {
  if (err instanceof HttpError) {
    const code = err.body.code
    if (code && MESSAGES[code]) {
      return MESSAGES[code]
    }
    return err.body.error || 'Ocurrió un error inesperado.'
  }
  return 'No se pudo conectar con el servidor. Revisá tu conexión.'
}
