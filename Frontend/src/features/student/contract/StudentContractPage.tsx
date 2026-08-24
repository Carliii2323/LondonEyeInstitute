import { useRef, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Download, FileSignature } from 'lucide-react'
import { downloadPaginatedPdf } from '@/lib/downloadSheetPdf'
import { useAuthStore } from '@/stores/authStore'
import { ContractSheet } from './ContractSheet'

/* ============================================================
 * StudentContractPage — Contrato de Prestación de Servicios Educativos
 *
 * El alumno descarga la plantilla del contrato (en blanco) en PDF para
 * completarla y presentarla firmada en el instituto. El PDF se pagina en
 * hojas A4 cortando solo entre cláusulas (ver downloadPaginatedPdf).
 * ============================================================ */

export function StudentContractPage() {
  const user = useAuthStore((s) => s.user)
  const [busy, setBusy] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  async function handleDownload() {
    if (!captureRef.current) return
    setBusy(true)
    try {
      const name = user ? `${user.first_name} ${user.last_name}` : 'alumno'
      await downloadPaginatedPdf(captureRef.current, `Contrato - ${name}.pdf`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageContainer title="Contrato">
      <div className="mb-6 flex flex-col gap-3 rounded-card border border-surface-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <FileSignature size={16} className="mt-0.5 flex-shrink-0 text-surface-400" />
          <span className="text-small text-surface-600">
            Descargá el contrato, imprimilo y presentalo completo y firmado en el instituto. Los datos, aranceles,
            autorizaciones y firmas se completan a mano.
          </span>
        </div>
        <Button variant="danger" size="md" onClick={handleDownload} disabled={busy} className="w-full flex-shrink-0 sm:w-auto">
          <Download size={16} /> {busy ? 'Generando…' : 'Descargar contrato (PDF)'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-surface-100 bg-surface-50 p-4">
        <div ref={captureRef} className="mx-auto w-full max-w-[760px] bg-white shadow-card">
          <ContractSheet sheetClassName="w-full" />
        </div>
      </div>
    </PageContainer>
  )
}
