import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { RejectReceiptModal } from './RejectReceiptModal'
import { InboundReceiptsCard } from './InboundReceiptsCard'
import { paymentService, type PaymentListItem } from '@/services/paymentService'
import { periodLabel, typeLabel, formatMoney, formatDateTime } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'
import { Clock, FileText, ImageIcon } from 'lucide-react'

/* ============================================================
 * PaymentReviewPage — Revision de Comprobantes (conectado al backend)
 *
 * Lista los comprobantes en estado 'submitted' (GET /admin/payments/pending).
 * El admin los ve, aprueba (PATCH approve) o rechaza (PATCH reject).
 * ============================================================ */

interface RejectTarget {
  id: string
  studentName: string
  course: string
  amount: string
  sentDate: string
}

export function PaymentReviewPage() {
  const [pending, setPending] = useState<PaymentListItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPending(await paymentService.listPending())
    } catch (err) {
      setError(formatBackendError(err))
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleApprove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await paymentService.approve(id)
      await fetchPending()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return
    await paymentService.reject(rejectTarget.id, reason)
    setRejectTarget(null)
    await fetchPending()
  }

  return (
    <PageContainer title="Revision de Comprobantes">
      {error && (
        <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {/* Bandeja de comprobantes que llegaron por mail (card aparte). */}
      <InboundReceiptsCard onChanged={fetchPending} />

      <section className="mt-4 bg-white rounded-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <h2 className="font-heading text-section-title text-surface-900">Comprobantes Pendientes de Revision</h2>
            <p className="text-small text-surface-500 mt-1">Revisalos y aprobalos o rechazalos.</p>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-badge bg-amber-50 text-small font-semibold text-amber-700">
            <Clock size={14} /> En revision: {pending.length}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="py-16 text-center text-body text-surface-400">No hay comprobantes pendientes de revision.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-surface-100 bg-surface-50/50">
                  {['Alumno', 'Curso', 'Periodo', 'Monto', 'Enviado', 'Comprobante', 'Acciones'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {pending.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={`${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`} />
                        <div className="min-w-0">
                          <p className="text-body font-semibold text-surface-800 truncate">{p.first_name} {p.last_name}</p>
                          <p className="text-small text-surface-400">DNI {p.dni}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-body text-surface-600">{p.course_name}</td>
                    <td className="px-5 py-4 text-body text-surface-600 whitespace-nowrap">
                      {periodLabel(p.month, p.year)}
                      <span className="block text-small text-surface-400">{typeLabel(p.type)}</span>
                    </td>
                    <td className="px-5 py-4 text-body font-bold text-surface-800 whitespace-nowrap">{formatMoney(p.total)}</td>
                    <td className="px-5 py-4 text-body text-surface-600 whitespace-nowrap">
                      {p.receipt_uploaded_at ? formatDateTime(p.receipt_uploaded_at) : '--'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => paymentService.openReceipt(p.id)}
                        className="flex items-center gap-2 text-small font-medium text-royal-500 hover:text-royal-600 transition-colors"
                      >
                        <ReceiptIcon url={p.receipt_url} /> Ver comprobante
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={busyId === p.id}
                          onClick={() => handleApprove(p.id)}
                        >
                          Aprobar
                        </Button>
                        <button
                          onClick={() => setRejectTarget({
                            id: p.id,
                            studentName: `${p.first_name} ${p.last_name}`,
                            course: p.course_name,
                            amount: formatMoney(p.total),
                            sentDate: p.receipt_uploaded_at ? formatDateTime(p.receipt_uploaded_at) : '--',
                          })}
                          disabled={busyId === p.id}
                          className="text-small font-medium text-accent-500 hover:text-accent-600 transition-colors disabled:opacity-40"
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RejectReceiptModal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        studentName={rejectTarget?.studentName ?? ''}
        course={rejectTarget?.course ?? ''}
        amount={rejectTarget?.amount ?? ''}
        sentDate={rejectTarget?.sentDate ?? ''}
      />
    </PageContainer>
  )
}

function ReceiptIcon({ url }: { url?: string }) {
  const isPdf = (url ?? '').toLowerCase().endsWith('.pdf')
  return isPdf ? <FileText size={16} /> : <ImageIcon size={16} />
}
