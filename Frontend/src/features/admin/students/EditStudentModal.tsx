import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * EditStudentModal — Edicion de datos de estudiante
 *
 * Campos alineados al UpdateStudentInput del backend (snake_case).
 * El email es readonly: el endpoint de actualizacion no lo modifica.
 * ============================================================ */

export interface StudentFormValues {
  first_name: string
  last_name: string
  dni: string
  email: string
  phone: string
  address: string
  tutor_name: string
  tutor_phone: string
}

interface EditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: StudentFormValues) => Promise<void>
  initialValues: StudentFormValues | null
}

export function EditStudentModal({ isOpen, onClose, onSubmit, initialValues }: EditStudentModalProps) {
  const [values, setValues] = useState<StudentFormValues>(emptyValues())
  const [hasTutor, setHasTutor] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && initialValues) {
      setValues(initialValues)
      setHasTutor(Boolean(initialValues.tutor_name))
      setError(null)
    }
  }, [isOpen, initialValues])

  function update<K extends keyof StudentFormValues>(key: K, val: StudentFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: StudentFormValues = hasTutor
        ? values
        : { ...values, tutor_name: '', tutor_phone: '' }
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Editar Estudiante" onClose={onClose} />
      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        <form id="edit-student-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" name="first_name" value={values.first_name} onChange={(e) => update('first_name', e.target.value)} required />
            <FormField label="Apellido" name="last_name" value={values.last_name} onChange={(e) => update('last_name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="DNI" name="dni" value={values.dni} onChange={(e) => update('dni', e.target.value)} required />
            <FormField label="Telefono" name="phone" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <FormField label="Mail de Contacto" name="email" type="email" value={values.email} readOnly disabled />
          <FormField label="Direccion" name="address" value={values.address} onChange={(e) => update('address', e.target.value)} />

          <div className="flex items-center justify-between p-3 bg-surface-50 rounded-button border border-surface-100">
            <div>
              <p className="text-body font-medium text-surface-800">Tiene tutor o responsable</p>
              <p className="text-small text-surface-500">Activar si el alumno es menor de edad.</p>
            </div>
            <Toggle checked={hasTutor} onChange={setHasTutor} aria-label="Tiene tutor" />
          </div>
          {hasTutor && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre del Tutor" name="tutor_name" value={values.tutor_name} onChange={(e) => update('tutor_name', e.target.value)} required />
              <FormField label="Telefono del Tutor" name="tutor_phone" value={values.tutor_phone} onChange={(e) => update('tutor_phone', e.target.value)} required />
            </div>
          )}
        </form>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="edit-student-form" variant="danger" isLoading={isSubmitting}>Guardar Cambios</Button>
      </ModalFooter>
    </Modal>
  )
}

function emptyValues(): StudentFormValues {
  return { first_name: '', last_name: '', dni: '', email: '', phone: '', address: '', tutor_name: '', tutor_phone: '' }
}
