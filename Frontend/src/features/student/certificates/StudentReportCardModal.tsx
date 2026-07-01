import { useEffect, useRef, useState } from 'react'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Download, Send, Clock } from 'lucide-react'
import { downloadSheetPdf } from '@/lib/downloadSheetPdf'
import { useAuthStore } from '@/stores/authStore'
import { gradeService } from '@/services/gradeService'
import { attendanceService } from '@/services/attendanceService'
import { libretaService } from '@/services/libretaService'
import { ReportCardSheet } from '@/features/shared/certificates/ReportCardSheet'
import type { ReportCardData } from '@/features/shared/certificates/reportCard'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * StudentReportCardModal — Libreta del alumno (descargable con autorización)
 *
 * La 1ra descarga de cada libreta es libre; luego queda limitada y el alumno
 * debe solicitar autorización al admin (que habilita una única descarga).
 * El estado (canDownload/pending) lo computa la página y se pasa por props.
 * ============================================================ */

export interface LibretaItem {
  course_id: string
  course_name: string
  year: number
}

interface StudentReportCardModalProps {
  isOpen: boolean
  onClose: () => void
  libreta: LibretaItem | null
  status: { canDownload: boolean; pending: boolean }
  onChanged: () => void
}

export function StudentReportCardModal({ isOpen, onClose, libreta, status, onChanged }: StudentReportCardModalProps) {
  const user = useAuthStore((s) => s.user)
  const [report, setReport] = useState<ReportCardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [canDownload, setCanDownload] = useState(status.canDownload)
  const [pending, setPending] = useState(status.pending)
  const captureRef = useRef<HTMLDivElement>(null)

  // Sincroniza el estado local cuando cambia la libreta o el estado entrante.
  useEffect(() => {
    setCanDownload(status.canDownload)
    setPending(status.pending)
    setActionError(null)
  }, [status.canDownload, status.pending, libreta])

  useEffect(() => {
    if (!isOpen || !libreta) return
    setReport(null)
    setError(null)
    let active = true
    Promise.all([gradeService.getMine(), attendanceService.getMine()])
      .then(([grades, attendance]) => {
        if (!active) return
        const g1 = grades.grades.find((g) => g.course_id === libreta.course_id && g.year === libreta.year && g.term === 1)
        const g2 = grades.grades.find((g) => g.course_id === libreta.course_id && g.year === libreta.year && g.term === 2)
        const m1 = grades.makeups.find((m) => m.course_name === libreta.course_name && m.year === libreta.year && m.term === 1)?.score ?? null
        const m2 = grades.makeups.find((m) => m.course_name === libreta.course_name && m.year === libreta.year && m.term === 2)?.score ?? null

        let abs1 = 0
        let abs2 = 0
        for (const a of attendance) {
          if (a.course_id !== libreta.course_id || a.status !== 'ausente') continue
          if (Number(a.date.slice(0, 4)) !== libreta.year) continue
          const mo = Number(a.date.slice(5, 7))
          if (mo >= 2 && mo <= 6) abs1 += 1
          else if (mo >= 7 && mo <= 11) abs2 += 1
        }

        setReport({
          studentName: user ? `${user.first_name} ${user.last_name}` : '',
          level: libreta.course_name,
          year: libreta.year,
          term1: { reading: g1?.reading ?? null, writing: g1?.writing ?? null, listening: g1?.listening ?? null, speaking: g1?.speaking ?? null, makeup: m1, absences: abs1 },
          term2: { reading: g2?.reading ?? null, writing: g2?.writing ?? null, listening: g2?.listening ?? null, speaking: g2?.speaking ?? null, makeup: m2, absences: abs2 },
        })
      })
      .catch((err) => active && setError(formatBackendError(err)))
    return () => { active = false }
  }, [isOpen, libreta, user])

  if (!libreta) return null

  async function handleDownload() {
    if (!captureRef.current || !libreta) return
    setBusy(true)
    setActionError(null)
    try {
      // El backend valida la elegibilidad y consume la descarga (1ra libre o autorizada).
      await libretaService.download({ course_id: libreta.course_id, year: libreta.year })
      await downloadSheetPdf(captureRef.current, `Libreta - ${libreta.course_name}.pdf`)
      // Ya consumida: la próxima requiere solicitar autorización.
      setCanDownload(false)
      setPending(false)
      onChanged()
    } catch (err) {
      setActionError(formatBackendError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRequest() {
    if (!libreta) return
    setBusy(true)
    setActionError(null)
    try {
      await libretaService.request({ course_id: libreta.course_id, year: libreta.year })
      setPending(true)
      onChanged()
    } catch (err) {
      setActionError(formatBackendError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader title="Mi Libreta" onClose={onClose} />
      <ModalBody>
        {actionError && (
          <div className="mb-3 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{actionError}</div>
        )}
        {!canDownload && !pending && (
          <div className="mb-3 p-3 rounded-button bg-surface-50 border border-surface-100 text-small text-surface-600">
            Ya descargaste esta libreta. Para volver a descargarla, solicitá autorización al administrador.
          </div>
        )}
        {pending && (
          <div className="mb-3 p-3 rounded-button bg-amber-50 border border-amber-200 text-small text-amber-700">
            Tu solicitud de descarga está pendiente de aprobación del administrador.
          </div>
        )}
        {error ? (
          <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        ) : report ? (
          <div ref={captureRef} className="mx-auto w-full max-w-[640px]">
            <ReportCardSheet data={report} sheetClassName="w-full" />
          </div>
        ) : (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        {canDownload ? (
          <Button variant="danger" onClick={handleDownload} disabled={busy || !report}>
            <Download size={16} /> {busy ? 'Generando…' : 'Descargar libreta'}
          </Button>
        ) : pending ? (
          <Button variant="secondary" disabled>
            <Clock size={16} /> Solicitud pendiente
          </Button>
        ) : (
          <Button variant="danger" onClick={handleRequest} disabled={busy}>
            <Send size={16} /> {busy ? 'Enviando…' : 'Solicitar descarga'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
