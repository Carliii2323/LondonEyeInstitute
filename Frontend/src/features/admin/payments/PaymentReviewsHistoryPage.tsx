import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { paymentService, type ReviewedPaymentItem } from '@/services/paymentService'
import { statusBadge, periodLabel, typeLabel, formatMoney, formatDateTime } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * PaymentReviewsHistoryPage — Historial de Revisiones (admin)
 *
 * Pagos que el admin revisó/registró (reviewed_at), filtrables por mes de la
 * revisión. Muestra de quién viene (alumno), no quién revisó (siempre el admin).
 * ============================================================ */

const NOW = new Date()

export function PaymentReviewsHistoryPage() {
  const [items, setItems] = useState<ReviewedPaymentItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allMonths, setAllMonths] = useState(false)
  const [month, setMonth] = useState(NOW.getMonth() + 1)
  const [year, setYear] = useState(NOW.getFullYear())

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await paymentService.listReviews(allMonths ? 0 : year, allMonths ? 0 : month))
    } catch (err) {
      setError(formatBackendError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [allMonths, month, year])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  return (
    <PageContainer title="Historial de Revisiones">
      <div className="bg-white rounded-card shadow-card p-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-body text-surface-600 select-none">
          <input
            type="checkbox"
            checked={allMonths}
            onChange={(e) => setAllMonths(e.target.checked)}
            className="w-4 h-4 rounded border-surface-300 text-royal-500 focus:ring-royal-500/30"
          />
          Todos los meses
        </label>
        {!allMonths && (
          <MonthYearPicker month={month - 1} year={year} onChange={(m, y) => { setMonth(m + 1); setYear(y) }} />
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="mt-4 bg-white rounded-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50/50 border-b border-surface-100">
                  {['Alumno', 'Curso', 'Periodo', 'Tipo', 'Monto', 'Estado', 'Medio', 'Revisado'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-body text-surface-400">No hay revisiones en este período.</td></tr>
                ) : (
                  items.map((r) => {
                    const badge = statusBadge(r.status)
                    return (
                      <tr key={r.id} className="hover:bg-surface-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar initials={`${r.student_name[0] ?? ''}`} />
                            <div className="min-w-0">
                              <p className="text-body font-medium text-surface-800 truncate">{r.student_name}</p>
                              <p className="text-small text-surface-400">DNI {r.dni}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-body text-surface-600">{r.course_name}</td>
                        <td className="px-4 py-4 text-body text-surface-600 whitespace-nowrap">{periodLabel(r.month, r.year)}</td>
                        <td className="px-4 py-4 text-small text-surface-500">{typeLabel(r.type)}</td>
                        <td className="px-4 py-4 text-body font-medium text-surface-800 whitespace-nowrap">{formatMoney(r.total)}</td>
                        <td className="px-4 py-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {r.rejection_reason && (
                            <div className="mt-1 text-small italic text-accent-600">{r.rejection_reason}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-small capitalize text-surface-500">{r.payment_method ?? '—'}</td>
                        <td className="px-4 py-4 text-body text-surface-600 whitespace-nowrap">{formatDateTime(r.reviewed_at)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
