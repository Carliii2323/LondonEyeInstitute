import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { cn } from '@/lib/cn'
import { courseService } from '@/services/courseService'
import { enrollmentService } from '@/services/enrollmentService'
import { paymentService, type PaymentMethod } from '@/services/paymentService'
import { toLocalISODate, formatMoney } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * CreatePaymentModal — Crear pago (admin)
 *
 * Tres pestañas:
 *  - Pago individual: cobro a UN alumno (concepto libre → cargo_adicional).
 *  - Derecho (curso): inscripción/examen a TODOS los alumnos activos del curso.
 *  - Adelantado: N cuotas mensuales futuras de un alumno, ya marcadas pagadas.
 * ============================================================ */

const SELECT_CLASS =
  'px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 disabled:bg-surface-50 disabled:text-surface-400'

type Tab = 'individual' | 'derecho' | 'adelantado'
type DerechoType = 'derecho_inscripcion' | 'derecho_examen'
type Course = { id: string; name: string; price_monthly: string }

const NOW = new Date()

interface CreatePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreatePaymentModal({ isOpen, onClose, onCreated }: CreatePaymentModalProps) {
  const [tab, setTab] = useState<Tab>('individual')
  const [courses, setCourses] = useState<Course[]>([])

  // Pago individual
  const [iCourseId, setICourseId] = useState('')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [studentId, setStudentId] = useState('')
  const [iAmount, setIAmount] = useState('')
  const [iDue, setIDue] = useState(toLocalISODate())
  const [concepto, setConcepto] = useState('')
  const [iPaid, setIPaid] = useState(false)
  const [iMethod, setIMethod] = useState<'' | PaymentMethod>('')

  // Derecho (curso)
  const [dCourseId, setDCourseId] = useState('')
  const [dType, setDType] = useState<DerechoType>('derecho_inscripcion')
  const [dAmount, setDAmount] = useState('')
  const [dDue, setDDue] = useState(toLocalISODate())
  const [dNote, setDNote] = useState('')

  // Adelantado
  const [aCourseId, setACourseId] = useState('')
  const [aStudents, setAStudents] = useState<{ id: string; name: string }[]>([])
  const [aStudentId, setAStudentId] = useState('')
  const [aMonth, setAMonth] = useState(NOW.getMonth() + 1) // 1-12
  const [aYear, setAYear] = useState(NOW.getFullYear())
  const [aMonths, setAMonths] = useState('1')
  const [aMethod, setAMethod] = useState<'' | PaymentMethod>('')

  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTab('individual')
    setICourseId('')
    setStudents([])
    setStudentId('')
    setIAmount('')
    setIDue(toLocalISODate())
    setConcepto('')
    setIPaid(false)
    setIMethod('')
    setDCourseId('')
    setDType('derecho_inscripcion')
    setDAmount('')
    setDDue(toLocalISODate())
    setDNote('')
    setACourseId('')
    setAStudents([])
    setAStudentId('')
    setAMonth(NOW.getMonth() + 1)
    setAYear(NOW.getFullYear())
    setAMonths('1')
    setAMethod('')
    setError(null)
    setResult(null)
    courseService
      .list({ status: 'activo', page_size: 100 })
      .then((res) => setCourses(res.data.map((c) => ({ id: c.id, name: c.name, price_monthly: c.price_monthly }))))
      .catch(() => setCourses([]))
  }, [isOpen])

  // Roster del curso elegido (pestaña individual).
  useEffect(() => {
    if (!iCourseId) {
      setStudents([])
      setStudentId('')
      return
    }
    enrollmentService
      .list({ course_id: iCourseId })
      .then((list) => setStudents(list.map((e) => ({ id: e.student_id, name: `${e.first_name} ${e.last_name} (${e.dni})` }))))
      .catch(() => setStudents([]))
  }, [iCourseId])

  // Roster del curso elegido (pestaña adelantado).
  useEffect(() => {
    if (!aCourseId) {
      setAStudents([])
      setAStudentId('')
      return
    }
    enrollmentService
      .list({ course_id: aCourseId })
      .then((list) => setAStudents(list.map((e) => ({ id: e.student_id, name: `${e.first_name} ${e.last_name} (${e.dni})` }))))
      .catch(() => setAStudents([]))
  }, [aCourseId])

  function switchTab(next: Tab) {
    setTab(next)
    setError(null)
    setResult(null)
  }

  async function submitIndividual(e: FormEvent) {
    e.preventDefault()
    if (!iCourseId || !studentId) {
      setError('Elegí un curso y un alumno.')
      return
    }
    if (iAmount === '' || Number(iAmount) <= 0) {
      setError('Ingresá un monto mayor a 0.')
      return
    }
    if (!concepto.trim()) {
      setError('Ingresá un concepto.')
      return
    }
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      await paymentService.createAdditionalCharge({
        student_id: studentId,
        course_id: iCourseId,
        amount: iAmount,
        due_date: iDue,
        observation: concepto,
        paid: iPaid,
        payment_method: iPaid ? iMethod || undefined : undefined,
      })
      setResult(iPaid ? 'Pago individual creado y registrado como pagado.' : 'Pago individual creado (pendiente).')
      onCreated()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitDerecho(e: FormEvent) {
    e.preventDefault()
    if (!dCourseId) {
      setError('Elegí un curso.')
      return
    }
    if (dAmount === '' || Number(dAmount) <= 0) {
      setError('Ingresá un monto mayor a 0.')
      return
    }
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await paymentService.createCourseCharge({
        course_id: dCourseId,
        type: dType,
        amount: dAmount,
        due_date: dDue,
        observation: dNote || undefined,
      })
      setResult(`Se generaron ${res.created} cobro(s) para los alumnos del curso.`)
      onCreated()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitAdvance(e: FormEvent) {
    e.preventDefault()
    if (!aCourseId || !aStudentId) {
      setError('Elegí un curso y un alumno.')
      return
    }
    const n = parseInt(aMonths, 10)
    if (!n || n < 1) {
      setError('Ingresá cuántos meses (1 o más).')
      return
    }
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await paymentService.createAdvance({
        student_id: aStudentId,
        course_id: aCourseId,
        start_month: aMonth,
        start_year: aYear,
        months: n,
        payment_method: aMethod || undefined,
      })
      setResult(`Se registraron ${res.created} cuota(s) como pagadas.`)
      onCreated()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const advPrice = Number(courses.find((c) => c.id === aCourseId)?.price_monthly ?? 0)
  const advMonths = parseInt(aMonths, 10) || 0
  const advTotal = advPrice * advMonths

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Crear pago" onClose={onClose} />

      <ModalBody>
        <div className="mb-4 inline-flex rounded-button border border-surface-200 p-1">
          <TabButton active={tab === 'individual'} onClick={() => switchTab('individual')}>Pago individual</TabButton>
          <TabButton active={tab === 'derecho'} onClick={() => switchTab('derecho')}>Derecho (curso)</TabButton>
          <TabButton active={tab === 'adelantado'} onClick={() => switchTab('adelantado')}>Adelantado</TabButton>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        {result && (
          <div className="mb-4 p-3 rounded-button bg-emerald-50 border border-emerald-200 text-small text-emerald-700">{result}</div>
        )}

        {tab === 'individual' && (
          <form id="create-payment-form" onSubmit={submitIndividual} className="flex flex-col gap-4">
            <Field label="Curso">
              <select value={iCourseId} onChange={(e) => setICourseId(e.target.value)} className={SELECT_CLASS}>
                <option value="">Seleccionar curso...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Alumno">
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!iCourseId} className={SELECT_CLASS}>
                <option value="">{iCourseId ? 'Seleccionar alumno...' : 'Elegí un curso primero'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Monto" name="i_amount" type="number" placeholder="ej. 8000" value={iAmount} onChange={(e) => setIAmount(e.target.value)} required />
              <FormField label="Vencimiento" name="i_due" type="date" value={iDue} onChange={(e) => setIDue(e.target.value)} required />
            </div>

            <FormField label="Concepto" name="concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="ej. Material de estudio" required />

            <Field label="Estado">
              <select value={iPaid ? 'paid' : 'pending'} onChange={(e) => setIPaid(e.target.value === 'paid')} className={SELECT_CLASS}>
                <option value="pending">Pendiente de pago</option>
                <option value="paid">Pagado (en el momento)</option>
              </select>
            </Field>

            {iPaid && (
              <Field label="Medio de pago (opcional)">
                <select value={iMethod} onChange={(e) => setIMethod(e.target.value as '' | PaymentMethod)} className={SELECT_CLASS}>
                  <option value="">Sin especificar</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </Field>
            )}

            <p className="text-small text-surface-500">
              {iPaid
                ? 'Se crea el cobro y queda registrado como pagado.'
                : 'Se crea un cobro pendiente para un solo alumno.'}
            </p>
          </form>
        )}

        {tab === 'derecho' && (
          <form id="create-payment-form" onSubmit={submitDerecho} className="flex flex-col gap-4">
            <Field label="Curso">
              <select value={dCourseId} onChange={(e) => setDCourseId(e.target.value)} className={SELECT_CLASS}>
                <option value="">Seleccionar curso...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de derecho">
              <select value={dType} onChange={(e) => setDType(e.target.value as DerechoType)} className={SELECT_CLASS}>
                <option value="derecho_inscripcion">Derecho de inscripción</option>
                <option value="derecho_examen">Derecho de examen</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Monto" name="d_amount" type="number" placeholder="ej. 15000" value={dAmount} onChange={(e) => setDAmount(e.target.value)} required />
              <FormField label="Vencimiento" name="d_due" type="date" value={dDue} onChange={(e) => setDDue(e.target.value)} required />
            </div>

            <FormField label="Nota (opcional)" name="d_note" value={dNote} onChange={(e) => setDNote(e.target.value)} placeholder="Derecho de inscripción" />

            <p className="text-small text-surface-500">
              Se le genera el cobro como <strong>pendiente</strong> a <strong>todos los alumnos activos</strong> del curso.
            </p>
          </form>
        )}

        {tab === 'adelantado' && (
          <form id="create-payment-form" onSubmit={submitAdvance} className="flex flex-col gap-4">
            <Field label="Curso">
              <select value={aCourseId} onChange={(e) => setACourseId(e.target.value)} className={SELECT_CLASS}>
                <option value="">Seleccionar curso...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Alumno">
              <select value={aStudentId} onChange={(e) => setAStudentId(e.target.value)} disabled={!aCourseId} className={SELECT_CLASS}>
                <option value="">{aCourseId ? 'Seleccionar alumno...' : 'Elegí un curso primero'}</option>
                {aStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Desde el mes">
                <MonthYearPicker month={aMonth - 1} year={aYear} onChange={(m, y) => { setAMonth(m + 1); setAYear(y) }} />
              </Field>
              <FormField label="Cantidad de meses" name="a_months" type="number" placeholder="3" value={aMonths} onChange={(e) => setAMonths(e.target.value)} required />
            </div>

            <Field label="Medio de pago (opcional)">
              <select value={aMethod} onChange={(e) => setAMethod(e.target.value as '' | PaymentMethod)} className={SELECT_CLASS}>
                <option value="">Sin especificar</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </Field>

            <div className="rounded-button border border-surface-100 bg-surface-50 p-3 text-small text-surface-700">
              {aCourseId ? (
                <>
                  Precio mensual: <strong>{formatMoney(String(advPrice))}</strong> · Total{' '}
                  ({advMonths} mes{advMonths === 1 ? '' : 'es'}): <strong>{formatMoney(String(advTotal))}</strong>
                </>
              ) : (
                'Elegí un curso para ver el total.'
              )}
            </div>

            <p className="text-small text-surface-500">
              Se crean las cuotas mensuales desde el mes elegido y quedan <strong>registradas como pagadas</strong>.
            </p>
          </form>
        )}
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button type="submit" form="create-payment-form" variant="danger" isLoading={isSubmitting}>
          {tab === 'individual' ? 'Crear pago' : tab === 'derecho' ? 'Crear cobro' : 'Registrar adelantado'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-button text-small font-medium transition-colors',
        active ? 'bg-royal-500 text-white' : 'text-surface-600 hover:text-surface-800',
      )}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-small font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
