import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AlertCircle } from 'lucide-react'

/* ============================================================
 * StudentDropModal — Confirmacion de baja de estudiante
 * ============================================================ */

interface StudentDropModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  studentName: string
  isLoading?: boolean
}

function DangerIcon() {
  return (
    <div className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center">
      <AlertCircle size={28} className="text-accent-500" />
    </div>
  )
}

export function StudentDropModal({ isOpen, onClose, onConfirm, studentName, isLoading }: StudentDropModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={<DangerIcon />}
      title={`Dar de baja a ${studentName}`}
      description="Esta accion deshabilitara el acceso de la alumna al sistema. Sus datos e historial se conservaran."
      warning="Esta accion no puede deshacerse facilmente. Asegurate de que es lo que queres hacer."
      confirmLabel="Confirmar Baja"
      confirmVariant="danger"
      isLoading={isLoading}
    />
  )
}