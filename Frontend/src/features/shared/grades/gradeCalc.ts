/* ============================================================
 * gradeCalc — Reglas de cálculo de notas (planilla London Eye)
 *
 *   - Nota del término = promedio de R/L/S/W.
 *     Si hay Make Up en el término, REEMPLAZA ese promedio.
 *   - TOTAL = promedio de las notas (ya promediadas) de cada término.
 *   - Todo se redondea a entero, mitad para arriba (8.4->8, 8.5->9).
 * ============================================================ */

export interface TermScores {
  reading: number | null
  listening: number | null
  speaking: number | null
  writing: number | null
  makeup: number | null
}

/** Redondeo a entero, mitad para arriba. */
export function roundHalfUp(n: number): number {
  return Math.round(n)
}

/** Promedio de las skills cargadas (ignora vacías). null si no hay ninguna. */
export function termAverage(t: TermScores): number | null {
  const vals = [t.reading, t.listening, t.speaking, t.writing].filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Nota final del término (entero): make-up si existe, si no el promedio. */
export function termGrade(t: TermScores): number | null {
  if (t.makeup !== null) return roundHalfUp(t.makeup)
  const avg = termAverage(t)
  return avg === null ? null : roundHalfUp(avg)
}

/** TOTAL: promedio (entero) de las notas de término existentes. */
export function totalGrade(term1: TermScores, term2: TermScores): number | null {
  const grades = [termGrade(term1), termGrade(term2)].filter((v): v is number => v !== null)
  if (grades.length === 0) return null
  return roundHalfUp(grades.reduce((a, b) => a + b, 0) / grades.length)
}
