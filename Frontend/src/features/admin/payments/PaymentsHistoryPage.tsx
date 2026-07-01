import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { SearchInput } from '@/components/ui/SearchInput'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { StudentPaymentHistoryModal } from './StudentPaymentHistoryModal'
import { RegisterPaymentModal } from './RegisterPaymentModal'
import { AnnulPaymentModal } from './AnnulPaymentModal'
import { CreatePaymentModal } from './CreatePaymentModal'
import { ReceiptModal } from '@/features/shared/payments/ReceiptModal'
import { paymentService, type PaymentListItem, type PaymentMethod } from '@/services/paymentService'
import { statusBadge, periodLabel, typeLabel, formatMoney, formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * PaymentsHistoryPage — Historial de Pagos (conectado al backend)
 *
 * Filtros soportados por el backend: estado, tipo, periodo (mes/anio).
 * ============================================================ */

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'submitted', label: 'En revision' },
  { value: 'approved', label: 'Pagado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'anulado', label: 'Anulado' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'cuota_mensual', label: 'Cuota mensual' },
  { value: 'derecho_inscripcion', label: 'Derecho de inscripción' },
  { value: 'derecho_examen', label: 'Derecho de examen' },
]

const NOW = new Date()

export function PaymentsHistoryPage() {
  const [payments, setPayments] = useState<PaymentListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [usePeriod, setUsePeriod] = useState(false)
  const [month, setMonth] = useState(NOW.getMonth() + 1) // 1-12
  const [year, setYear] = useState(NOW.getFullYear())
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null)
  const [registerTarget, setRegisterTarget] = useState<PaymentListItem | null>(null)
  const [annulTarget, setAnnulTarget] = useState<PaymentListItem | null>(null)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [receiptTarget, setReceiptTarget] = useState<PaymentListItem | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await paymentService.list({
        status: statusFilter,
        type: typeFilter,
        search,
        month: usePeriod ? month : 0,
        year: usePeriod ? year : 0,
        page,
        page_size: PAGE_SIZE,
      })
      setPayments(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(formatBackendError(err))
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, search, usePeriod, month, year, page])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // Debounce del buscador (nombre / DNI).
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  async function handleRegisterPayment(method?: PaymentMethod) {
    if (!registerTarget) return
    await paymentService.approve(registerTarget.id, method)
    setRegisterTarget(null)
    await fetchPayments()
  }

  async function handleAnnulPayment() {
    if (!annulTarget) return
    await paymentService.annul(annulTarget.id)
    setAnnulTarget(null)
    await fetchPayments()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer
      title="Historial de Pagos"
      actions={<Button variant="danger" size="md" onClick={() => setCreateOpen(true)}>+ Crear pago</Button>}
    >
      {/* Filtros */}
      <div className="bg-white rounded-card shadow-card p-4 flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Buscar por alumno o DNI..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="w-full md:max-w-xs"
        />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2.5 rounded-input border border-surface-200 bg-white text-body text-surface-700 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2.5 rounded-input border border-surface-200 bg-white text-body text-surface-700 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="flex items-center gap-2 text-body text-surface-600 select-none">
          <input
            type="checkbox"
            checked={usePeriod}
            onChange={(e) => { setUsePeriod(e.target.checked); setPage(1) }}
            className="w-4 h-4 rounded border-surface-300 text-royal-500 focus:ring-royal-500/30"
          />
          Por periodo
        </label>

        {usePeriod && (
          <MonthYearPicker
            month={month - 1}
            year={year}
            onChange={(m, y) => { setMonth(m + 1); setYear(y); setPage(1) }}
          />
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {/* Tabla */}
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
                  {['Alumno', 'Curso', 'Periodo', 'Tipo', 'Monto', 'Vence', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {payments.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-body text-surface-400">No se encontraron pagos.</td></tr>
                ) : (
                  payments.map((p) => {
                    const badge = statusBadge(p.status)
                    const isOverdue = p.status === 'overdue'
                    const canRegister = p.status === 'pending' || p.status === 'overdue' || p.status === 'rejected'
                    const canAnnul = p.status === 'pending' || p.status === 'overdue' || p.status === 'submitted' || p.status === 'rejected'
                    const actions = [
                      ...(canRegister ? [{ label: 'Registrar pago', onSelect: () => setRegisterTarget(p) }] : []),
                      ...(p.status === 'approved' ? [{ label: 'Descargar recibo', onSelect: () => setReceiptTarget(p) }] : []),
                      { label: 'Ver historial', onSelect: () => setHistoryTarget({ id: p.student_id, name: `${p.first_name} ${p.last_name}` }) },
                      ...(canAnnul ? [{ label: 'Anular', onSelect: () => setAnnulTarget(p), tone: 'danger' as const }] : []),
                    ]
                    return (
                      <tr key={p.id} className={isOverdue ? 'bg-accent-50/40' : 'hover:bg-surface-50/50 transition-colors'}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar initials={`${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`} />
                            <div className="min-w-0">
                              <p className="text-body font-medium text-surface-800 truncate">{p.first_name} {p.last_name}</p>
                              <p className="text-small text-surface-400">DNI {p.dni}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-body text-surface-600">{p.course_name}</td>
                        <td className="px-4 py-4 text-body text-surface-600 whitespace-nowrap">{periodLabel(p.month, p.year)}</td>
                        <td className="px-4 py-4 text-small text-surface-500">{typeLabel(p.type)}</td>
                        <td className="px-4 py-4 text-body font-medium text-surface-800 whitespace-nowrap">{formatMoney(p.total)}</td>
                        <td className="px-4 py-4 text-body text-surface-600 whitespace-nowrap">{formatDateOnly(p.due_date)}</td>
                        <td className="px-4 py-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {p.payment_method && (
                            <div className="mt-1 text-small capitalize text-surface-400">{p.payment_method}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <ActionMenu items={actions} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-4 border-t border-surface-100">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={PAGE_SIZE}
            itemLabel="pagos"
            onPageChange={setPage}
          />
        </div>
      </div>

      <StudentPaymentHistoryModal
        isOpen={historyTarget !== null}
        onClose={() => setHistoryTarget(null)}
        studentId={historyTarget?.id ?? null}
        studentName={historyTarget?.name ?? ''}
      />

      <RegisterPaymentModal
        isOpen={registerTarget !== null}
        onClose={() => setRegisterTarget(null)}
        onConfirm={handleRegisterPayment}
        payment={registerTarget}
      />

      <AnnulPaymentModal
        isOpen={annulTarget !== null}
        onClose={() => setAnnulTarget(null)}
        onConfirm={handleAnnulPayment}
        payment={annulTarget}
      />

      <CreatePaymentModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchPayments}
      />

      <ReceiptModal
        isOpen={receiptTarget !== null}
        onClose={() => setReceiptTarget(null)}
        receipt={
          receiptTarget
            ? {
                firstName: receiptTarget.first_name,
                lastName: receiptTarget.last_name,
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
