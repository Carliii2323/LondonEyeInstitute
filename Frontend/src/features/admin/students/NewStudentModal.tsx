import { type FormEvent, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { KeyRound } from 'lucide-react'
import { formatBackendError } from '@/lib/formatBackendError'
import type { StudentFormValues } from './EditStudentModal'

/* ============================================================
 * NewStudentModal — Alta de estudiante (desde admin)
 *
 * El admin define la contraseña; el alumno queda activo y puede
 * ingresar de inmediato (no hay verificacion por email — eso es
 * solo para el auto-registro publico).
 *
 * La inscripcion a cursos es un flujo aparte (/admin/enrollments),
 * por eso el alta no incluye seleccion de cursos. Ver
 * Tareas-Post-Integracion.md.
 * ============================================================ */

export interface NewStudentValues extends StudentFormValues {
  password: string
}

interface NewStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: NewStudentValues) => Promise<void>
}

export function NewStudentModal({ isOpen, onClose, onSubmit }: NewStudentModalProps) {
  const [hasTutor, setHasTutor] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const values: NewStudentValues = {
      first_name: String(form.get('first_name') ?? ''),
      last_name: String(form.get('last_name') ?? ''),
      dni: String(form.get('dni') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      address: String(form.get('address') ?? ''),
      password: String(form.get('password') ?? ''),
      tutor_name: hasTutor ? String(form.get('tutor_name') ?? '') : '',
      tutor_phone: hasTutor ? String(form.get('tutor_phone') ?? '') : '',
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
      <ModalHeader title="Nuevo Estudiante" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}
        <form id="new-student-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" name="first_name" placeholder="Ej. Julian" required />
            <FormField label="Apellido" name="last_name" placeholder="Ej. Borden" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="DNI" name="dni" placeholder="Sin puntos ni guiones" required />
            <FormField label="Telefono" name="phone" placeholder="+54 9 11 ..." />
          </div>

          <FormField label="Mail de Contacto" name="email" type="email" placeholder="ejemplo@mail.com" required />

          <FormField
            label="Contraseña"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
          />

          <FormField label="Direccion" name="address" placeholder="Calle, Numero, Localidad" />

          <div className="flex items-center justify-between p-3 bg-surface-50 rounded-button border border-surface-100">
            <div>
              <p className="text-body font-medium text-surface-800">Tiene tutor o responsable</p>
              <p className="text-small text-surface-500">Activar si el alumno es menor de edad.</p>
            </div>
            <Toggle checked={hasTutor} onChange={setHasTutor} aria-label="Tiene tutor" />
          </div>

          {hasTutor && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre del Tutor" name="tutor_name" placeholder="Nombre completo" required />
              <FormField label="Telefono del Tutor" name="tutor_phone" placeholder="+54 9 11 ..." required />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-royal-50/50 border border-royal-100 rounded-button">
            <KeyRound size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
            <span className="text-small text-royal-700">
              El alumno quedará activo y podrá ingresar con este email y la contraseña que definas.
            </span>
          </div>
        </form>
      </ModalBody>

      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="new-student-form" variant="danger" isLoading={isSubmitting}>
          Crear Estudiante
        </Button>
      </ModalFooter>
    </Modal>
  )
}
