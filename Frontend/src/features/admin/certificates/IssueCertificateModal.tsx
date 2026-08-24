import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { enrollmentService } from '@/services/enrollmentService'
import { certificateService } from '@/services/certificateService'
import { formatBackendError } from '@/lib/formatBackendError'
import { HttpError } from '@/services/httpClient'

/* ============================================================
 * IssueCertificateModal — Emitir un certificado
 *
 * Curso -> alumno (roster, incluye dados de baja) -> año + promedio y
 * asistencia (opcionales). El backend valida elegibilidad (cuotas al día).
 * ============================================================ */

interface IssueCertificateModalProps {
  isOpen: boolean
  onClose: () => void
  onIssued: () => void
  courses: { id: string; name: string }[]
}

const SELECT_CLASS =
  'px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500'

export function IssueCertificateModal({ isOpen, onClose, onIssued, courses }: IssueCertificateModalProps) {
  const [courseId, setCourseId] = useState('')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [studentId, setStudentId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [hours, setHours] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCourseId(''); setStudents([]); setStudentId('')
      setYear(String(new Date().getFullYear())); setHours(''); setError(null)
    }
  }, [isOpen])

  // Al elegir curso, cargar su roster (todas las inscripciones, activas o de baja).
  useEffect(() => {
    if (!courseId) { setStudents([]); setStudentId(''); return }
    enrollmentService
      .list({ course_id: courseId })
      .then((list) => setStudents(list.map((e) => ({ id: e.student_id, name: `${e.first_name} ${e.last_name} (${e.dni})` }))))
      .catch(() => setStudents([]))
  }, [courseId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!courseId || !studentId) {
      setError('Elegí un curso y un alumno.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await certificateService.issue({
        student_id: studentId,
        course_id: courseId,
        year: parseInt(year, 10) || new Date().getFullYear(),
        presential_hours: hours === '' ? null : Math.trunc(Number(hours)),
      })
      onIssued()
      onClose()
    } catch (err) {
      setError(buildError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Emitir Certificado" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        <form id="issue-cert-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Curso">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={SELECT_CLASS}>
              <option value="">Seleccionar curso...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Alumno">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!courseId} className={`${SELECT_CLASS} disabled:bg-surface-50 disabled:text-surface-400`}>
              <option value="">{courseId ? 'Seleccionar alumno...' : 'Elegí un curso primero'}</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Año" name="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
            <FormField label="Horas presenciales" name="presential_hours" type="number" placeholder="ej. 120" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>

          <p className="text-small text-surface-500">
            El <strong>promedio</strong> se calcula automáticamente de las notas del año (no se carga a mano). Las <strong>horas presenciales</strong> salen impresas en el certificado. El sistema verifica que las cuotas del año estén al día.
          </p>
        </form>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="issue-cert-form" variant="danger" isLoading={isSubmitting} disabled={!studentId}>
          Emitir Certificado
        </Button>
      </ModalFooter>
    </Modal>
  )
}

/** Mensaje de error; si el backend manda el breakdown de cuotas impagas, lo agrega. */
function buildError(err: unknown): string {
  const base = formatBackendError(err)
  if (err instanceof HttpError && err.body.code === 'NOT_ELIGIBLE') {
    const details = (err.body as { details?: { unpaid_count?: number } }).details
    if (details?.unpaid_count) return `${base} (${details.unpaid_count} cuota/s sin aprobar)`
  }
  return base
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-small font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
