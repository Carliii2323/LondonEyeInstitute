import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/* ============================================================
 * downloadSheetPdf — Descarga un nodo HTML como PDF A4 apaisado.
 *
 * Captura el nodo con html2canvas (NO usa <foreignObject> de SVG: rinde el
 * DOM a canvas con su propio motor, por lo que el resultado es idéntico en
 * Edge, Chrome y Firefox). Antes se usaba modern-screenshot, pero su captura
 * vía foreignObject la dibujaba distinta cada navegador (Firefox rompía el
 * encabezado del certificado). El canvas se centra en una hoja A4 landscape
 * de tamaño fijo. Salida determinística, sin diálogo de impresión.
 *
 * NOTA: html2canvas no soporta container queries (cqw); por eso tanto el
 * certificado (.cert-sheet) como la planilla (.rc-sheet) usan px FIJOS,
 * calibrados al ancho real del nodo que se captura.
 * ============================================================ */

/* DIAGNÓSTICO TEMPORAL: si está en true, además del PDF se descarga el PNG
   crudo de la captura. Sirve para ver si el problema está en la captura
   (PNG ya roto) o en jsPDF (PNG bien, PDF mal). Apagar (false) al confirmar. */
const DEBUG_PNG = false

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

interface DownloadOptions {
  /** Orientación de la hoja A4. Default 'landscape' (certificado/planilla). */
  orientation?: 'portrait' | 'landscape'
  /** Cap del ancho de la imagen en la hoja (mm). Para documentos chicos (recibo)
      que no deben ocupar toda la página. Si se omite, ocupa el ancho disponible. */
  maxWidthMm?: number
}

export async function downloadSheetPdf(node: HTMLElement, filename: string, opts: DownloadOptions = {}): Promise<void> {
  // Esperar a que las fuentes web terminen de cargar. Si no, el DOM se captura
  // con una fuente de respaldo (otras métricas) y el título se superpone.
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
      // Un frame extra para que el layout reflowee con la fuente ya aplicada.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    } catch {
      /* noop */
    }
  }

  // html2canvas rasteriza el nodo con su propio renderer (consistente entre
  // navegadores). scale 3 = alta resolución; useCORS para el logo (mismo origen).
  const canvas = await html2canvas(node, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })
  const dataUrl = canvas.toDataURL('image/png')

  if (DEBUG_PNG) {
    triggerDownload(dataUrl, filename.replace(/\.pdf$/i, '') + ' (captura).png')
  }

  const pdf = new jsPDF({ orientation: opts.orientation ?? 'landscape', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 6
  let maxW = pageW - margin * 2
  const maxH = pageH - margin * 2
  if (opts.maxWidthMm && opts.maxWidthMm < maxW) {
    maxW = opts.maxWidthMm
  }

  const ratio = canvas.width / canvas.height
  let w = maxW
  let h = w / ratio
  if (h > maxH) {
    h = maxH
    w = h * ratio
  }
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2

  pdf.addImage(dataUrl, 'PNG', x, y, w, h)
  pdf.save(filename)
}
