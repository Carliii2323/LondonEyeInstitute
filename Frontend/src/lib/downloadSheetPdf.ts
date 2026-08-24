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

/* En pantallas angostas (celular) el nodo capturado queda más angosto que el
 * ancho para el que su contenido está calibrado (los sheets usan px FIJOS), y la
 * captura sale cortada. Forzamos temporalmente el ancho del nodo a su max-width
 * durante la captura y lo restauramos después. En desktop el nodo ya está en su
 * max-width, así que `forced` es false y no cambia nada. */
async function withFixedWidth<T>(node: HTMLElement, fn: () => Promise<T>): Promise<T> {
  const maxW = parseFloat(getComputedStyle(node).maxWidth) // px; NaN si es 'none'
  const forced = !Number.isNaN(maxW) && maxW > node.offsetWidth + 1
  const prev = { width: node.style.width, minWidth: node.style.minWidth, maxWidth: node.style.maxWidth }
  if (forced) {
    node.style.width = `${maxW}px`
    node.style.minWidth = `${maxW}px`
    node.style.maxWidth = `${maxW}px`
    // Un frame para que el layout reflowee al ancho forzado antes de capturar.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }
  try {
    return await fn()
  } finally {
    if (forced) {
      node.style.width = prev.width
      node.style.minWidth = prev.minWidth
      node.style.maxWidth = prev.maxWidth
    }
  }
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
  // withFixedWidth evita la captura cortada en celular (ver arriba).
  const canvas = await withFixedWidth(node, () =>
    html2canvas(node, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false }),
  )
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

/* ============================================================
 * downloadDocumentPdf — Documento largo (varias páginas) en A4 vertical.
 *
 * Para documentos de texto que superan una hoja (ej. contrato pedagógico).
 * Captura el nodo completo con html2canvas y "fluye" la imagen a lo largo de
 * varias páginas A4 (recorte por altura de página). Ocupa todo el ancho.
 * ============================================================ */
export async function downloadDocumentPdf(node: HTMLElement, filename: string): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    } catch {
      /* noop */
    }
  }

  const canvas = await withFixedWidth(node, () =>
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false }),
  )
  const dataUrl = canvas.toDataURL('image/png')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  let heightLeft = imgH
  let position = 0

  pdf.addImage(dataUrl, 'PNG', 0, position, imgW, imgH)
  heightLeft -= pageH

  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(dataUrl, 'PNG', 0, position, imgW, imgH)
    heightLeft -= pageH
  }

  pdf.save(filename)
}

/* ============================================================
 * downloadPaginatedPdf — Documento largo A4 vertical SIN cortar líneas.
 *
 * A diferencia de downloadDocumentPdf (que rebana la imagen a ciegas cada
 * 297 mm y puede partir un párrafo por la mitad), esta versión corta cada
 * página SOLO en los límites de bloque marcados con [data-block] en el DOM
 * (encabezado, cláusulas, anexos, firmas). Rebana el canvas capturado en
 * trozos que caben en una hoja A4 y coloca cada trozo con márgenes superior
 * e inferior. Resultado: ninguna cláusula queda cortada entre páginas.
 * ============================================================ */
export async function downloadPaginatedPdf(
  node: HTMLElement,
  filename: string,
  blockSelector = '[data-block]',
): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    } catch {
      /* noop */
    }
  }

  const scale = 2
  // Captura + medición de bloques, ambas con el ancho forzado (ver withFixedWidth):
  // en celular, medir los bloques con el nodo angosto no coincidiría con el canvas.
  const { canvas, bounds } = await withFixedWidth(node, async () => {
    const canvas = await html2canvas(node, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false })
    // Ys (en px del canvas) donde se permite cortar: el borde superior de cada
    // bloque, más el fondo total. Se calculan relativos al nodo capturado.
    const nodeTop = node.getBoundingClientRect().top
    const bounds = Array.from(node.querySelectorAll<HTMLElement>(blockSelector)).map(
      (b) => (b.getBoundingClientRect().top - nodeTop) * scale,
    )
    bounds.push(canvas.height)
    return { canvas, bounds }
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWmm = pdf.internal.pageSize.getWidth()
  const pageHmm = pdf.internal.pageSize.getHeight()
  const marginMm = 8
  const usableHmm = pageHmm - marginMm * 2
  const pxPerMm = canvas.width / pageWmm
  const pageHpx = usableHmm * pxPerMm

  let start = 0
  let i = 0
  let first = true
  while (start < canvas.height - 1) {
    // Avanzar hasta el último límite que todavía entra en una hoja.
    let end = start
    for (; i < bounds.length; i++) {
      const b = bounds[i]
      if (b === undefined) break
      if (b - start <= pageHpx) {
        end = b
      } else {
        break
      }
    }
    // Bloque más alto que una hoja (no debería pasar): corte forzado.
    if (end <= start) end = Math.min(start + pageHpx, canvas.height)

    const sliceH = end - start
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceH
    const ctx = slice.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, start, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    }

    const imgH = sliceH / pxPerMm
    if (!first) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, marginMm, pageWmm, imgH)
    first = false
    start = end
  }

  pdf.save(filename)
}
