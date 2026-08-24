import { type ReactNode } from 'react'
import { Modal, ModalFooter } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  warning?: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  icon?: ReactNode
  isLoading?: boolean
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, warning, confirmLabel = 'Confirmar', confirmVariant = 'danger', icon, isLoading = false }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6 text-center">
        {icon && <div className="flex justify-center mb-4">{icon}</div>}
        <h2 className="font-heading text-section-title text-surface-900">{title}</h2>
        <p className="text-body text-surface-500 mt-2">{description}</p>

        {warning && (
          <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-100 flex items-start gap-2 text-left">
            <AlertTriangle size={18} className="text-accent-500 flex-shrink-0 mt-0.5" />
            <span className="text-small text-accent-600">{warning}</span>
          </div>
        )}
      </div>

      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  )
}