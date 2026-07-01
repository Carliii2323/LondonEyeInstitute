import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MakePaymentModal } from './MakePaymentModal'
import { ReceiptModal } from '@/features/shared/payments/ReceiptModal'
import { studentPaymentService } from '@/services/studentPaymentService'
import type { StudentPaymentItem } from '@/services/studentService'
import { useAuthStore } from '@/stores/authStore'
import { statusBadge, periodLabel, typeLabel, formatMoney, formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { AlertTriangle } from 'lucide-react'

/* ============================================================
 * StudentPaymentsPage — Mis Pagos (conectado al backend)
 *
 * Lista las cuotas/cargos del alumno (GET /student/payments) y permite
 * subir el comprobante de las que esten pending / overdue / rejected.
 * ============================================================ */

/** Estados en los que el alumno puede subir comprobante (coincide con el backend). */
function canUpload(status: StudentPaymentItem['status']): boolean {
  return status === 'pending' || status === 'overdue' || status === 'rejected'
}

export function StudentPaymentsPage() {
  const user = useAuthStore((s) => s.user)
  const [payments, setPayments] = useState<StudentPaymentItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<StudentPaymentItem | null>(null)
  const [receiptTarget, setReceiptTarget] = useState<StudentPaymentItem | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPayments(await studentPaymentService.listMine())
    } catch (err) {
      setError(formatBackendError(err))
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // Urgentes: vencidos primero, luego rechazados, luego pendientes
  const urgent = payments
    .filter((p) => canUpload(p.status))
    .sort((a, b) => urgencyRank(a.status) - urgencyRank(b.status))

  return (
    <PageContainer title="Mis Pagos">
      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Cuotas que requieren atencion */}
          {urgent.length > 0 && (
            <div className="mb-4 bg-white rounded-card shadow-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-100">
                <AlertTriangle size={16} className="flex-shrink-0 text-amber-500" />
                <span className="text-body font-semibold text-surface-800">Cuotas que requieren atencion</span>
              </div>
              <div className="divide-y divide-surface-100">
                {urgent.map((p) => {
                  const badge = statusBadge(p.status)
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-l-2 ${
                        p.status === 'overdue' ? 'border-l-accent-500' : p.status === 'rejected' ? 'border-l-accent-400' : 'border-l-amber-400'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4 min-w-0">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-body font-medium text-surface-800">{p.course_name}</span>
                        <span className="text-small text-surface-400">{periodLabel(p.month, p.year)}</span>
                        <span className="text-body font-bold text-surface-900">{formatMoney(p.total)}</span>
                        <span className="text-small text-surface-400">Vence {formatDateOnly(p.due_date)}</span>
                        {p.status === 'rejected' && p.rejection_reason && (
                          <span className="text-small text-accent-600 italic basis-full">Rechazado: {p.rejection_reason}</span>
                        )}
                      </div>
                      <Button variant="danger" size="sm" onClick={() => setPayTarget(p)}>
                        Subir comprobante
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Todas mis cuotas */}
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <div className="p-5 pb-4">
              <h2 className="font-heading text-section-title text-surface-900">Mis Cuotas</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50/50 border-y border-surface-100">
                    {['Periodo', 'Curso', 'Tipo', 'Monto', 'Vencimiento', 'Estado', 'Accion'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-body text-surface-400">No tenes cuotas registradas.</td></tr>
                  ) : (
                    payments.map((p) => {
                      const badge = statusBadge(p.status)
                      const isOverdue = p.status === 'overdue'
                      return (
                        <tr key={p.id} className={isOverdue ? 'bg-accent-50/40' : ''}>
                          <td className="px-5 py-4 text-body text-surface-700 whitespace-nowrap">{periodLabel(p.month, p.year)}</td>
                          <td className="px-5 py-4 text-body text-surface-600">{p.course_name}</td>
                          <td className="px-5 py-4 text-small text-surface-500">{typeLabel(p.type)}</td>
                          <td className="px-5 py-4 text-body font-bold text-surface-800 whitespace-nowrap">{formatMoney(p.total)}</td>
                          <td className="px-5 py-4 text-body text-surface-600 whitespace-nowrap">{formatDateOnly(p.due_date)}</td>
                          <td className="px-5 py-4"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              {canUpload(p.status) && (
                                <button onClick={() => setPayTarget(p)} className="text-small font-medium text-royal-500 hover:text-royal-600 transition-colors">
                                  Subir comprobante
                                </button>
                              )}
                              {p.receipt_url && (
                                <button onClick={() => studentPaymentService.openReceipt(p.id)} className="text-small font-medium text-surface-600 hover:text-surface-800 transition-colors">
                                  Ver comprobante
                                </button>
                              )}
                              {p.status === 'approved' && (
                                <button onClick={() => setReceiptTarget(p)} className="text-small font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                                  Recibo
                                </button>
                              )}
                              {!canUpload(p.status) && !p.receipt_url && p.status !== 'approved' && (
                                <span className="text-small text-surface-300">--</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <MakePaymentModal
        isOpen={payTarget !== null}
        onClose={() => setPayTarget(null)}
        onSuccess={() => { setPayTarget(null); fetchPayments() }}
        payment={payTarget}
      />

      <ReceiptModal
        isOpen={receiptTarget !== null}
        onClose={() => setReceiptTarget(null)}
        receipt={
          receiptTarget
            ? {
                firstName: user?.first_name ?? '',
                lastName: user?.last_name ?? '',
                amount: receiptTarget.amount,
                lateFee: receiptTarget.late_fee_applied,
                total: receiptTarget.total,
              }
            : null
        }
      />
    </PageContainer>
  )
}

function urgencyRank(status: StudentPaymentItem['status']): number {
  if (status === 'overdue') return 0
  if (status === 'rejected') return 1
  return 2 // pending
}
