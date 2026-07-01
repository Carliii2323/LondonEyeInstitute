import { useEffect, useRef, useState } from 'react'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Download } from 'lucide-react'
import { gradeService } from '@/services/gradeService'
import { attendanceService } from '@/services/attendanceService'
import type { CertificateItem } from '@/services/certificateService'
import { ReportCardSheet } from '@/features/shared/certificates/ReportCardSheet'
import type { ReportCardData } from '@/features/shared/certificates/reportCard'
import { downloadSheetPdf } from '@/lib/downloadSheetPdf'

/* ============================================================
 * CertificatePreviewModal — Certificado + Planilla de Notas (admin)
 *
 * Dos pestañas: Certificado y Planilla (REPORT CARD, generada de las notas
 * + ausencias por término). Imprime la pestaña activa via portal (.print-only).
 * ============================================================ */

const LOGO_SRC = '/london-eye-logo.png'

interface CertData {
  studentName: string
  dni: string
  courseName: string
  avgGrade: number | null
  hours: number | null
  issuedAt: string
}

interface CertificatePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  item: CertificateItem | null
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function longDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} de ${MONTHS[m - 1]} de ${y}`
}

const BLANK = '……………………'

/* Hoja del certificado. `sheetClassName` define el tamaño (preview vs impresión). */
function CertificateSheet({ cert, sheetClassName }: { cert: CertData; sheetClassName: string }) {
  const promedio = cert.avgGrade !== null ? `${cert.avgGrade}%` : `${BLANK}%`
  const horas = cert.hours !== null ? String(cert.hours) : '…………'

  return (
    <div className={`cert-sheet relative flex flex-col overflow-hidden border-[6px] border-royal-400 bg-white ${sheetClassName}`}>
      <img src={LOGO_SRC} alt="" aria-hidden="true" className="c-wm pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain opacity-10" />

      <div className="c-pad relative z-10 flex flex-col">
        {/* Logo en `absolute` (fuera del flujo) y título como bloque centrado
            normal. NO se usa flex acá porque modern-screenshot/domToPng calcula
            mal la altura del contenedor flex al clonar dentro de <foreignObject>
            y el cuerpo se monta sobre el subtítulo. Con un bloque normal la
            altura del encabezado es exactamente la del texto y no hay solape. */}
        <div className="relative">
          <img src={LOGO_SRC} alt="" className="c-logo absolute left-0 top-0 w-auto object-contain" />
          <div className="text-center">
            <p className="c-instituto font-heading font-bold tracking-wide text-surface-900">INSTITUTO</p>
            <p className="c-title font-heading font-bold text-surface-900">“LONDON EYE”</p>
            <p className="c-subtitle c-mt1 font-heading font-bold uppercase tracking-wide text-surface-900 underline underline-offset-4">
              Certificado de Estudios
            </p>
          </div>
        </div>

        <div className="c-body c-mt-body flex flex-col text-center font-semibold text-surface-800">
          <p>Por el presente certificamos que el/la alumno/a</p>
          <p>
            <span className="font-bold text-navy-600">{cert.studentName}</span>{' '}
            DNI <span className="font-bold text-navy-600">{cert.dni}</span> cursó y aprobó satisfactoriamente el curso de
          </p>
          <p>
            “<span className="font-bold text-navy-600">{cert.courseName}</span>” con un promedio de{' '}
            <span className="font-bold text-navy-600">{promedio}</span> y habiendo cumplido{' '}
            <span className="font-bold text-navy-600">{horas}</span> hs presenciales con los requisitos correspondientes para la aprobación del curso.
          </p>
          <p className="c-small font-bold text-surface-700">Mendoza, {longDate(cert.issuedAt)}</p>
        </div>

        <div className="c-sign c-mt-sign flex items-end justify-between">
          <div className="flex-1 text-center">
            <div className="c-line" />
            <p className="c-small c-mt1 font-bold text-surface-700">Profesora</p>
          </div>
          <div className="flex-1 text-center">
            <div className="c-line" />
            <p className="c-small c-mt1 font-bold text-surface-700">Directora</p>
          </div>
        </div>

        <p className="c-tiny c-mt1 text-right italic text-surface-400">Sin validez oficial</p>
      </div>
    </div>
  )
}

/* Arma la planilla (notas + ausencias por término) para el alumno del certificado. */
async function buildReportCard(item: CertificateItem): Promise<ReportCardData> {
  const [grades, annual] = await Promise.all([
    gradeService.getByCourse(item.course_id, item.year, 'admin'),
    attendanceService.getAnnual(item.course_id, item.year),
  ])

  const g1 = grades.grades.find((g) => g.student_id === item.student_id && g.term === 1)
  const g2 = grades.grades.find((g) => g.student_id === item.student_id && g.term === 2)
  const m1 = grades.makeups.find((m) => m.student_id === item.student_id && m.term === 1)?.score ?? null
  const m2 = grades.makeups.find((m) => m.student_id === item.student_id && m.term === 2)?.score ?? null

  let abs1 = 0
  let abs2 = 0
  for (const r of annual) {
    if (r.student_id !== item.student_id || r.status !== 'ausente') continue
    const mo = Number(r.date.slice(5, 7))
    if (mo >= 2 && mo <= 6) abs1 += 1
    else if (mo >= 7 && mo <= 11) abs2 += 1
  }

  return {
    studentName: `${item.first_name} ${item.last_name}`,
    level: item.course_name,
    year: item.year,
    term1: { reading: g1?.reading ?? null, writing: g1?.writing ?? null, listening: g1?.listening ?? null, speaking: g1?.speaking ?? null, makeup: m1, absences: abs1 },
    term2: { reading: g2?.reading ?? null, writing: g2?.writing ?? null, listening: g2?.listening ?? null, speaking: g2?.speaking ?? null, makeup: m2, absences: abs2 },
  }
}

export function CertificatePreviewModal({ isOpen, onClose, item }: CertificatePreviewModalProps) {
  const [tab, setTab] = useState<'certificado' | 'planilla'>('certificado')
  const [report, setReport] = useState<ReportCardData | null>(null)
  const [downloading, setDownloading] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !item) return
    setTab('certificado')
    setReport(null)
    let active = true
    buildReportCard(item).then((data) => active && setReport(data)).catch(() => active && setReport(null))
    return () => { active = false }
  }, [isOpen, item])

  if (!item) return null

  const cert: CertData = {
    studentName: `${item.first_name} ${item.last_name}`,
    dni: item.dni,
    courseName: item.course_name,
    avgGrade: item.avg_grade,
    hours: item.presential_hours,
    issuedAt: item.issued_at,
  }

  const showPlanilla = tab === 'planilla'

  async function handleDownload() {
    if (!captureRef.current) return
    setDownloading(true)
    try {
      const base = showPlanilla ? 'Planilla' : 'Certificado'
      await downloadSheetPdf(captureRef.current, `${base} - ${cert.studentName}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalHeader title="Certificado y Planilla" onClose={onClose} />

        <ModalBody>
          {/* Pestañas */}
          <div className="mb-4 inline-flex rounded-button border border-surface-200 p-1">
            <TabButton active={tab === 'certificado'} onClick={() => setTab('certificado')}>Certificado</TabButton>
            <TabButton active={tab === 'planilla'} onClick={() => setTab('planilla')}>Planilla de Notas</TabButton>
          </div>

          <div ref={captureRef} className={cn('mx-auto w-full', showPlanilla ? 'max-w-[640px]' : 'max-w-[600px]')}>
            {showPlanilla ? (
              report ? (
                <ReportCardSheet data={report} sheetClassName="w-full" />
              ) : (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )
            ) : (
              <CertificateSheet cert={cert} sheetClassName="w-full" />
            )}
          </div>
        </ModalBody>

        <ModalFooter className="justify-end">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button variant="danger" onClick={handleDownload} disabled={downloading || (showPlanilla && !report)}>
            <Download size={16} /> {downloading ? 'Generando…' : `Descargar ${showPlanilla ? 'planilla' : 'certificado'} (PDF)`}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-button text-small font-medium transition-colors',
        active ? 'bg-royal-500 text-white' : 'text-surface-600 hover:text-surface-800',
      )}
    >
      {children}
    </button>
  )
}
