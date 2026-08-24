import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  inboundService,
  type InboundReceiptItem,
  type InboundSuggestion,
} from '@/services/inboundService'
import { studentService } from '@/services/studentService'
import { formatMoney } from '@/lib/paymentFormat'
import { relativeTime } from '@/lib/relativeTime'
import { formatBackendError } from '@/lib/formatBackendError'
import { Mail, FileText, ImageIcon, ChevronDown, Search, X, RefreshCw } from 'lucide-react'

/* ============================================================
 * InboundReceiptsCard — Comprobantes recibidos por mail
 *
 * Card dentro de Revision de pagos. Lista los entrantes sin resolver,
 * sugiere alumno (por remitente/DNI) y cuota (por monto), y permite
 * vincular (envia a revision) o vincular y aprobar. Los sin identificar
 * se resuelven buscando el alumno a mano, o se descartan.
 * ============================================================ */

const METHODS = [
  { value: '', label: 'Sin especificar' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
]

interface Props {
  onChanged: () => void
}

export function InboundReceiptsCard({ onChanged }: Props) {
  const [items, setItems] = useState<InboundReceiptItem[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [pollMsg, setPollMsg] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await inboundService.list()
      setItems(all.filter((r) => r.status === 'sin_identificar' || r.status === 'identificado'))
    } catch (err) {
      setError(formatBackendError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  async function handleResolved() {
    setExpandedId(null)
    await fetchList()
    onChanged()
  }

  async function handlePoll() {
    setPolling(true)
    setPollMsg(null)
    try {
      const r = await inboundService.pollNow()
      const n = r?.result?.processed ?? 0
      setPollMsg(n > 0 ? `Llegaron ${n} comprobante(s) nuevo(s).` : 'Sin correos nuevos por ahora.')
      await fetchList()
    } catch (err) {
      setPollMsg(formatBackendError(err))
    } finally {
      setPolling(false)
    }
  }

  return (
    <section className="mt-4 bg-white rounded-card shadow-card overflow-hidden border-l-4 border-royal-400">
      <div className="flex items-center justify-between gap-3 p-5 pb-4 flex-wrap">
        <div>
          <h2 className="font-heading text-section-title text-surface-900">Comprobantes por Mail</h2>
          <p className="text-small text-surface-500 mt-1">Llegan por correo. El sistema revisa la casilla cada pocos minutos.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-badge bg-royal-50 text-small font-semibold text-royal-700">
            <Mail size={14} /> Sin resolver: {items.length}
          </span>
          <Button variant="secondary" size="sm" isLoading={polling} onClick={handlePoll}>
            <RefreshCw size={14} className="mr-1.5" /> Revisar correo ahora
          </Button>
        </div>
      </div>

      {pollMsg && (
        <div className="mx-5 mb-3 text-small text-surface-500">{pollMsg}</div>
      )}
      {error && (
        <div className="mx-5 mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {isLoading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="border-t border-surface-100 py-10 text-center text-body text-surface-400">
          No hay comprobantes por mail sin resolver.
        </div>
      ) : (
        <div className="border-t border-surface-100 divide-y divide-surface-100">
          {items.map((r) => (
            <InboundRow
              key={r.id}
              receipt={r}
              expanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              onResolved={handleResolved}
              onError={setError}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ---- Fila con panel de resolucion ---- */

function InboundRow({
  receipt,
  expanded,
  onToggle,
  onResolved,
  onError,
}: {
  receipt: InboundReceiptItem
  expanded: boolean
  onToggle: () => void
  onResolved: () => void
  onError: (msg: string) => void
}) {
  const [sugg, setSugg] = useState<InboundSuggestion | null>(null)
  const [suggLoading, setSuggLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState('')
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)

  // Busqueda manual de alumno (caso sin identificar, o para corregir la sugerencia)
  const [manualMode, setManualMode] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: string; name: string }[]>([])

  const loadCandidates = useCallback(async (studentId?: string) => {
    setSuggLoading(true)
    try {
      const s = await inboundService.candidates(receipt.id, studentId)
      setSugg(s)
      const match = s.payments.find((p) => p.matches_amount)
      setSelectedPayment(match ? match.id : s.payments[0]?.id ?? '')
    } catch (err) {
      onError(formatBackendError(err))
    } finally {
      setSuggLoading(false)
    }
  }, [receipt.id, onError])

  useEffect(() => {
    if (expanded && !sugg) loadCandidates()
  }, [expanded, sugg, loadCandidates])

  async function runSearch() {
    if (search.trim().length < 2) return
    try {
      const res = await studentService.list({ search: search.trim(), status: 'active', page_size: 8 })
      setResults(res.data.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name} (${s.dni})` })))
    } catch (err) {
      onError(formatBackendError(err))
    }
  }

  async function link(approve: boolean) {
    if (!selectedPayment) return
    setBusy(true)
    try {
      await inboundService.link(receipt.id, { payment_id: selectedPayment, approve, method: approve ? method : undefined })
      onResolved()
    } catch (err) {
      onError(formatBackendError(err))
    } finally {
      setBusy(false)
    }
  }

  async function discard() {
    setBusy(true)
    try {
      await inboundService.discard(receipt.id)
      onResolved()
    } catch (err) {
      onError(formatBackendError(err))
    } finally {
      setBusy(false)
    }
  }

  const identified = receipt.status === 'identificado'

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Mail size={15} className="text-surface-400 flex-shrink-0" />
            <span className="text-body font-semibold text-surface-800 break-all">{receipt.from_email}</span>
            {identified
              ? <Badge variant="success">{receipt.student_name || 'Identificado'}</Badge>
              : <Badge variant="warning">Sin identificar</Badge>}
            <span className="text-small text-surface-400">{relativeTime(receipt.received_at)}</span>
          </div>
          {receipt.subject && <p className="text-small text-surface-600 mt-1 truncate">{receipt.subject}</p>}
          {receipt.body_excerpt && <p className="text-small text-surface-400 mt-0.5 line-clamp-2">{receipt.body_excerpt}</p>}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {receipt.detected_dni && <span className="text-small text-surface-500">DNI detectado: <strong>{receipt.detected_dni}</strong></span>}
            {receipt.detected_amount && <span className="text-small text-surface-500">Monto: <strong>{formatMoney(receipt.detected_amount)}</strong></span>}
            <button
              onClick={() => inboundService.openAttachment(receipt.id)}
              className="flex items-center gap-1.5 text-small font-medium text-royal-500 hover:text-royal-600"
            >
              <AttachIcon name={receipt.attachment_filename} /> Ver adjunto
            </button>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="flex-shrink-0 flex items-center gap-1 text-small font-semibold text-royal-600 hover:text-royal-700"
        >
          Resolver <ChevronDown size={15} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 rounded-button border border-surface-200 bg-surface-50/50 p-4">
          {suggLoading ? (
            <div className="py-4 flex justify-center">
              <div className="w-5 h-5 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {manualMode ? (
                <ManualSearch
                  search={search}
                  setSearch={setSearch}
                  results={results}
                  onSearch={runSearch}
                  onPick={(id) => { setResults([]); setSearch(''); setManualMode(false); loadCandidates(id) }}
                  onCancel={sugg?.suggested_student_id ? () => setManualMode(false) : undefined}
                />
              ) : sugg?.suggested_student_id ? (
                <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-small text-surface-600">
                    Alumno sugerido: <strong className="text-surface-800">{sugg.suggested_student_name}</strong>
                    <span className="ml-2 text-surface-400">
                      ({sugg.match_source === 'email' ? 'por remitente' : sugg.match_source === 'dni' ? 'por DNI' : 'elegido a mano'})
                    </span>
                  </p>
                  <button onClick={() => setManualMode(true)} className="text-small font-medium text-royal-600 hover:text-royal-700">
                    Buscar otro alumno
                  </button>
                </div>
              ) : (
                <ManualSearch
                  search={search}
                  setSearch={setSearch}
                  results={results}
                  onSearch={runSearch}
                  onPick={(id) => { setResults([]); setSearch(''); loadCandidates(id) }}
                />
              )}

              {!manualMode && sugg?.suggested_student_id && (
                sugg.payments.length === 0 ? (
                  <p className="text-small text-surface-400 italic mb-3">Este alumno no tiene cuotas pendientes para vincular.</p>
                ) : (
                  <div className="flex flex-col gap-2 mb-4">
                    {sugg.payments.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 p-2.5 rounded-button border cursor-pointer transition-colors ${
                          selectedPayment === p.id ? 'border-royal-400 bg-royal-50/60' : 'border-surface-200 hover:border-surface-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`pay-${receipt.id}`}
                          checked={selectedPayment === p.id}
                          onChange={() => setSelectedPayment(p.id)}
                          className="accent-royal-500"
                        />
                        <span className="flex-1 text-small text-surface-700">{p.label}</span>
                        <span className="text-small font-bold text-surface-800">{formatMoney(p.total)}</span>
                        {p.matches_amount && <Badge variant="success">Coincide</Badge>}
                      </label>
                    ))}
                  </div>
                )
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {!manualMode && sugg?.suggested_student_id && sugg.payments.length > 0 && (
                  <>
                    <Button variant="secondary" size="sm" isLoading={busy} disabled={!selectedPayment} onClick={() => link(false)}>
                      Vincular
                    </Button>
                    <div className="flex items-center gap-2">
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="px-2.5 py-1.5 rounded-button border border-surface-200 bg-white text-small text-surface-700"
                        aria-label="Medio de pago"
                      >
                        {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <Button variant="primary" size="sm" isLoading={busy} disabled={!selectedPayment} onClick={() => link(true)}>
                        Vincular y aprobar
                      </Button>
                    </div>
                  </>
                )}
                <button
                  onClick={discard}
                  disabled={busy}
                  className="ml-auto flex items-center gap-1.5 text-small font-medium text-accent-500 hover:text-accent-600 disabled:opacity-40"
                >
                  <X size={14} /> Descartar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ManualSearch({
  search,
  setSearch,
  results,
  onSearch,
  onPick,
  onCancel,
}: {
  search: string
  setSearch: (v: string) => void
  results: { id: string; name: string }[]
  onSearch: () => void
  onPick: (id: string) => void
  onCancel?: () => void
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-small text-surface-600">{onCancel ? 'Elegí el alumno correcto:' : 'No pudimos sugerir un alumno. Buscalo a mano:'}</p>
        {onCancel && (
          <button onClick={onCancel} className="text-small text-surface-500 hover:text-surface-700">Cancelar</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Nombre o DNI..."
            className="w-full pl-9 pr-3 py-2 rounded-button border border-surface-200 bg-white text-small text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={onSearch}>Buscar</Button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {results.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className="text-left px-3 py-2 rounded-button text-small text-surface-700 hover:bg-royal-50/60 border border-surface-100"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AttachIcon({ name }: { name: string }) {
  return name.toLowerCase().endsWith('.pdf') ? <FileText size={15} /> : <ImageIcon size={15} />
}
