import type { ReactNode } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateOnly } from '@/lib/paymentFormat'
import type { TeacherDetail } from '@/services/teacherService'

/* ============================================================
 * TeacherInfoModal — Detalle del docente
 *
 * Datos del backend (GET /admin/teachers/:id). "Cursos asignados" y
 * "estadisticas" se restauran cuando el backend los provea desde admin
 * (ver Tareas-Post-Integracion.md).
 * ============================================================ */

interface TeacherInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDrop: () => void
  onReactivate: () => void
  detail: TeacherDetail | null
  isLoading?: boolean
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  active: { label: 'ACTIVO', variant: 'success' },
  pending: { label: 'PENDIENTE', variant: 'warning' },
  inactive: { label: 'INACTIVO', variant: 'default' },
}

export function TeacherInfoModal({ isOpen, onClose, onEdit, onDrop, onReactivate, detail, isLoading }: TeacherInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Informacion del Docente" onClose={onClose} />

      <ModalBody>
        {isLoading || !detail ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 pb-5 border-b border-surface-100">
              <Avatar initials={`${detail.first_name[0] ?? ''}${detail.last_name[0] ?? ''}`} size="md" className="!w-14 !h-14 !text-body" />
              <div className="flex-1">
                <h3 className="font-heading text-section-title text-surface-900">{detail.first_name} {detail.last_name}</h3>
                <p className="text-small text-surface-500 mt-0.5">{detail.email}</p>
              </div>
              {(() => {
                const b = STATUS_BADGE[detail.status] ?? { label: detail.status, variant: 'default' as const }
                return <Badge variant={b.variant}>{b.label}</Badge>
              })()}
            </div>

            <SectionTitle className="mt-5">Datos Personales</SectionTitle>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-3">
              <DataField label="DNI" value={detail.dni} />
              <DataField label="Telefono" value={detail.phone || '—'} />
              <DataField label="Mail de Contacto" value={detail.email} />
              <DataField label="Fecha de Alta" value={formatDateOnly(detail.join_date)} />
            </div>

            {detail.notes && (
              <>
                <SectionTitle className="mt-6">Notas Internas</SectionTitle>
                <p className="text-body text-surface-600 mt-2 whitespace-pre-wrap">{detail.notes}</p>
              </>
            )}
          </>
        )}
      </ModalBody>

      <ModalFooter className="justify-between">
        {detail ? (
          detail.status === 'inactive' ? (
            <button
              onClick={onReactivate}
              className="text-body font-semibold text-emerald-600 hover:text-emerald-700 transition-colors uppercase"
            >
              Dar de Alta
            </button>
          ) : (
            <button
              onClick={onDrop}
              className="text-body font-semibold text-accent-500 hover:text-accent-600 transition-colors uppercase"
            >
              Dar de Baja
            </button>
          )
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="danger" onClick={onEdit}>Editar Datos</Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  const baseClass = 'text-small font-semibold text-surface-500 uppercase tracking-wider pb-2 border-b border-surface-100'
  return <h3 className={className ? `${baseClass} ${className}` : baseClass}>{children}</h3>
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-small font-medium text-surface-400 uppercase tracking-wider">{label}</span>
      <p className="text-body text-surface-800 mt-0.5">{value}</p>
    </div>
  )
}
