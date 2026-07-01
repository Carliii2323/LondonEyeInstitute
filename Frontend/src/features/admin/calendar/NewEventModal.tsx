import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { calendarService } from '@/services/calendarService'
import { formatLongDate, toIsoDate } from '@/features/shared/calendar/calendarHelpers'
import type { EventType } from '@/features/shared/calendar/types'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * NewEventModal — Crear evento de calendario
 *
 * Campos alineados al backend (CreateEventRequest): title, type, date,
 * start_time/end_time (opcional), message (opcional), course_id (opcional).
 * ============================================================ */

interface NewEventModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  selectedDate: Date | null
  courses: { id: string; name: string }[]
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'evento', label: 'Evento' },
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'feriado', label: 'Feriado' },
  { value: 'otro', label: 'Otro' },
]

const SELECT_CLASS =
  'px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500'

export function NewEventModal({ isOpen, onClose, onCreated, selectedDate, courses }: NewEventModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('evento')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [message, setMessage] = useState('')
  const [courseId, setCourseId] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(''); setType('evento'); setStartTime(''); setEndTime('')
      setMessage(''); setCourseId(''); setError(null)
    }
  }, [isOpen])

  if (!selectedDate) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDate) return
    setSubmitting(true)
    setError(null)
    try {
      await calendarService.create({
        title: title.trim(),
        type,
        date: toIsoDate(selectedDate),
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        message: message.trim() || undefined,
        course_id: courseId || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Nuevo Evento" onClose={onClose} />

      <div className="px-6 -mt-3 mb-2">
        <p className="text-small text-surface-500">{formatLongDate(selectedDate)}</p>
      </div>

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        <form id="new-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Titulo del Evento"
            name="title"
            placeholder="Ej. Examen Final, Feriado, Recordatorio..."
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className="text-body font-medium text-surface-700">Tipo</label>
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as EventType)} className={SELECT_CLASS}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Hora opcional */}
          <div>
            <label className="text-body font-medium text-surface-700 block mb-1.5">Hora (opcional)</label>
            <div className="grid grid-cols-2 gap-3">
              <TimeField label="Desde" value={startTime} onChange={setStartTime} />
              <TimeField label="Hasta" value={endTime} onChange={setEndTime} />
            </div>
            <p className="text-small text-surface-500 mt-1.5">Dejar vacio si es un evento de dia completo.</p>
          </div>

          {/* Curso opcional */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="course" className="text-small font-semibold text-surface-500 uppercase tracking-wider">
              Curso (opcional)
            </label>
            <select id="course" name="course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={SELECT_CLASS}>
              <option value="">Todos (evento general)</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Mensaje opcional */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-small font-semibold text-surface-500 uppercase tracking-wider">
              Descripcion (opcional)
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detalle del evento..."
              className="px-3 py-2 rounded-button border border-surface-200 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 resize-none"
            />
          </div>
        </form>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="new-event-form" variant="danger" isLoading={isSubmitting} disabled={title.trim().length < 2}>
          Guardar Evento
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-input border border-surface-200 bg-surface-50 text-body text-center text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
      />
      <span className="text-small text-surface-500">{label}</span>
    </div>
  )
}
