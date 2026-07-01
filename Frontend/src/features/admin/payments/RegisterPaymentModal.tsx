import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { PaymentListItem, PaymentMethod } from '@/services/paymentService'
import { periodLabel, formatMoney } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { Info } from 'lucide-react'

/* ============================================================
 * RegisterPaymentModal — Registrar un pago offline (efectivo / fuera de la app)
 *
 * Marca una cuota 'pending' como pagada directamente (PATCH approve),
 * sin que el alumno suba comprobante. Para pagos verificados por fuera.
 * ============================================================ */

interface RegisterPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (method?: PaymentMethod) => Promise<void>
  payment: PaymentListItem | null
}

const METHOD_CLASS =
  'px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500'

export function RegisterPaymentModal({ isOpen, onClose, onConfirm, payment }: RegisterPaymentModalProps) {
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<'' | PaymentMethod>('')

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setMethod('')
    }
  }, [isOpen])

  if (!payment) return null

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(method || undefined)
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Registrar Pago" onClose={onClose} />

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

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-small font-semibold text-surface-500 uppercase tracking-wider">Medio de pago (opcional)</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)} className={METHOD_CLASS}>
            <option value="">Sin especificar</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-royal-50 border border-royal-100 rounded-button">
          <Info size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
          <span className="text-small text-royal-700">
            Vas a marcar esta cuota como <strong>pagada</strong> sin comprobante. Usalo para pagos en efectivo o
            verificados por fuera de la app.
          </span>
        </div>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleConfirm} isLoading={isSubmitting}>
          Confirmar Pago
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
