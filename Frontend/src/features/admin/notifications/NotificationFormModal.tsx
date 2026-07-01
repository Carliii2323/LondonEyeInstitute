import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { TYPE_LABEL } from '@/features/shared/notifications/notificationHelpers'
import { AUDIENCE_OPTIONS } from './notificationFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import type { CreateNotificationInput, NotificationType, AudienceType } from '@/services/notificationService'
import { Info } from 'lucide-react'

/* ============================================================
 * NotificationFormModal — Crear / editar notificacion
 *
 * Audiencia alineada al backend: todos | estudiantes | docentes | curso.
 * Si es "curso", se elige un curso (audience_course_id).
 * ============================================================ */

export interface NotificationFormValues {
  title: string
  message: string
  type: NotificationType
  audience_type: AudienceType
  audience_course_id: string
  audience_user_id: string
}

interface NotificationFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateNotificationInput) => Promise<void>
  courses: { id: string; name: string }[]
  students: { id: string; name: string }[]
  initialValues?: Partial<NotificationFormValues>
  title?: string
  submitLabel?: string
  showInfoBanner?: boolean
}

const EMPTY: NotificationFormValues = {
  title: '',
  message: '',
  type: 'informativo',
  audience_type: 'todos',
  audience_course_id: '',
  audience_user_id: '',
}

const TYPE_OPTIONS: NotificationType[] = ['informativo', 'urgente', 'evento']

const SELECT_CLASS =
  'px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500'

export function NotificationFormModal({
  isOpen, onClose, onSubmit, courses, students, initialValues,
  title = 'Nueva Publicacion', submitLabel = 'Publicar', showInfoBanner = true,
}: NotificationFormModalProps) {
  const [values, setValues] = useState<NotificationFormValues>(EMPTY)
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setValues({ ...EMPTY, ...initialValues })
      setError(null)
    }
  }, [isOpen, initialValues])

  function update<K extends keyof NotificationFormValues>(key: K, value: NotificationFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (values.audience_type === 'curso' && !values.audience_course_id) {
      setError('Elegi un curso para esta audiencia.')
      return
    }
    if (values.audience_type === 'estudiante_especifico' && !values.audience_user_id) {
      setError('Elegi un alumno para esta audiencia.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: values.title.trim(),
        message: values.message.trim(),
        type: values.type,
        audience_type: values.audience_type,
        audience_course_id: values.audience_type === 'curso' ? values.audience_course_id : undefined,
        audience_user_id: values.audience_type === 'estudiante_especifico' ? values.audience_user_id : undefined,
      })
      onClose()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title={title} onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        <form id="notification-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Titulo"
            name="title"
            placeholder="Ej. Recordatorio de pago"
            required
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-body font-medium text-surface-700">
              Mensaje <span className="text-accent-500">*</span>
            </label>
            <textarea
              id="message"
              value={values.message}
              onChange={(e) => update('message', e.target.value)}
              placeholder="Escribi el contenido del aviso..."
              rows={4}
              required
              className="px-3 py-2 rounded-button border border-surface-200 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Destinatarios">
              <select
                value={values.audience_type}
                onChange={(e) => update('audience_type', e.target.value as AudienceType)}
                className={SELECT_CLASS}
              >
                {AUDIENCE_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                value={values.type}
                onChange={(e) => update('type', e.target.value as NotificationType)}
                className={SELECT_CLASS}
              >
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
          </div>

          {/* Curso (solo si audiencia = curso) */}
          {values.audience_type === 'curso' && (
            <Field label="Curso">
              <select
                value={values.audience_course_id}
                onChange={(e) => update('audience_course_id', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Seleccionar curso...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          {/* Alumno (solo si audiencia = estudiante especifico) */}
          {values.audience_type === 'estudiante_especifico' && (
            <Field label="Alumno">
              <select
                value={values.audience_user_id}
                onChange={(e) => update('audience_user_id', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Seleccionar alumno...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          )}

          {showInfoBanner && (
            <div className="flex items-start gap-2 p-3 bg-royal-50/50 border border-royal-100 rounded-button">
              <Info size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
              <span className="text-small text-royal-700">
                Sera visible para los destinatarios seleccionados en sus notificaciones.
              </span>
            </div>
          )}
        </form>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="notification-form" variant="danger" isLoading={isSubmitting} disabled={values.title.trim().length < 2 || values.message.trim().length < 2}>
          {submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-small font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
