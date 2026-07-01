import type { PaymentStatus, PaymentType } from '@/services/paymentService'

/* ============================================================
 * paymentFormat — Helpers de presentacion para pagos
 *
 * Mapea los estados/tipos del backend a etiquetas y variantes de Badge.
 * ============================================================ */

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'PENDIENTE', variant: 'warning' },
  submitted: { label: 'EN REVISION', variant: 'info' },
  approved: { label: 'PAGADO', variant: 'success' },
  rejected: { label: 'RECHAZADO', variant: 'danger' },
  overdue: { label: 'VENCIDO', variant: 'danger' },
  anulado: { label: 'ANULADO', variant: 'default' },
}

export function statusBadge(status: PaymentStatus): { label: string; variant: BadgeVariant } {
  return PAYMENT_STATUS_BADGE[status] ?? { label: status, variant: 'default' }
}

const TYPE_LABEL: Record<PaymentType, string> = {
  cuota_mensual: 'Cuota mensual',
  cargo_adicional: 'Cargo adicional',
  derecho_inscripcion: 'Derecho de inscripción',
  derecho_examen: 'Derecho de examen',
}

export function typeLabel(type: PaymentType): string {
  return TYPE_LABEL[type] ?? type
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** "Cuota mensual" → "Octubre 2026"; "Cargo adicional" → "2026" */
export function periodLabel(month: number | null, year: number): string {
  if (month && month >= 1 && month <= 12) {
    return `${MONTHS[month - 1]} ${year}`
  }
  return String(year)
}

export function formatMoney(value: string): string {
  const n = Number(value)
  return Number.isNaN(n) ? `$${value}` : `$${n.toLocaleString('es-AR')}`
}

/**
 * Formatea una fecha DATE ("YYYY-MM-DD") como local, sin pasar por UTC.
 * Evita el corrimiento de un dia en UTC-3 (ver tarea F3).
 */
export function formatDateOnly(iso: string): string {
  if (!iso) return '--'
  const [y, m, d] = iso.split('T')[0]!.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('es-AR')
}

/** Fecha local en formato "YYYY-MM-DD" (sin pasar por UTC). Para inputs date / defaults. */
export function toLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Fecha+hora ISO completa → "05/11/2026 14:32" */
export function formatDateTime(iso: string): string {
  if (!iso) return '--'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
