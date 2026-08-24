import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { calendarService } from '@/services/calendarService'
import { notificationService, type AudienceType } from '@/services/notificationService'
import { formatLongDate, toIsoDate } from '@/features/shared/calendar/calendarHelpers'
import type { CalendarEvent, EventType } from '@/features/shared/calendar/types'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * NewEventModal — Crear / editar / eliminar evento de calendario
 *
 * Campos alineados al backend (CreateEventRequest): title, type, date,
 * start_time/end_time (opcional), message (opcional), course_id (opcional).
 * Si `event` viene, el modal edita (PUT) y ofrece eliminar (DELETE).
 * ============================================================ */

interface NewEventModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  selectedDate: Date | null
  event?: CalendarEvent | null
  courses: { id: string; name: string }[]
  /** Modo profesor: usa sus rutas, exige un curso propio y oculta la notificación. */
  asTeacher?: boolean
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'evento', label: 'Evento' },
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'feriado', label: 'Feriado' },
  { value: 'otro', label: 'Otro' },
]

const SELECT_CLASS =
  'px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500'

export function NewEventModal({ isOpen, onClose, onCreated, selectedDate, event, courses, asTeacher = false }: NewEventModalProps) {
  const isEdit = Boolean(event)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('evento')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [message, setMessage] = useState('')
  const [courseId, setCourseId] = useState('')
  const [notify, setNotify] = useState(false)
  const [notifyAudience, setNotifyAudience] = useState<AudienceType>('estudiantes')
  const [eventDone, setEventDone] = useState(false) // evita recrear el evento al reintentar la notificación
  const [isSubmitting, setSubmitting] = useState(false)
  const [isDeleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setConfirmDelete(false)
    setNotify(false)
    setNotifyAudience('estudiantes')
    setEventDone(false)
    if (event) {
      setTitle(event.title)
      setType(event.type)
      setStartTime(event.start_time ?? '')
      setEndTime(event.end_time ?? '')
      setMessage(event.message ?? '')
      setCourseId(event.course_id ?? '')
    } else {
      setTitle(''); setType('evento'); setStartTime(''); setEndTime('')
      setMessage(''); setCourseId('')
    }
  }, [isOpen, event])

  // Si se saca el curso, la audiencia "curso" deja de tener sentido.
  useEffect(() => {
    if (!courseId && notifyAudience === 'curso') setNotifyAudience('estudiantes')
  }, [courseId, notifyAudience])

  if (!selectedDate) return null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDate) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        type,
        date: toIsoDate(selectedDate),
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        message: message.trim() || undefined,
        course_id: courseId || undefined,
      }
      if (event) {
        await calendarService.update(event.id, payload, asTeacher)
        onCreated()
        onClose()
        return
      }

      // Crear el evento una sola vez (aunque se reintente por fallo de la notificación).
      if (!eventDone) {
        await calendarService.create(payload, asTeacher)
        setEventDone(true)
        onCreated() // refresca el calendario ya
      }

      if (notify) {
        await notificationService.create(buildEventNotification())
      }
      onClose()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  /** Notificación derivada del evento (tipo "evento", audiencia elegida). */
  function buildEventNotification() {
    const dateStr = selectedDate ? formatLongDate(selectedDate) : ''
    const timeStr = startTime ? ` a las ${startTime}${endTime ? ` - ${endTime}` : ''} hs` : ''
    const base = message.trim()
    const audience: AudienceType = notifyAudience === 'curso' && courseId ? 'curso' : notifyAudience === 'curso' ? 'estudiantes' : notifyAudience
    return {
      title: title.trim(),
      message: `${base ? base + '\n\n' : ''}Fecha: ${dateStr}${timeStr}.`,
      type: 'evento' as const,
      audience_type: audience,
      audience_course_id: audience === 'curso' ? courseId : undefined,
    }
  }

  async function handleDelete() {
    if (!event) return
    setDeleting(true)
    setError(null)
    try {
      await calendarService.remove(event.id, asTeacher)
      onCreated()
      onClose()
    } catch (err) {
      setError(formatBackendError(err))
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title={isEdit ? 'Editar Evento' : 'Nuevo Evento'} onClose={onClose} />

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
              {asTeacher ? 'Curso' : 'Curso (opcional)'}
            </label>
            <select id="course" name="course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={SELECT_CLASS}>
              <option value="">{asTeacher ? 'Seleccioná uno de tus cursos' : 'Todos (evento general)'}</option>
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

          {/* Notificar al crear (F8) — solo admin, en alta */}
          {!isEdit && !asTeacher && (
            <div className="rounded-button border border-surface-200 p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-royal-500" />
                <span className="text-body text-surface-700">Publicar un aviso al crear este evento</span>
              </label>
              {notify && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <label htmlFor="notify-audience" className="text-small font-semibold text-surface-500 uppercase tracking-wider">Notificar a</label>
                  <select
                    id="notify-audience"
                    value={notifyAudience}
                    onChange={(e) => setNotifyAudience(e.target.value as AudienceType)}
                    className={SELECT_CLASS}
                  >
                    {courseId && <option value="curso">Solo el curso seleccionado</option>}
                    <option value="estudiantes">Estudiantes</option>
                    <option value="docentes">Docentes</option>
                    <option value="todos">Todos</option>
                  </select>
                  <p className="text-small text-surface-500">Se publica un aviso tipo evento en Notificaciones.</p>
                </div>
              )}
            </div>
          )}

          {eventDone && error && (
            <p className="text-small text-amber-600">El evento ya se creó. Podés reintentar la notificación o cerrar con Cancelar.</p>
          )}
        </form>
      </ModalBody>

      <ModalFooter className="justify-between">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-small text-surface-600">¿Eliminar?</span>
              <Button variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>Sí</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-body font-semibold text-accent-500 hover:text-accent-600 transition-colors"
            >
              Eliminar
            </button>
          )
        ) : (
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        )}
        <Button type="submit" form="new-event-form" variant="danger" isLoading={isSubmitting} disabled={title.trim().length < 2 || (asTeacher && !courseId)}>
          {isEdit ? 'Guardar Cambios' : 'Guardar Evento'}
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
