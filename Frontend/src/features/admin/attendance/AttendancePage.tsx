import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ExportButton } from '@/components/ui/ExportButton'
import type { TableExport } from '@/lib/exportTable'
import { AttendanceFilters } from './AttendanceFilters'
import { AttendanceHistoryModal } from './AttendanceHistoryModal'
import { AttendanceStats } from '@/features/shared/attendance/AttendanceStats'
import { StatusToggle } from '@/features/shared/attendance/StatusToggle'
import { AnnualAttendanceSheet, type SheetStudent, type SheetClass, type AttendanceCode } from '@/features/shared/attendance/AnnualAttendanceSheet'
import type { AttendanceRecord } from '@/features/shared/attendance/types'
import { courseService } from '@/services/courseService'
import { enrollmentService } from '@/services/enrollmentService'
import {
  attendanceService,
  type SessionRecord,
  type AttendanceStatusValue,
  type AnnualAttendanceRow,
} from '@/services/attendanceService'
import { formatDateOnly, toLocalISODate } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { MoreHorizontal } from 'lucide-react'

/* ============================================================
 * AttendancePage — Registro de asistencia (conectado)
 *
 * Curso + fecha -> trae inscriptos + sesion guardada (si existe) y los
 * fusiona; el admin marca y guarda. Abajo, la planilla anual real.
 * ============================================================ */

const STATUS_TO_CODE: Record<AttendanceStatusValue, AttendanceCode> = {
  presente: 'P', ausente: 'A', justificado: 'J',
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`
}

interface AttendancePageProps {
  /** 'admin' (default) usa /admin + planilla anual; 'teacher' usa /teacher sin anual. */
  scope?: 'admin' | 'teacher'
}

export function AttendancePage({ scope = 'admin' }: AttendancePageProps) {
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [courseId, setCourseId] = useState('')
  const [date, setDate] = useState(() => toLocalISODate())

  const [records, setRecords] = useState<SessionRecord[]>([])
  const [annual, setAnnual] = useState<AnnualAttendanceRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null)

  const courseName = courses.find((c) => c.id === courseId)?.name ?? ''
  const year = Number(date.slice(0, 4)) || new Date().getFullYear()
  const showAnnual = scope === 'admin'

  useEffect(() => {
    const loader = scope === 'teacher'
      ? courseService.listMine()
      : courseService.list({ status: 'activo', page_size: 100 }).then((res) => res.data)
    loader
      .then((list) => setCourses(list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
  }, [scope])

  const loadSession = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      // Roster: admin via enrollments, docente via su propio endpoint de curso.
      const rosterPromise = scope === 'teacher'
        ? courseService.getStudentsAsTeacher(courseId).then((list) =>
            list.map((s) => ({ student_id: s.id, first_name: s.first_name, last_name: s.last_name, dni: s.dni })))
        : enrollmentService.list({ course_id: courseId, status: 'active' }).then((list) =>
            list.map((e) => ({ student_id: e.student_id, first_name: e.first_name, last_name: e.last_name, dni: e.dni })))

      const [roster, session] = await Promise.all([
        rosterPromise,
        attendanceService.getSession(courseId, date, scope),
      ])
      const byStudent = new Map(session.records.map((r) => [r.student_id, r]))
      setRecords(
        roster.map((e) => {
          const saved = byStudent.get(e.student_id)
          return {
            student_id: e.student_id,
            first_name: e.first_name,
            last_name: e.last_name,
            dni: e.dni,
            status: saved?.status ?? 'presente',
            observation: saved?.observation ?? '',
          }
        }),
      )
      if (showAnnual) {
        setAnnual(await attendanceService.getAnnual(courseId, year))
      }
      setLoaded(true)
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setLoading(false)
    }
  }, [courseId, date, year, scope, showAnnual])

  // Auto-carga al elegir curso o cambiar fecha
  useEffect(() => {
    if (courseId) loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, date])

  function updateStatus(studentId: string, status: AttendanceStatusValue) {
    setRecords((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)))
    setSuccess(false)
  }

  function updateObservation(studentId: string, observation: string) {
    setRecords((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, observation } : r)))
    setSuccess(false)
  }

  async function handleSave() {
    if (records.length === 0) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await attendanceService.save({
        course_id: courseId,
        date,
        records: records.map((r) => ({ student_id: r.student_id, status: r.status, observation: r.observation })),
      }, scope)
      setSuccess(true)
      // refresca la planilla anual con lo recien guardado (solo admin)
      if (showAnnual) {
        setAnnual(await attendanceService.getAnnual(courseId, year))
      }
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSaving(false)
    }
  }

  // Records en el shape que esperan los componentes compartidos
  const statRecords: AttendanceRecord[] = records.map((r) => ({
    studentId: r.student_id,
    studentName: `${r.first_name} ${r.last_name}`,
    studentInitials: initials(r.first_name, r.last_name),
    status: r.status,
    note: r.observation,
  }))

  const { sheetStudents, sheetClasses } = useMemo(() => buildSheet(annual), [annual])
  const termAbsences = useMemo(() => buildAbsencesByTerm(annual), [annual])

  function buildAbsencesExport(): TableExport {
    return {
      title: 'Inasistencias por termino',
      subtitle: `${courseName} · Ano ${year}`,
      head: ['Alumno', '1er Termino (Feb-Jun)', '2do Termino (Jul-Nov)', 'Total'],
      body: termAbsences.map((r) => [r.name, r.t1, r.t2, r.total]),
      filename: 'inasistencias',
      columnWidths: [30, 20, 20, 10],
    }
  }

  async function handleAbsencesExport(kind: 'pdf' | 'xlsx') {
    const table = buildAbsencesExport()
    const { exportTableToPdf, exportTableToXlsx } = await import('@/lib/exportTable')
    if (kind === 'pdf') exportTableToPdf(table, 'portrait')
    else await exportTableToXlsx(table)
  }

  return (
    <PageContainer title="Asistencia">
      <div className="flex flex-col gap-4">
        <AttendanceFilters
          courses={courses}
          courseId={courseId}
          date={date}
          onCourseChange={(id) => { setCourseId(id); setLoaded(false) }}
          onDateChange={(d) => { setDate(d); setLoaded(false) }}
          onConfirm={loadSession}
          isLoading={isLoading}
        />

        {error && (
          <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-button bg-emerald-50 border border-emerald-200 text-small text-emerald-700">Asistencia guardada.</div>
        )}

        {!courseId ? (
          <div className="bg-white rounded-card shadow-card py-16 text-center text-body text-surface-400">
            Elegí un curso para registrar la asistencia.
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-card shadow-card py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <AttendanceStats records={statRecords} />

            <div className="bg-white rounded-card shadow-card overflow-hidden">
              <div className="p-5 pb-4 border-b border-surface-100">
                <h2 className="font-heading text-section-title text-surface-900">Asistencia — {courseName}</h2>
                <p className="text-small text-surface-500 mt-0.5">Clase del {formatDateOnly(date)}</p>
              </div>

              {records.length === 0 ? (
                <div className="py-12 text-center text-body text-surface-400">
                  {loaded ? 'El curso no tiene alumnos inscriptos.' : 'Cargá la clase para ver los alumnos.'}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50/50 border-b border-surface-100">
                      {['Alumno', 'Estado', 'Observaciones', 'Historial'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {records.map((r) => (
                      <tr key={r.student_id} className="hover:bg-surface-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar initials={initials(r.first_name, r.last_name)} />
                            <span className="text-body font-medium text-surface-800">{r.first_name} {r.last_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusToggle value={r.status} onChange={(status) => updateStatus(r.student_id, status)} />
                        </td>
                        <td className="px-5 py-4 w-96">
                          <input
                            type="text"
                            value={r.observation}
                            onChange={(e) => updateObservation(r.student_id, e.target.value)}
                            placeholder="Agregar nota..."
                            className="w-full px-3 py-1.5 rounded-input border border-surface-200 bg-white text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setHistoryTarget({ id: r.student_id, name: `${r.first_name} ${r.last_name}` })}
                            className="p-1.5 text-surface-400 hover:text-surface-700 transition-colors rounded"
                            aria-label="Ver historial"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {records.length > 0 && (
                <div className="p-5 border-t border-surface-100">
                  <Button variant="danger" size="lg" className="w-full" isLoading={isSaving} onClick={handleSave}>
                    GUARDAR ASISTENCIA
                  </Button>
                </div>
              )}
            </div>

            {showAnnual && sheetClasses.length > 0 && (
              <AnnualAttendanceSheet course={courseName} year={year} students={sheetStudents} classes={sheetClasses} />
            )}

            {showAnnual && termAbsences.length > 0 && (
              <div className="bg-white rounded-card shadow-card overflow-hidden">
                <div className="p-5 pb-4 border-b border-surface-100 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-section-title text-surface-900">Inasistencias por término</h2>
                    <p className="text-small text-surface-500 mt-0.5">Ausentes por período (no incluye justificadas). El total es del año completo — Año {year}</p>
                  </div>
                  <ExportButton
                    onPdf={() => handleAbsencesExport('pdf')}
                    onXlsx={() => handleAbsencesExport('xlsx')}
                    disabled={termAbsences.length === 0}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-50/50 border-b border-surface-100">
                        {['Alumno', '1er Término (Feb–Jun)', '2do Término (Jul–Nov)', 'Total'].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {termAbsences.map((r) => (
                        <tr key={r.student_id} className="hover:bg-surface-50/40 transition-colors">
                          <td className="px-5 py-3 text-body font-medium text-surface-800">{r.name}</td>
                          <td className="px-5 py-3 text-body text-surface-700 tabular-nums">{r.t1}</td>
                          <td className="px-5 py-3 text-body text-surface-700 tabular-nums">{r.t2}</td>
                          <td className={`px-5 py-3 text-body font-bold tabular-nums ${r.total > 0 ? 'text-accent-600' : 'text-surface-700'}`}>{r.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AttendanceHistoryModal
        isOpen={historyTarget !== null}
        onClose={() => setHistoryTarget(null)}
        studentId={historyTarget?.id ?? null}
        studentName={historyTarget?.name ?? ''}
        courseId={courseId}
        courseName={courseName}
        scope={scope}
      />
    </PageContainer>
  )
}

interface TermAbsenceRow {
  student_id: string
  name: string
  t1: number
  t2: number
  total: number
}

/* Cuenta ausencias por término y total (del año), por alumno.
   Corte: 1er término = Feb–Jun (2–6), 2do término = Jul–Nov (7–11).
   Dic/Ene quedan fuera de término pero suman al total del año.
   Corte fijo por ahora (ver tarea [B31] para hacerlo configurable desde settings). */
function buildAbsencesByTerm(rows: AnnualAttendanceRow[]): TermAbsenceRow[] {
  const map = new Map<string, TermAbsenceRow>()
  for (const r of rows) {
    let row = map.get(r.student_id)
    if (!row) {
      row = { student_id: r.student_id, name: `${r.first_name} ${r.last_name}`, t1: 0, t2: 0, total: 0 }
      map.set(r.student_id, row)
    }
    if (r.status === 'ausente') {
      const month = Number(r.date.slice(5, 7))
      if (month >= 2 && month <= 6) row.t1 += 1
      else if (month >= 7 && month <= 11) row.t2 += 1
      row.total += 1 // total del año (incluye dic/ene fuera de término)
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/* Construye la planilla anual (alumnos x fechas) desde las filas del backend. */
function buildSheet(rows: AnnualAttendanceRow[]): { sheetStudents: SheetStudent[]; sheetClasses: SheetClass[] } {
  const studentsMap = new Map<string, SheetStudent>()
  const classesMap = new Map<string, SheetClass>()

  for (const row of rows) {
    if (!studentsMap.has(row.student_id)) {
      studentsMap.set(row.student_id, { id: row.student_id, name: `${row.first_name} ${row.last_name}` })
    }
    let cls = classesMap.get(row.date)
    if (!cls) {
      cls = { date: formatDateOnly(row.date), attendances: {} }
      classesMap.set(row.date, cls)
    }
    cls.attendances[row.student_id] = STATUS_TO_CODE[row.status] ?? 'A'
  }

  const sheetClasses = [...classesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, cls]) => cls)

  return { sheetStudents: [...studentsMap.values()], sheetClasses }
}
