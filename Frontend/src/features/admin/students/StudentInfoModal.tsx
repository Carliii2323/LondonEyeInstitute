import { type ChangeEvent, type ReactNode, useRef, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateOnly } from '@/lib/paymentFormat'
import { studentService, type DniSide, type StudentDetail, type StudentPaymentItem } from '@/services/studentService'
import { formatBackendError } from '@/lib/formatBackendError'
import { Download, Upload } from 'lucide-react'

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
              <div>
                <span className="text-small font-medium text-surface-400 uppercase tracking-wider">Mail de Contacto</span>
                <p className="text-body text-surface-800 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="break-all">{detail.email}</span>
                  {detail.email_verified
                    ? <Badge variant="success">VERIFICADO</Badge>
                    : <Badge variant="warning">SIN VERIFICAR</Badge>}
                </p>
              </div>
              <DataField label="Telefono" value={detail.phone || '—'} />
              <DataField label="Direccion" value={detail.address || '—'} />
              <DataField label="Fecha de Nacimiento" value={detail.birth_date ? formatDateOnly(detail.birth_date) : '—'} />
              <DataField label="Edad" value={ageLabel(detail.birth_date)} />
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

            <SectionLabel className="mt-6">Documento (DNI)</SectionLabel>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DniSlot studentId={detail.id} side="front" label="Frente" hasFile={detail.has_dni_front} />
              <DniSlot studentId={detail.id} side="back" label="Dorso" hasFile={detail.has_dni_back} />
            </div>
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

/** Edad calculada desde "YYYY-MM-DD" ("—" si no hay fecha). */
function ageLabel(birth: string): string {
  if (!birth) return '—'
  const parts = birth.slice(0, 10).split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return '—'
  const today = new Date()
  let age = today.getFullYear() - y
  const mo = today.getMonth() + 1
  if (mo < m || (mo === m && today.getDate() < d)) age -= 1
  return age >= 0 && age < 130 ? `${age} años` : '—'
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

/** Un lado del DNI: ver/descargar + subir/reemplazar (PDF o imagen). */
function DniSlot({ studentId, side, label, hasFile }: { studentId: string; side: DniSide; label: string; hasFile: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploaded, setUploaded] = useState(hasFile)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      await studentService.uploadDni(studentId, side, file)
      setUploaded(true)
    } catch (error) {
      setErr(formatBackendError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-button border border-surface-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-body font-medium text-surface-700">{label}</span>
        {uploaded ? <Badge variant="success">Cargado</Badge> : <Badge variant="default">Sin archivo</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {uploaded && (
          <Button variant="secondary" size="sm" onClick={() => studentService.openDni(studentId, side)}>
            <Download size={14} className="mr-1.5" /> Ver / Descargar
          </Button>
        )}
        <Button variant="ghost" size="sm" isLoading={busy} onClick={() => inputRef.current?.click()}>
          <Upload size={14} className="mr-1.5" /> {uploaded ? 'Reemplazar' : 'Subir'}
        </Button>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      </div>
      {err && <p className="mt-2 text-small text-accent-600">{err}</p>}
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
