import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { PaymentListItem } from '@/services/paymentService'
import { periodLabel, formatMoney } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { AlertTriangle } from 'lucide-react'

/* ============================================================
 * AnnulPaymentModal — Anular un pago (cuota/cargo)
 *
 * Marca el pago como 'anulado' (errores o alumnos dados de baja). Conserva el
 * registro y deja de contar como deuda / para certificados. No revierte.
 * ============================================================ */

interface AnnulPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  payment: PaymentListItem | null
}

export function AnnulPaymentModal({ isOpen, onClose, onConfirm, payment }: AnnulPaymentModalProps) {
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) setError(null)
  }, [isOpen])

  if (!payment) return null

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Anular Pago" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4 p-4 bg-surface-50 rounded-button border border-surface-100">
          <DataCell label="Alumno" value={`${payment.first_name} ${payment.last_name}`} />
          <DataCell label="Monto" value={formatMoney(payment.total)} />
          <DataCell label="Curso" value={payment.course_name} />
          <DataCell label="Periodo" value={periodLabel(payment.month, payment.year)} />
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-accent-50 border border-accent-200 rounded-button">
          <AlertTriangle size={18} className="text-accent-500 flex-shrink-0 mt-0.5" />
          <span className="text-small text-accent-700">
            Vas a <strong>anular</strong> este pago. Deja de contar como deuda y no se podrá cobrar.
            El registro se conserva (no se borra). Usalo para cargos creados por error o de alumnos dados de baja.
          </span>
        </div>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={handleConfirm} isLoading={isSubmitting}>
          Anular Pago
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
