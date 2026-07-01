import { type FormEvent, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { KeyRound } from 'lucide-react'
import { formatBackendError } from '@/lib/formatBackendError'
import type { TeacherFormValues } from './EditTeacherModal'

/* ============================================================
 * NewTeacherModal — Alta de docente
 *
 * El admin define la contraseña; el docente queda activo. La
 * asignacion de cursos es un flujo aparte (ver Tareas-Post-Integracion.md).
 * ============================================================ */

export interface NewTeacherValues extends TeacherFormValues {
  password: string
}

interface NewTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: NewTeacherValues) => Promise<void>
}

export function NewTeacherModal({ isOpen, onClose, onSubmit }: NewTeacherModalProps) {
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const values: NewTeacherValues = {
      first_name: String(form.get('first_name') ?? ''),
      last_name: String(form.get('last_name') ?? ''),
      dni: String(form.get('dni') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      join_date: String(form.get('join_date') ?? ''),
      notes: String(form.get('notes') ?? ''),
    }

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
      <ModalHeader title="Nuevo Docente" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        <form id="new-teacher-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" name="first_name" placeholder="Ej. Julian" required />
            <FormField label="Apellido" name="last_name" placeholder="Ej. Rossi" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="DNI" name="dni" placeholder="Sin puntos ni guiones" required />
            <FormField label="Telefono" name="phone" placeholder="+54 9 11 ..." />
          </div>

          <FormField label="Mail de Contacto" name="email" type="email" placeholder="nombre@institucion.edu" required />

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contraseña" name="password" type="password" placeholder="Mínimo 8 caracteres" required minLength={8} />
            <FormField label="Fecha de Alta" name="join_date" type="date" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-teacher-notes" className="text-body font-medium text-surface-700">Notas Internas</label>
            <textarea
              id="new-teacher-notes"
              name="notes"
              rows={3}
              className="w-full px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
              placeholder="Observaciones del docente (opcional)"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-royal-50/50 border border-royal-100 rounded-button">
            <KeyRound size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
            <span className="text-small text-royal-700">
              El docente quedará activo y podrá ingresar con este email y la contraseña que definas.
            </span>
          </div>
        </form>
      </ModalBody>

      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="new-teacher-form" variant="danger" isLoading={isSubmitting}>
          Crear Docente
        </Button>
      </ModalFooter>
    </Modal>
  )
}
