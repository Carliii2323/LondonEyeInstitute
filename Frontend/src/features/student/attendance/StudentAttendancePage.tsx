import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/Badge'
import { attendanceService, type AttendanceHistoryItem, type AttendanceStatusValue } from '@/services/attendanceService'
import { gradeService, type StudentGradeRow, type MakeupRow } from '@/services/gradeService'
import { termGrade, totalGrade, type TermScores } from '@/features/shared/grades/gradeCalc'
import { formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * StudentAttendancePage — Mi asistencia y mis notas (conectado)
 *
 * Asistencia: GET /student/attendance. Notas: GET /student/grades.
 * Filtro de curso en memoria (union de ambos).
 * ============================================================ */

const STATUS_BADGE: Record<AttendanceStatusValue, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  presente: { label: 'PRESENTE', variant: 'success' },
  ausente: { label: 'AUSENTE', variant: 'danger' },
  justificado: { label: 'JUSTIFICADO', variant: 'warning' },
}

const MIN_REQUIRED = 75

const SKILLS: { key: keyof TermScores; label: string }[] = [
  { key: 'reading', label: 'Reading' },
  { key: 'listening', label: 'Listening' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'writing', label: 'Writing' },
]

export function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceHistoryItem[]>([])
  const [grades, setGrades] = useState<StudentGradeRow[]>([])
  const [makeups, setMakeups] = useState<MakeupRow[]>([])
  const [course, setCourse] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([attendanceService.getMine(), gradeService.getMine()])
      .then(([att, gr]) => {
        if (!active) return
        setAttendance(att)
        setGrades(gr.grades)
        setMakeups(gr.makeups)
      })
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const courseOptions = useMemo(
    () => [...new Set([...attendance.map((a) => a.course_name), ...grades.map((g) => g.course_name)])].sort(),
    [attendance, grades],
  )

  const filteredAtt = course ? attendance.filter((a) => a.course_name === course) : attendance
  const total = filteredAtt.length
  const presentes = filteredAtt.filter((i) => i.status === 'presente').length
  const ausentes = filteredAtt.filter((i) => i.status === 'ausente').length
  const justificados = filteredAtt.filter((i) => i.status === 'justificado').length
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0
  const meetsMin = pct >= MIN_REQUIRED

  // Notas del curso seleccionado
  const terms = useMemo(() => buildTerms(grades, makeups, course), [grades, makeups, course])

  return (
    <PageContainer title="Asistencia y Notas">
      {/* Filtro de curso */}
      <div className="bg-white rounded-card shadow-card p-4 flex items-end gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-small font-semibold text-surface-500 uppercase tracking-wider">Curso</label>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="appearance-none px-3 py-2.5 pr-8 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%205l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat"
          >
            <option value="">Todos los cursos</option>
            {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Asistencia */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="font-heading text-section-title text-surface-900">Mi Asistencia</h2>
          <p className="text-small text-surface-500 mt-0.5 mb-4">{course || 'Todos los cursos'}</p>

          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {/* Mobile: bento de stats (estructura del Figma, tokens del proyecto) */}
              <div className="grid grid-cols-3 gap-2 mb-4 lg:hidden">
                <StatCard value={presentes} label="Presentes" tone="emerald" />
                <StatCard value={ausentes} label="Ausentes" tone="accent" />
                <StatCard value={justificados} label="Justif." tone="amber" />
              </div>

              {/* Desktop: pills (sin cambios) */}
              <div className="hidden lg:flex flex-wrap gap-2 mb-4">
                <Pill color="emerald" label={`Presentes: ${presentes}`} />
                <Pill color="accent" label={`Ausentes: ${ausentes}`} />
                <Pill color="amber" label={`Justificados: ${justificados}`} />
                <Pill color="surface" label={`Total: ${total}`} />
              </div>

              <div className="hidden lg:block max-h-[22rem] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-100">
                      {['Fecha', 'Curso', 'Estado', 'Obs.'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredAtt.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-body text-surface-400">Sin registros.</td></tr>
                    ) : (
                      filteredAtt.map((a, i) => (
                        <tr key={`${a.date}-${a.course_id}-${i}`}>
                          <td className="px-3 py-3 text-body text-surface-700 whitespace-nowrap">{formatDateOnly(a.date)}</td>
                          <td className="px-3 py-3 text-body text-surface-600">{a.course_name}</td>
                          <td className="px-3 py-3"><Badge variant={STATUS_BADGE[a.status].variant}>{STATUS_BADGE[a.status].label}</Badge></td>
                          <td className="px-3 py-3 text-body text-surface-500 italic">{a.observation || <span className="text-surface-300">--</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile: registros como cards apiladas */}
              <div className="lg:hidden flex flex-col gap-2 max-h-[22rem] overflow-y-auto">
                {filteredAtt.length === 0 ? (
                  <p className="py-8 text-center text-body text-surface-400">Sin registros.</p>
                ) : (
                  filteredAtt.map((a, i) => (
                    <div key={`m-${a.date}-${a.course_id}-${i}`} className="rounded-card border border-surface-100 bg-surface-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body font-medium text-surface-800">{formatDateOnly(a.date)}</span>
                        <Badge variant={STATUS_BADGE[a.status].variant}>{STATUS_BADGE[a.status].label}</Badge>
                      </div>
                      <p className="text-small text-surface-500 mt-1">{a.course_name}</p>
                      {a.observation && <p className="text-small text-surface-400 italic mt-0.5">{a.observation}</p>}
                    </div>
                  ))
                )}
              </div>

              {total > 0 && (
                <div className="mt-6 pt-4 border-t border-surface-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-small text-surface-600">Mínimo para certificado: {MIN_REQUIRED}%.</span>
                    <span className={`text-body font-bold ${meetsMin ? 'text-emerald-600' : 'text-accent-600'}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
                    <div className={`h-full rounded-full ${meetsMin ? 'bg-emerald-500' : 'bg-accent-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notas */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="font-heading text-section-title text-surface-900">Mis Notas</h2>
          <p className="text-small text-surface-500 mt-0.5 mb-4">{course || 'Elegí un curso'}</p>

          {isLoading ? (
            <Spinner />
          ) : !course ? (
            <p className="py-10 text-center text-body text-surface-400">Elegí un curso para ver tus notas.</p>
          ) : !terms ? (
            <p className="py-10 text-center text-body text-surface-400">Todavía no hay notas cargadas para este curso.</p>
          ) : (
            <>
              <div className="border border-surface-200 rounded-button overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50/50 border-b border-surface-100">
                      <th className="px-3 py-2 text-left text-small font-semibold text-surface-500 uppercase">Skill</th>
                      <th className="px-3 py-2 text-center text-small font-semibold text-surface-500 uppercase">Term 1°</th>
                      <th className="px-3 py-2 text-center text-small font-semibold text-surface-500 uppercase">Term 2°</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SKILLS.map((s) => (
                      <tr key={s.key} className="border-b border-surface-100">
                        <td className="px-3 py-2.5 text-small font-semibold text-surface-500 uppercase">{s.label}</td>
                        <td className="px-3 py-2.5 text-center text-body text-surface-800">{terms.term1[s.key] ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center text-body text-surface-800">{terms.term2[s.key] ?? '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-surface-100">
                      <td className="px-3 py-2.5 text-small font-semibold text-surface-400 uppercase">Make Up</td>
                      <td className="px-3 py-2.5 text-center text-body text-surface-600">{terms.term1.makeup ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center text-body text-surface-600">{terms.term2.makeup ?? '—'}</td>
                    </tr>
                    <tr className="bg-surface-50/50">
                      <td className="px-3 py-2.5 text-small font-bold text-surface-500 uppercase">Nota término</td>
                      <td className="px-3 py-2.5 text-center text-body font-bold text-royal-600">{termGrade(terms.term1) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center text-body font-bold text-royal-600">{termGrade(terms.term2) ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-amber-50 rounded-button border border-amber-100 flex items-center justify-center gap-4">
                <span className="text-small font-semibold text-surface-500 uppercase tracking-wider">Total</span>
                <span className="font-heading text-[1.75rem] font-bold text-surface-900">{totalGrade(terms.term1, terms.term2) ?? '—'}</span>
              </div>

              <p className="text-small text-surface-400 mt-3">Si rendís el Make Up, esa nota reemplaza el promedio del término.</p>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

/* Arma term1/term2 (con make-up) para el curso elegido. null si no hay notas. */
function buildTerms(
  grades: StudentGradeRow[],
  makeups: MakeupRow[],
  course: string,
): { term1: TermScores; term2: TermScores } | null {
  if (!course) return null
  const rows = grades.filter((g) => g.course_name === course)
  const mks = makeups.filter((m) => m.course_name === course)
  if (rows.length === 0 && mks.length === 0) return null

  const build = (term: number): TermScores => {
    const g = rows.find((r) => r.term === term)
    const m = mks.find((x) => x.term === term)
    return {
      reading: g?.reading ?? null,
      listening: g?.listening ?? null,
      speaking: g?.speaking ?? null,
      writing: g?.writing ?? null,
      makeup: m?.score ?? null,
    }
  }
  return { term1: build(1), term2: build(2) }
}

function Spinner() {
  return (
    <div className="py-12 flex items-center justify-center">
      <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

/* Stat card grande para el bento de asistencia en mobile. */
function StatCard({ value, label, tone }: { value: number; label: string; tone: 'emerald' | 'accent' | 'amber' }) {
  const colors = { emerald: 'text-emerald-600', accent: 'text-accent-600', amber: 'text-amber-600' }
  return (
    <div className="flex flex-col items-center rounded-card border border-surface-100 bg-surface-50 p-3 text-center">
      <span className={`font-heading text-[1.75rem] font-bold leading-none ${colors[tone]}`}>{value}</span>
      <span className="mt-1.5 text-small font-semibold uppercase tracking-wider text-surface-500">{label}</span>
    </div>
  )
}

function Pill({ color, label }: { color: 'emerald' | 'accent' | 'amber' | 'surface'; label: string }) {
  const styles = { emerald: 'bg-emerald-50 text-emerald-700', accent: 'bg-accent-50 text-accent-700', amber: 'bg-amber-50 text-amber-700', surface: 'bg-surface-100 text-surface-600' }
  const dots = { emerald: 'bg-emerald-500', accent: 'bg-accent-500', amber: 'bg-amber-500', surface: 'bg-surface-400' }
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-badge ${styles[color]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[color]}`} />
      <span className="text-small font-semibold uppercase tracking-wider">{label}</span>
    </div>
  )
}
