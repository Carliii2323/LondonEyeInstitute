import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import writeXlsxFile from 'write-excel-file/browser'
import type { Cell, Row, SheetData } from 'write-excel-file/browser'

/* ============================================================
 * exportTable — Exportacion reusable de tablas a PDF y Excel (B34)
 *
 * Una sola fuente de datos (head + body) sirve para ambos formatos:
 *   - PDF:  jsPDF + jspdf-autotable (tablas reales, texto seleccionable,
 *           paginado automatico; NO es una captura de pantalla).
 *   - XLSX: write-excel-file (build de browser: genera el .xlsx y dispara
 *           la descarga; celdas con tipo real -> numeros como numeros).
 *
 * Los documentos (certificado, recibo, contrato, libreta) siguen usando
 * downloadSheetPdf; esto es para las TABLAS (alumnos, asistencia, notas).
 * ============================================================ */

/** Valor de una celda. `null`/`undefined`/'' quedan como celda vacia. */
export type ExportCell = string | number | null | undefined

export interface TableExport {
  /** Titulo del documento (encabezado del PDF, hoja del Excel). */
  title: string
  /** Subtitulo opcional (ej. "Curso X - Ciclo 2026"). */
  subtitle?: string
  /** Encabezados de columna. */
  head: string[]
  /** Filas; cada fila con la misma cantidad de celdas que `head`. */
  body: ExportCell[][]
  /** Nombre base del archivo, sin extension. Default: slug del `title`. */
  filename?: string
  /** Ancho de columnas del Excel (en caracteres), opcional. */
  columnWidths?: number[]
}

function cellToText(v: ExportCell): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function cellToXlsx(v: ExportCell): Cell {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return { type: Number, value: v }
  return { type: String, value: String(v) }
}

/** Slug simple para el nombre de archivo (sin acentos ni espacios). */
function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca los diacriticos (acentos, enie)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Fecha YYYY-MM-DD para estampar el nombre del archivo. */
function dateStamp(): string {
  return new Date().toLocaleDateString('en-CA') // en-CA => 2026-08-23
}

/** Nombre de hoja de Excel valido: sin caracteres prohibidos, max 31. */
function sheetName(s: string): string {
  return s.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja1'
}

/**
 * Exporta una tabla a PDF (A4). Usa 'landscape' para tablas anchas
 * (muchas columnas, como la planilla de notas).
 */
export function exportTableToPdf(t: TableExport, orientation: 'portrait' | 'landscape' = 'portrait'): void {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  const marginX = 40
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 58, 138)
  doc.text(t.title, marginX, 42)

  let startY = 56
  if (t.subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(t.subtitle, marginX, 58)
    startY = 72
  }

  const generatedAt = new Date().toLocaleString('es-AR')

  autoTable(doc, {
    head: [t.head],
    body: t.body.map((row) => row.map(cellToText)),
    startY,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    didDrawPage: () => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Generado el ${generatedAt}`, marginX, pageH - 16)
      doc.text(`Pagina ${doc.getNumberOfPages()}`, pageW - marginX, pageH - 16, { align: 'right' })
    },
  })

  doc.save(`${t.filename ?? slug(t.title)}-${dateStamp()}.pdf`)
}

/** Exporta una tabla a Excel (.xlsx). Dispara la descarga en el navegador. */
export async function exportTableToXlsx(t: TableExport): Promise<void> {
  const header: Row = t.head.map((h) => ({ type: String, value: h, fontWeight: 'bold' }))
  const rows: SheetData = [header, ...t.body.map<Row>((row) => row.map(cellToXlsx))]
  const columns = t.columnWidths?.map((w) => ({ width: w }))

  const output = writeXlsxFile(rows, { sheet: sheetName(t.subtitle ?? t.title), columns })
  await output.toFile(`${t.filename ?? slug(t.title)}-${dateStamp()}.xlsx`)
}

/**
 * Exporta varias tablas como HOJAS de un mismo archivo .xlsx.
 * El nombre de cada hoja sale del `title` de su tabla.
 * Se usa, por ejemplo, en Asistencia: hoja 1 = inasistencias por término,
 * hoja 2 = planilla anual (matriz alumnos x fechas).
 */
export async function exportTablesToXlsx(tables: TableExport[], filename: string): Promise<void> {
  const sheets = tables.map((t) => ({
    data: [
      t.head.map((h) => ({ type: String, value: h, fontWeight: 'bold' as const })),
      ...t.body.map<Row>((row) => row.map(cellToXlsx)),
    ] as SheetData,
    sheet: sheetName(t.title),
    columns: t.columnWidths?.map((w) => ({ width: w })),
  }))

  const output = writeXlsxFile(sheets)
  await output.toFile(`${filename}-${dateStamp()}.xlsx`)
}
