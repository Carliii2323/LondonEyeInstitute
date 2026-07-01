import { totalGrade, type TermScores } from '@/features/shared/grades/gradeCalc'

/* ============================================================
 * reportCard — Datos y helpers del REPORT CARD (planilla de notas)
 *
 * Combina notas (R/W/L/S + make up por término) con ausencias por término.
 * Total Average = mismo criterio que el certificado (gradeCalc.totalGrade).
 * ============================================================ */

export interface ReportCardTerm {
  reading: number | null
  writing: number | null
  listening: number | null
  speaking: number | null
  makeup: number | null
  absences: number
}

export interface ReportCardData {
  studentName: string
  level: string // nombre del curso
  year: number
  term1: ReportCardTerm
  term2: ReportCardTerm
}

const ENGLISH_NUMBERS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

export function numberToEnglish(n: number): string {
  return ENGLISH_NUMBERS[n] ?? String(n)
}

function toScores(t: ReportCardTerm): TermScores {
  return { reading: t.reading, listening: t.listening, speaking: t.speaking, writing: t.writing, makeup: t.makeup }
}

/** Promedio final (0–10, entero) con el mismo criterio que el certificado. */
export function reportCardTotal(d: ReportCardData): number | null {
  return totalGrade(toScores(d.term1), toScores(d.term2))
}

/** Mensaje final según el promedio (textos por defecto, ajustables). */
export function reportCardMessage(total: number | null): string {
  if (total === null) return ''
  if (total >= 9) return 'Excellent! You should be proud of your achievement!!'
  if (total >= 7) return 'Well done! You should be proud of your achievement!!'
  if (total >= 6) return 'Good effort! Keep working to improve.'
  return 'Keep working to reach the required level.'
}
