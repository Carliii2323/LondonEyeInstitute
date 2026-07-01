import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * EditTeacherModal — Edicion de datos de docente
 *
 * Campos alineados al UpdateTeacherInput (snake_case). El email es
 * readonly (el endpoint de actualizacion no lo modifica). join_date
 * y notes se reenvian para no borrarlos al editar.
 * ============================================================ */

export interface TeacherFormValues {
  first_name: string
  last_name: string
  dni: string
  phone: string
  email: string
  join_date: string
  notes: string
}

interface EditTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: TeacherFormValues) => Promise<void>
  initialValues: TeacherFormValues | null
}

export function EditTeacherModal({ isOpen, onClose, onSubmit, initialValues }: EditTeacherModalProps) {
  const [values, setValues] = useState<TeacherFormValues>(emptyValues())
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && initialValues) {
      setValues(initialValues)
      setError(null)
    }
  }, [isOpen, initialValues])

  function update<K extends keyof TeacherFormValues>(key: K, val: TeacherFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }))
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
      <ModalHeader title="Editar Docente" onClose={onClose} />
      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        <form id="edit-teacher-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" name="first_name" value={values.first_name} onChange={(e) => update('first_name', e.target.value)} required />
            <FormField label="Apellido" name="last_name" value={values.last_name} onChange={(e) => update('last_name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="DNI" name="dni" value={values.dni} onChange={(e) => update('dni', e.target.value)} required />
            <FormField label="Telefono" name="phone" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mail de Contacto" name="email" type="email" value={values.email} readOnly disabled />
            <FormField label="Fecha de Alta" name="join_date" type="date" value={values.join_date} onChange={(e) => update('join_date', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-body font-medium text-surface-700">Notas Internas</label>
            <textarea
              id="notes"
              value={values.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
              placeholder="Observaciones del docente (opcional)"
            />
          </div>
        </form>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="edit-teacher-form" variant="danger" isLoading={isSubmitting}>Guardar Cambios</Button>
      </ModalFooter>
    </Modal>
  )
}

function emptyValues(): TeacherFormValues {
  return { first_name: '', last_name: '', dni: '', phone: '', email: '', join_date: '', notes: '' }
}
