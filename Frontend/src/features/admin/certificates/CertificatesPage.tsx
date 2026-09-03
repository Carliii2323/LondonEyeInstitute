import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Avatar } from '@/components/ui/Avatar'
import { IssueCertificateModal } from './IssueCertificateModal'
import { CertificatePreviewModal } from './CertificatePreviewModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Trash2 } from 'lucide-react'
import { certificateService, type CertificateItem } from '@/services/certificateService'
import { libretaService, type AdminLibretaRequest } from '@/services/libretaService'
import { courseService } from '@/services/courseService'
import { formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * CertificatesPage — Certificados emitidos (admin)
 * ============================================================ */

export function CertificatesPage() {
  const [items, setItems] = useState<CertificateItem[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isIssueOpen, setIssueOpen] = useState(false)
  const [previewCert, setPreviewCert] = useState<CertificateItem | null>(null)
  const [requests, setRequests] = useState<AdminLibretaRequest[]>([])
  const [reqBusy, setReqBusy] = useState<string | null>(null)
  // Certificado a eliminar (borrado fisico, con advertencia).
  const [deleteTarget, setDeleteTarget] = useState<CertificateItem | null>(null)
  const [isDeleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await certificateService.remove(deleteTarget.id)
      setDeleteTarget(null)
      await fetchList()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setDeleting(false)
    }
  }

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await certificateService.list())
    } catch (err) {
      setError(formatBackendError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    try {
      setRequests(await libretaService.listPending())
    } catch {
      setRequests([])
    }
  }, [])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function reviewRequest(id: string, approve: boolean) {
    setReqBusy(id)
    setError(null)
    try {
      if (approve) await libretaService.approve(id)
      else await libretaService.reject(id)
      await fetchRequests()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setReqBusy(null)
    }
  }

  useEffect(() => {
    courseService
      .list({ status: 'activo', page_size: 100 })
      .then((res) => setCourses(res.data.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
  }, [])

  const filtered = search
    ? items.filter((c) =>
        `${c.first_name} ${c.last_name} ${c.dni} ${c.course_name}`.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <PageContainer
      title="Certificados"
      actions={<Button variant="danger" size="md" onClick={() => setIssueOpen(true)}>+ Emitir Certificado</Button>}
    >
      <div className="bg-white rounded-card shadow-card p-4">
        <SearchInput
          placeholder="Buscar por alumno, DNI o curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="max-w-md"
        />
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="mt-4 bg-white rounded-card shadow-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-section-title text-surface-900">Solicitudes de libreta</h2>
          {requests.length > 0 && (
            <Badge variant="warning">{requests.length} pendiente{requests.length > 1 ? 's' : ''}</Badge>
          )}
        </div>
        {requests.length === 0 ? (
          <p className="mt-3 text-small text-surface-400">No hay solicitudes de descarga pendientes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-surface-100">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-body font-medium text-surface-800 truncate">{r.student_name}</p>
                  <p className="text-small text-surface-500">{r.course_name} · Ciclo {r.year} · {formatDateOnly(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => reviewRequest(r.id, false)} disabled={reqBusy === r.id}>Rechazar</Button>
                  <Button variant="danger" size="sm" onClick={() => reviewRequest(r.id, true)} disabled={reqBusy === r.id}>Aprobar</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
                  {['Alumno', 'Curso', 'Año', 'Promedio', 'Horas', 'Emitido', 'Acciones'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-body text-surface-400">No hay certificados emitidos.</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={`${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`} />
                          <div className="min-w-0">
                            <p className="text-body font-medium text-surface-800 truncate">{c.first_name} {c.last_name}</p>
                            <p className="text-small text-surface-400">DNI {c.dni}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-body text-surface-600">{c.course_name}</td>
                      <td className="px-5 py-4 text-body text-surface-600">{c.year}</td>
                      <td className="px-5 py-4 text-body text-surface-700">{c.avg_grade !== null ? `${c.avg_grade}%` : '—'}</td>
                      <td className="px-5 py-4 text-body text-surface-700">{c.presential_hours ?? '—'}</td>
                      <td className="px-5 py-4 text-body text-surface-600 whitespace-nowrap">{formatDateOnly(c.issued_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPreviewCert(c)}
                            className="text-small font-medium text-royal-500 hover:text-royal-600 transition-colors whitespace-nowrap"
                          >
                            Ver / Imprimir
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            aria-label={`Eliminar certificado de ${c.first_name} ${c.last_name}`}
                            className="text-small font-medium text-accent-500 hover:text-accent-600 transition-colors whitespace-nowrap"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <IssueCertificateModal
        isOpen={isIssueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={fetchList}
        courses={courses}
      />

      <CertificatePreviewModal
        isOpen={previewCert !== null}
        onClose={() => setPreviewCert(null)}
        item={previewCert}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar certificado"
        description={`Vas a eliminar el certificado de ${deleteTarget?.first_name ?? ''} ${deleteTarget?.last_name ?? ''} (${deleteTarget?.course_name ?? ''} ${deleteTarget?.year ?? ''}).`}
        warning="Se borra definitivamente: no se puede deshacer. Si el alumno lo necesita habra que volver a emitirlo."
        confirmLabel="Eliminar"
        confirmVariant="danger"
        icon={<Trash2 size={22} />}
        isLoading={isDeleting}
      />
    </PageContainer>
  )
}
