import { type FormEvent, useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatBackendError } from '@/lib/formatBackendError'
import { AlertTriangle } from 'lucide-react'

/* ============================================================
 * RejectReceiptModal — Rechazo de comprobante con motivo
 *
 * El motivo se guarda en el pago (rejection_reason). El alumno lo ve en
 * su historial y puede volver a subir el comprobante. No hay email.
 * ============================================================ */

interface RejectReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  studentName: string
  course: string
  amount: string
  sentDate: string
}

export function RejectReceiptModal({
  isOpen, onClose, onConfirm, studentName, course, amount, sentDate,
}: RejectReceiptModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError(null)
    }
  }, [isOpen])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (reason.trim().length < 3) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Rechazar Comprobante" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        {/* Resumen del pago */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-surface-50 rounded-button border border-surface-100 mb-4">
          <DataCell label="Alumno" value={studentName} />
          <DataCell label="Monto" value={amount} />
          <DataCell label="Curso" value={course} />
          <DataCell label="Fecha Envio" value={sentDate} />
        </div>

        {/* Motivo */}
        <form id="reject-form" onSubmit={handleSubmit}>
          <label htmlFor="rejection-reason" className="text-small font-semibold text-surface-500 uppercase tracking-wider block mb-2">
            Motivo del Rechazo
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. El comprobante no corresponde al monto indicado..."
            rows={4}
            required
            className="w-full px-3 py-2 rounded-button border border-accent-200 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none"
          />
        </form>

        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-button">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <span className="text-small text-amber-700">
            El alumno vera este motivo en su historial de pagos y podra volver a subir el comprobante.
          </span>
        </div>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="reject-form" variant="danger" isLoading={isSubmitting} disabled={reason.trim().length < 3}>
          Confirmar Rechazo
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-small font-semibold text-surface-400 uppercase tracking-wider block">{label}</span>
      <p className="text-body font-medium text-surface-800 mt-0.5">{value}</p>
    </div>
  )
}
