import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { studentPaymentService } from '@/services/studentPaymentService'
import { settingsService, type PublicSettings } from '@/services/settingsService'
import type { StudentPaymentItem } from '@/services/studentService'
import { periodLabel, formatMoney, formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { Upload, FileCheck, Info } from 'lucide-react'

/* ============================================================
 * MakePaymentModal — Subir comprobante de una cuota
 *
 * Sube el archivo a POST /student/payments/:id/receipt. El pago pasa a
 * 'submitted' y queda pendiente de revision del admin.
 * ============================================================ */

interface MakePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  payment: StudentPaymentItem | null
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function MakePaymentModal({ isOpen, onClose, onSuccess, payment }: MakePaymentModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bank, setBank] = useState<PublicSettings | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setFile(null)
      setError(null)
      settingsService.getPublic().then(setBank).catch(() => setBank(null))
    }
  }, [isOpen])

  if (!payment) return null

  function pickFile(selected: File | undefined) {
    if (!selected) return
    if (!ACCEPTED.includes(selected.type)) {
      setError('Formato no permitido. Solo JPG, PNG, WebP o PDF.')
      return
    }
    if (selected.size > MAX_SIZE) {
      setError('El archivo supera el limite de 5 MB.')
      return
    }
    setError(null)
    setFile(selected)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file || !payment) return
    setSubmitting(true)
    setError(null)
    try {
      await studentPaymentService.submitReceipt(payment.id, file)
      onSuccess()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Subir Comprobante" onClose={onClose} />

      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        <form id="make-payment-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Detalle de la cuota */}
          <SectionLabel>Detalle de la Cuota</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DataField label="Periodo" value={periodLabel(payment.month, payment.year)} />
            <DataField label="Curso" value={payment.course_name} />
            <div>
              <span className="text-small font-semibold text-surface-400 uppercase tracking-wider">Monto a Pagar</span>
              <p className="font-heading text-[1.5rem] font-bold text-surface-900 mt-0.5">{formatMoney(payment.total)}</p>
            </div>
            <DataField label="Vencimiento" value={formatDateOnly(payment.due_date)} />
          </div>

          {/* Datos bancarios */}
          {bank && (bank.cbu || bank.alias) ? (
            <div className="p-4 bg-surface-50 border border-surface-100 rounded-button flex flex-col gap-2">
              <span className="text-small font-semibold text-surface-500 uppercase tracking-wider">Datos para la transferencia</span>
              {bank.cbu && <BankRow label="CBU" value={bank.cbu} mono />}
              {bank.alias && <BankRow label="Alias" value={bank.alias} mono />}
              {bank.account_holder && <BankRow label="Titular" value={bank.account_holder} />}
              <p className="text-small text-surface-500 mt-1">
                Transferi exactamente <strong className="text-surface-800">{formatMoney(payment.total)}</strong> y subi el comprobante.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-royal-50 border border-royal-100 rounded-button">
              <Info size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
              <span className="text-small text-royal-700">
                Solicitá los datos de transferencia a administracion. Transferi exactamente{' '}
                <strong>{formatMoney(payment.total)}</strong> y subi el comprobante para que el pago sea identificado.
              </span>
            </div>
          )}

          {/* Upload */}
          <SectionLabel>Comprobante</SectionLabel>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-button p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-royal-400 bg-royal-50/30' : 'border-surface-200 hover:border-surface-300'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => pickFile(e.target.files?.[0])}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileCheck size={28} className="text-emerald-500" />
                <p className="text-body font-medium text-surface-800">{file.name}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-small text-accent-500 hover:text-accent-600 transition-colors"
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={28} className="text-surface-400" />
                <p className="text-body font-medium text-surface-800">Arrastra tu comprobante aqui</p>
                <p className="text-small text-surface-500">o haz click para seleccionar un archivo</p>
                <p className="text-[0.6875rem] text-surface-400 mt-1">Formatos: JPG, PNG, WebP, PDF. Max 5MB.</p>
              </div>
            )}
          </div>
        </form>
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="make-payment-form" variant="danger" isLoading={isSubmitting} disabled={!file}>
          Enviar Comprobante
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-small font-semibold text-surface-500 uppercase tracking-wider">{children}</h3>
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-small font-semibold text-surface-400 uppercase tracking-wider">{label}</span>
      <p className="text-body font-medium text-surface-800 mt-0.5">{value}</p>
    </div>
  )
}

function BankRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-small text-surface-500">{label}</span>
      <span className={`text-body font-bold text-surface-800 ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
    </div>
  )
}
