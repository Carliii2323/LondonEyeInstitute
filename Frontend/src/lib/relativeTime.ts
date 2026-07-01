/* ============================================================
 * relativeTime — "Hace 5 min" / "Hace 2 h" / fecha si es viejo
 *
 * Para timestamps ISO completos (created_at, at). Para fechas DATE
 * sin hora usar formatDateOnly de paymentFormat.
 * ============================================================ */

export function relativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const min = Math.floor((Date.now() - date.getTime()) / 60000)
  if (min < 1) return 'Recien'
  if (min < 60) return `Hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `Hace ${hr} h`
  const day = Math.floor(hr / 24)
  if (day < 30) return `Hace ${day} d`
  return date.toLocaleDateString('es-AR')
}
