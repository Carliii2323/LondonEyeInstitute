import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { formatBackendError } from '@/lib/formatBackendError'
import { COURSE_LEVELS } from '@/services/courseService'

/* ============================================================
 * CourseFormModal — Formulario de curso (crear / editar)
 *
 * Un solo componente parametrizable: con `initialValues` es edicion.
 * Campos alineados al backend (name, level, schedule libre,
 * price_monthly, capacity, teacher_id).
 * ============================================================ */

export interface CourseFormValues {
  name: string
  level: string
  schedule: string
  price_monthly: string
  inscripcion_price: string
  examen_price: string
  classroom_code: string
  capacity: string
  teacher_id: string
}

interface CourseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: CourseFormValues) => Promise<void>
  teachers: { id: string; name: string }[]
  initialValues?: Partial<CourseFormValues>
  title?: string
  submitLabel?: string
}

const EMPTY_VALUES: CourseFormValues = {
  name: '',
  level: 'INTERMEDIO',
  schedule: '',
  price_monthly: '',
  inscripcion_price: '',
  examen_price: '',
  classroom_code: '',
  capacity: '',
  teacher_id: '',
}

export function CourseFormModal({
  isOpen,
  onClose,
  onSubmit,
  teachers,
  initialValues,
  title = 'Nuevo Curso',
  submitLabel = 'Crear Curso',
}: CourseFormModalProps) {
  const [values, setValues] = useState<CourseFormValues>(EMPTY_VALUES)
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setValues({ ...EMPTY_VALUES, ...initialValues })
      setError(null)
    }
  }, [isOpen, initialValues])

  function updateField<K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(values)
      onClose()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title={title} onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        <form id="course-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Nombre del Curso"
            name="name"
            placeholder="Ej. Conversacional Teen II"
            required
            value={values.name}
            onChange={(e) => updateField('name', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Nivel"
              name="level"
              value={values.level}
              onChange={(v) => updateField('level', v)}
              options={COURSE_LEVELS.map((l) => ({ value: l, label: l }))}
            />
            <FormField
              label="Horario"
              name="schedule"
              placeholder="Ej. Mar 18:00 - 20:00"
              required
              value={values.schedule}
              onChange={(e) => updateField('schedule', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Precio Mensual ($)"
              name="price_monthly"
              type="number"
              placeholder="55000"
              required
              value={values.price_monthly}
              onChange={(e) => updateField('price_monthly', e.target.value)}
            />
            <FormField
              label="Capacidad Maxima"
              name="capacity"
              type="number"
              placeholder="12"
              required
              value={values.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Derecho inscripción ($) — opcional"
              name="inscripcion_price"
              type="number"
              placeholder="ej. 20000"
              value={values.inscripcion_price}
              onChange={(e) => updateField('inscripcion_price', e.target.value)}
            />
            <FormField
              label="Derecho examen ($) — opcional"
              name="examen_price"
              type="number"
              placeholder="ej. 12000"
              value={values.examen_price}
              onChange={(e) => updateField('examen_price', e.target.value)}
            />
          </div>
          <p className="-mt-1 text-small text-surface-500">
            Si cargás estos precios, se cobran <strong>automáticamente</strong>: inscripción en febrero, examen en julio y noviembre.
            Dejalos vacíos para cobrarlos a mano.
          </p>

          <FormField
            label="Clave de Google Classroom (opcional)"
            name="classroom_code"
            placeholder="Ej. abc-defg-hij"
            value={values.classroom_code}
            onChange={(e) => updateField('classroom_code', e.target.value)}
          />

          <SelectField
            label="Docente Asignado"
            name="teacher_id"
            value={values.teacher_id}
            onChange={(v) => updateField('teacher_id', v)}
            options={[{ value: '', label: 'Sin docente asignado' }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]}
          />
        </form>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="course-form" variant="danger" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

interface SelectFieldProps {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function SelectField({ label, name, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-small font-semibold text-surface-500 uppercase tracking-wider">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
