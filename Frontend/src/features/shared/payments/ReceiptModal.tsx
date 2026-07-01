import { useRef, useState } from 'react'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'
import { downloadSheetPdf } from '@/lib/downloadSheetPdf'
import { ReceiptSheet } from './ReceiptSheet'
import { formatMoney } from '@/lib/paymentFormat'

/* ============================================================
 * ReceiptModal — Recibo de un pago aprobado (preview + descarga PDF)
 *
 * Compartido entre admin y alumno. Recibe los datos crudos del pago y arma el
 * recibo (la fecha es la de emisión = hoy). Descarga A4 vertical y chico
 * (no ocupa toda la hoja).
 * ============================================================ */

export interface ReceiptInput {
  firstName: string
  lastName: string
  amount: string // monto crudo del backend (Cuota)
  lateFee: string // Mora
  total: string // TOTAL
}

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptInput | null
}

export function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  const captureRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  if (!receipt) return null

  const data = {
    firstName: receipt.firstName,
    lastName: receipt.lastName,
    amount: formatMoney(receipt.amount),
    lateFee: formatMoney(receipt.lateFee),
    total: formatMoney(receipt.total),
    date: new Date().toLocaleDateString('es-AR'),
  }

  async function handleDownload() {
    if (!captureRef.current || !receipt) return
    setBusy(true)
    try {
      await downloadSheetPdf(captureRef.current, `Recibo - ${receipt.firstName} ${receipt.lastName}.pdf`, {
        orientation: 'portrait',
        maxWidthMm: 90,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Recibo" onClose={onClose} />
      <ModalBody>
        <div ref={captureRef} className="mx-auto w-full max-w-[340px]">
          <ReceiptSheet data={data} sheetClassName="w-full border border-surface-200" />
        </div>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button variant="danger" onClick={handleDownload} disabled={busy}>
          <Download size={16} /> {busy ? 'Generando…' : 'Descargar recibo'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
