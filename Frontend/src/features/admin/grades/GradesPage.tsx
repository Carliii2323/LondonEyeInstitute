import { useCallback, useEffect, useState, Fragment } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { YearPicker } from '@/components/ui/YearPicker'
import { GradeInput } from '@/features/shared/grades/GradeInput'
import { termGrade, totalGrade, type TermScores } from '@/features/shared/grades/gradeCalc'
import { courseService } from '@/services/courseService'
import { enrollmentService } from '@/services/enrollmentService'
import { gradeService, type Term, type SaveGradesInput } from '@/services/gradeService'
import { formatBackendError } from '@/lib/formatBackendError'
import { Save } from 'lucide-react'

/* ============================================================
 * GradesPage — Planilla de notas (conectada)
 *
 * Por alumno: Julio (R L S W + Make Up) y Diciembre (R L S W + Make Up),
 * con TOTAL calculado. term 1 = Julio, term 2 = Diciembre.
 * ============================================================ */

interface GradeFormRow {
  student_id: string
  name: string
  dni: string
  term1: TermScores
  term2: TermScores
}

const SKILLS: { key: keyof TermScores; label: string }[] = [
  { key: 'reading', label: 'R' },
  { key: 'listening', label: 'L' },
  { key: 'speaking', label: 'S' },
  { key: 'writing', label: 'W' },
]

const NOW_YEAR = new Date().getFullYear()
const YEARS = [NOW_YEAR, NOW_YEAR - 1, NOW_YEAR - 2]

interface GradesPageProps {
  /** 'admin' (default) usa /admin/grades; 'teacher' usa /teacher/grades. */
  scope?: 'admin' | 'teacher'
}

export function GradesPage({ scope = 'admin' }: GradesPageProps) {
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [courseId, setCourseId] = useState('')
  const [year, setYear] = useState(NOW_YEAR)
  const [rows, setRows] = useState<GradeFormRow[]>([])
  const [isLoading, setLoading] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const courseName = courses.find((c) => c.id === courseId)?.name ?? ''

  useEffect(() => {
    const loader = scope === 'teacher'
      ? courseService.listMine()
      : courseService.list({ status: 'activo', page_size: 100 }).then((res) => res.data)
    loader
      .then((list) => setCourses(list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
  }, [scope])

  const load = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const rosterPromise = scope === 'teacher'
        ? courseService.getStudentsAsTeacher(courseId).then((list) =>
            list.map((s) => ({ student_id: s.id, first_name: s.first_name, last_name: s.last_name, dni: s.dni })))
        : enrollmentService.list({ course_id: courseId, status: 'active' }).then((list) =>
            list.map((e) => ({ student_id: e.student_id, first_name: e.first_name, last_name: e.last_name, dni: e.dni })))

      const [enrolled, data] = await Promise.all([
        rosterPromise,
        gradeService.getByCourse(courseId, year, scope),
      ])
      const gradeByKey = new Map(data.grades.map((g) => [`${g.student_id}-${g.term}`, g]))
      const makeupByKey = new Map(data.makeups.map((m) => [`${m.student_id}-${m.term}`, m.score]))

      const buildTerm = (studentId: string, term: Term): TermScores => {
        const g = gradeByKey.get(`${studentId}-${term}`)
        return {
          reading: g?.reading ?? null,
          listening: g?.listening ?? null,
          speaking: g?.speaking ?? null,
          writing: g?.writing ?? null,
          makeup: makeupByKey.get(`${studentId}-${term}`) ?? null,
        }
      }

      setRows(
        enrolled.map((e) => ({
          student_id: e.student_id,
          name: `${e.first_name} ${e.last_name}`,
          dni: e.dni,
          term1: buildTerm(e.student_id, 1),
          term2: buildTerm(e.student_id, 2),
        })),
      )
    } catch (err) {
      setError(formatBackendError(err))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [courseId, year, scope])

  useEffect(() => { if (courseId) load() }, [load, courseId])

  function updateCell(studentId: string, term: 1 | 2, field: keyof TermScores, value: number | null) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.student_id !== studentId) return r
        const key = term === 1 ? 'term1' : 'term2'
        return { ...r, [key]: { ...r[key], [field]: value } }
      }),
    )
    setSuccess(false)
  }

  async function handleSave() {
    if (rows.length === 0) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const grades: SaveGradesInput['grades'] = []
      const makeups: SaveGradesInput['makeups'] = []
      for (const r of rows) {
        for (const term of [1, 2] as Term[]) {
          const t = term === 1 ? r.term1 : r.term2
          grades.push({
            student_id: r.student_id, term,
            reading: t.reading, listening: t.listening, speaking: t.speaking, writing: t.writing,
          })
          if (t.makeup !== null) {
            makeups.push({ student_id: r.student_id, term, score: t.makeup })
          }
        }
      }
      await gradeService.save({ course_id: courseId, year, grades, makeups }, scope)
      setSuccess(true)
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer title="Notas">
      {/* Curso + año */}
      <div className="bg-white rounded-card shadow-card p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[14rem] flex flex-col gap-1.5">
          <label htmlFor="course" className="text-small font-semibold text-surface-500 uppercase tracking-wider">Curso</label>
          <select
            id="course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="appearance-none px-3 py-2.5 pr-8 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%205l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat"
          >
            <option value="">Seleccionar curso...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-semibold text-surface-500 uppercase tracking-wider">Ciclo</span>
          <YearPicker value={year} onChange={setYear} years={YEARS} className="py-2.5" />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}
      {success && (
        <div className="mt-4 p-3 rounded-button bg-emerald-50 border border-emerald-200 text-small text-emerald-700">Notas guardadas.</div>
      )}

      {!courseId ? (
        <div className="mt-4 bg-white rounded-card shadow-card py-16 text-center text-body text-surface-400">
          Elegí un curso para cargar las notas.
        </div>
      ) : isLoading ? (
        <div className="mt-4 bg-white rounded-card shadow-card py-16 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-4 bg-white rounded-card shadow-card overflow-hidden">
          <div className="p-5 pb-4 border-b border-surface-100">
            <h2 className="font-heading text-section-title text-surface-900">Planilla de Notas — {courseName}</h2>
            <p className="text-small text-surface-500 mt-0.5">Ciclo {year} · R Reading · L Listening · S Speaking · W Writing</p>
          </div>

          {rows.length === 0 ? (
            <div className="py-12 text-center text-body text-surface-400">El curso no tiene alumnos inscriptos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-50/50 border-b border-surface-100">
                    <th rowSpan={2} className="px-5 py-2 text-left text-small font-semibold text-surface-500 uppercase tracking-wider align-bottom sticky left-0 bg-surface-50/50">Alumno</th>
                    <th colSpan={5} className="px-2 py-2 text-center text-small font-semibold text-surface-500 uppercase tracking-wider border-l border-surface-200">Term 1°</th>
                    <th colSpan={5} className="px-2 py-2 text-center text-small font-semibold text-surface-500 uppercase tracking-wider border-l border-surface-200">Term 2°</th>
                    <th rowSpan={2} className="px-3 py-2 text-center text-small font-semibold text-surface-600 uppercase tracking-wider border-l border-surface-200 align-bottom bg-amber-50">Total</th>
                  </tr>
                  <tr className="bg-surface-50/50 border-b border-surface-100">
                    {(['Term 1°', 'Term 2°'] as const).map((period) => (
                      <Fragment key={period}>
                        {SKILLS.map((s, i) => (
                          <th key={`${period}-${s.key}`} className={`px-1 py-1.5 text-center text-[0.6875rem] font-semibold text-surface-400 uppercase ${i === 0 ? 'border-l border-surface-200' : ''}`}>{s.label}</th>
                        ))}
                        <th className="px-1 py-1.5 text-center text-[0.6875rem] font-semibold text-surface-400 uppercase">M.Up</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {rows.map((r) => {
                    const total = totalGrade(r.term1, r.term2)
                    return (
                      <tr key={r.student_id} className="hover:bg-surface-50/40 transition-colors">
                        <td className="px-5 py-2 whitespace-nowrap sticky left-0 bg-white">
                          <p className="text-body font-medium text-surface-800">{r.name}</p>
                          <p className="text-small text-surface-400">{r.dni}</p>
                        </td>
                        {([1, 2] as const).map((term) => {
                          const t = term === 1 ? r.term1 : r.term2
                          const tg = termGrade(t)
                          return (
                            <Fragment key={term}>
                              {SKILLS.map((s, i) => (
                                <td key={`${term}-${s.key}`} className={`px-1 py-2 text-center ${i === 0 ? 'border-l border-surface-200' : ''}`}>
                                  <GradeInput
                                    value={t[s.key]}
                                    onChange={(v) => updateCell(r.student_id, term, s.key, v)}
                                    isFailing={t[s.key] !== null && (t[s.key] as number) < 6}
                                  />
                                </td>
                              ))}
                              <td className="px-1 py-2 text-center" title={tg !== null ? `Nota del término: ${tg}` : undefined}>
                                <GradeInput
                                  value={t.makeup}
                                  onChange={(v) => updateCell(r.student_id, term, 'makeup', v)}
                                  emphasize
                                />
                              </td>
                            </Fragment>
                          )
                        })}
                        <td className="px-3 py-2 text-center border-l border-surface-200 bg-amber-50/60">
                          <span className={`text-body font-bold tabular-nums ${total !== null && total < 6 ? 'text-accent-600' : 'text-surface-800'}`}>
                            {total ?? '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex items-center justify-between p-5 border-t border-surface-100">
              <span className="text-small text-surface-500">{rows.length} alumno(s)</span>
              <Button variant="danger" isLoading={isSaving} onClick={handleSave}>
                <Save size={16} /> Guardar Notas
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
