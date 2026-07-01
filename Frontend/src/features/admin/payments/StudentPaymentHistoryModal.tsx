import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { studentService, type StudentPaymentItem } from '@/services/studentService'
import { paymentService, type PaymentStatus } from '@/services/paymentService'
import { statusBadge, periodLabel, typeLabel, formatMoney, formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { FileText } from 'lucide-react'

/* ============================================================
 * StudentPaymentHistoryModal — Historial de pagos de un alumno
 *
 * Consume GET /admin/students/:id/payments (studentService.getPayments).
 * ============================================================ */

interface StudentPaymentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
  studentName: string
}

export function StudentPaymentHistoryModal({
  isOpen, onClose, studentId, studentName,
}: StudentPaymentHistoryModalProps) {
  const [items, setItems] = useState<StudentPaymentItem[]>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !studentId) return
    setLoading(true)
    setError(null)
    studentService
      .getPayments(studentId)
      .then(setItems)
      .catch((err) => setError(formatBackendError(err)))
      .finally(() => setLoading(false))
  }, [isOpen, studentId])

  const countBy = (s: PaymentStatus) => items.filter((i) => i.status === s).length
  const totalPaid = items
    .filter((i) => i.status === 'approved')
    .reduce((sum, i) => sum + Number(i.total), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader title={`Historial de Pagos — ${studentName}`} onClose={onClose} />

      <ModalBody>
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        ) : (
          <>
            {/* Resumen */}
            <div className="flex flex-wrap gap-2 mb-4">
              <SummaryBadge color="emerald" label="Pagados" value={countBy('approved')} />
              <SummaryBadge color="amber" label="Pendientes" value={countBy('pending')} />
              <SummaryBadge color="royal" label="En revision" value={countBy('submitted')} />
              <SummaryBadge color="accent" label="Vencidos" value={countBy('overdue')} />
              <SummaryBadge color="surface" label="Total abonado" value={formatMoney(String(totalPaid))} />
            </div>

            {/* Tabla */}
            <div className="rounded-button border border-surface-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50/50">
                    {['Periodo', 'Curso', 'Tipo', 'Monto', 'Vence', 'Estado', 'Comprobante'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-body text-surface-400">Sin pagos registrados.</td></tr>
                  ) : (
                    items.map((p) => {
                      const badge = statusBadge(p.status)
                      const isOverdue = p.status === 'overdue'
                      return (
                        <tr key={p.id} className={isOverdue ? 'bg-accent-50/40' : ''}>
                          <td className="px-3 py-3 text-body text-surface-700 whitespace-nowrap">{periodLabel(p.month, p.year)}</td>
                          <td className="px-3 py-3 text-body text-surface-600">{p.course_name}</td>
                          <td className="px-3 py-3 text-small text-surface-500">{typeLabel(p.type)}</td>
                          <td className="px-3 py-3 text-body font-medium text-surface-800 whitespace-nowrap">{formatMoney(p.total)}</td>
                          <td className="px-3 py-3 text-body text-surface-600 whitespace-nowrap">{formatDateOnly(p.due_date)}</td>
                          <td className="px-3 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                          <td className="px-3 py-3">
                            {p.receipt_url ? (
                              <button
                                onClick={() => paymentService.openReceipt(p.id)}
                                className="flex items-center gap-1.5 text-small font-medium text-royal-500 hover:text-royal-600 transition-colors"
                              >
                                <FileText size={14} /> Ver
                              </button>
                            ) : (
                              <span className="text-small text-surface-300">--</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter className="justify-end">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </ModalFooter>
    </Modal>
  )
}

/* ---- Badge de resumen ---- */

interface SummaryBadgeProps {
  color: 'emerald' | 'amber' | 'royal' | 'accent' | 'surface'
  label: string
  value: number | string
}

const BADGE_COLORS = {
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  royal: { dot: 'bg-royal-500', bg: 'bg-royal-50', text: 'text-royal-700' },
  accent: { dot: 'bg-accent-500', bg: 'bg-accent-50', text: 'text-accent-700' },
  surface: { dot: 'bg-surface-500', bg: 'bg-surface-100', text: 'text-surface-700' },
}

function SummaryBadge({ color, label, value }: SummaryBadgeProps) {
  const c = BADGE_COLORS[color]
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-badge ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-small font-medium ${c.text}`}>{label}: {value}</span>
    </div>
  )
}
