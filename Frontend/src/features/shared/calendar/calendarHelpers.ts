/* ============================================================
 * calendarHelpers — Funciones puras para manejo de fechas
 *
 * Todas las funciones son deterministicas y sin side-effects.
 * Se testean facil si hace falta.
 * ============================================================ */

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Formato "OCTUBRE 2024" */
export function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`.toUpperCase()
}

/** Formato "Miercoles 22 de Octubre 2024" */
export function formatLongDate(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  return `${dayName} ${day} de ${month} ${date.getFullYear()}`
}

/** Formato ISO local (evita problemas de UTC) */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Devuelve la matriz de 42 dias (6 semanas de lunes a domingo)
 * que representa un mes en la vista de calendario.
 * Incluye los dias del mes anterior y siguiente para llenar el grid.
 */
export function buildMonthMatrix(viewDate: Date): Date[] {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstOfMonth = new Date(year, month, 1)

  /* Lunes = 1, Domingo = 0 en JS; ajustamos para que la semana arranque en lunes */
  const firstDayOffset = (firstOfMonth.getDay() + 6) % 7

  const startDate = new Date(year, month, 1 - firstDayOffset)

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i))
  }

  return days
}

/** Navegar mes anterior / siguiente sin mutar la fecha original */
export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(date: Date, reference: Date): boolean {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear()
}