import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AlertCircle } from 'lucide-react'

/* ============================================================
 * TeacherDropModal — Confirmacion de baja de docente
 * ============================================================ */

interface TeacherDropModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  teacherName: string
  hasCourses?: boolean
  isLoading?: boolean
}

function DangerIcon() {
  return (
    <div className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center">
      <AlertCircle size={28} className="text-accent-500" />
    </div>
  )
}

export function TeacherDropModal({ isOpen, onClose, onConfirm, teacherName, hasCourses, isLoading }: TeacherDropModalProps) {
  const warning = hasCourses
    ? 'Este docente tiene cursos activos asignados. Al darlo de baja, esos cursos quedaran sin docente hasta que asignes uno nuevo.'
    : 'Esta accion no puede deshacerse facilmente. Asegurate de que es lo que queres hacer.'

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={<DangerIcon />}
      title={`Dar de baja a ${teacherName}`}
      description="Esta accion deshabilitara el acceso del docente al sistema. Sus datos e historial se conservaran."
      warning={warning}
      confirmLabel="Confirmar Baja"
      confirmVariant="danger"
      isLoading={isLoading}
    />
  )
}