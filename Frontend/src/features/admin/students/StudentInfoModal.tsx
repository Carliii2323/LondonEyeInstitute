import type { ReactNode } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateOnly } from '@/lib/paymentFormat'
import type { StudentDetail, StudentPaymentItem } from '@/services/studentService'

/* ============================================================
 * StudentInfoModal — Detalle de estudiante
 *
 * Datos personales (GET /:id) + pagos del alumno (GET /:id/payments).
 * Sin "edad": el backend no modela birth_date (ver Tareas-Post-Integracion.md).
 * ============================================================ */

interface StudentInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDrop: () => void
  onReactivate: () => void
  detail: StudentDetail | null
  payments: StudentPaymentItem[]
  isLoading?: boolean
}

function payBadge(status: string): { variant: 'success' | 'warning' | 'danger'; label: string } {
  switch (status) {
    case 'approved': return { variant: 'success', label: 'PAGADO' }
    case 'overdue': return { variant: 'danger', label: 'VENCIDO' }
    case 'rejected': return { variant: 'danger', label: 'RECHAZADO' }
    case 'submitted': return { variant: 'warning', label: 'EN REVISION' }
    default: return { variant: 'warning', label: 'PENDIENTE' }
  }
}

export function StudentInfoModal({ isOpen, onClose, onEdit, onDrop, onReactivate, detail, payments, isLoading }: StudentInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Informacion del Estudiante" onClose={onClose} />

      <ModalBody>
        {isLoading || !detail ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SectionLabel>Datos Personales</SectionLabel>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-3">
              <DataField label="Nombre Completo" value={`${detail.first_name} ${detail.last_name}`} />
              <DataField label="DNI" value={detail.dni} />
              <DataField label="Mail de Contacto" value={detail.email} />
              <DataField label="Telefono" value={detail.phone || '—'} />
              <DataField label="Direccion" value={detail.address || '—'} />
              <DataField label="Fecha de Alta" value={formatDateOnly(detail.created_at)} />
            </div>

            <SectionLabel className="mt-6">Cuotas y Estado de Pago</SectionLabel>
            <div className="mt-3 border border-surface-200 rounded-button overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50/50">
                    <th className="px-4 py-2 text-left text-small font-semibold text-surface-500 uppercase">Curso</th>
                    <th className="px-4 py-2 text-left text-small font-semibold text-surface-500 uppercase">Monto</th>
                    <th className="px-4 py-2 text-left text-small font-semibold text-surface-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-small text-surface-400">Sin pagos registrados.</td></tr>
                  ) : (
                    payments.map((p) => {
                      const b = payBadge(p.status)
                      return (
                        <tr key={p.id} className="border-t border-surface-100">
                          <td className="px-4 py-3 text-body text-surface-700">{p.course_name}</td>
                          <td className="px-4 py-3 text-body text-surface-700">${p.total}</td>
                          <td className="px-4 py-3"><Badge variant={b.variant}>{b.label}</Badge></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <SectionLabel className="mt-6">Tutor / Responsable</SectionLabel>
            <p className="text-body text-surface-600 mt-2">
              {detail.tutor_name
                ? `${detail.tutor_name}${detail.tutor_phone ? ` — ${detail.tutor_phone}` : ''}`
                : <span className="italic text-surface-400">No tiene tutor asignado.</span>}
            </p>
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

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-small font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100 pb-2">
        {children}
      </h3>
    </div>
  )
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-small font-medium text-surface-400 uppercase tracking-wider">{label}</span>
      <p className="text-body text-surface-800 mt-0.5">{value}</p>
    </div>
  )
}
