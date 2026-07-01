/* ============================================================
 * ReceiptSheet — Recibo del instituto (descargable en PDF)
 *
 * Reproduce el recibo en papel del instituto (logo + "Centro de Idioma y
 * Cultura Inglesa", Nombre/Apellido, Cuota/Mora/TOTAL y Fecha).
 * SIN número de matrícula ni firma (decisión del cliente). Compacto: entra en
 * el modal sin scroll. Tamaños en px fijos: se rasteriza con html2canvas (ver
 * downloadSheetPdf), que no soporta cqw.
 * ============================================================ */

const LOGO_SRC = '/london-eye-logo.png'

export interface ReceiptData {
  firstName: string
  lastName: string
  amount: string // Cuota (ya formateado con $)
  lateFee: string // Mora
  total: string // TOTAL
  date: string // dd/mm/aaaa
}

export function ReceiptSheet({ data, sheetClassName }: { data: ReceiptData; sheetClassName: string }) {
  return (
    <div className={`relative flex flex-col bg-white ${sheetClassName}`}>
      <div className="flex flex-col px-7 py-5">
        {/* Encabezado */}
        <div className="flex flex-col items-center text-center">
          <img src={LOGO_SRC} alt="" className="h-28 w-auto object-contain" />
          <p className="mt-0.5 font-heading text-[13px] italic text-surface-700">de Silvana Jerez</p>
          <h2 className="mt-1 font-heading text-[17px] font-bold leading-tight text-surface-900">
            Centro de Idioma y Cultura Inglesa
          </h2>
        </div>

        {/* Datos del alumno */}
        <div className="mt-5 flex flex-col gap-1.5 text-[14px] text-surface-800">
          <Field label="Nombre" value={data.firstName} />
          <Field label="Apellido" value={data.lastName} />
        </div>

        {/* Importes */}
        <div className="mt-4 flex flex-col gap-1.5 text-[14px] text-surface-800">
          <Amount label="Cuota" value={data.amount} />
          <Amount label="Mora" value={data.lateFee} />
          <Amount label="TOTAL" value={data.total} strong />
        </div>

        <p className="mt-3 text-[14px] text-surface-800">
          <span className="font-semibold">Fecha:</span> {data.date}
        </p>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold">{label}:</span> <span className="font-medium">{value}</span>
    </p>
  )
}

function Amount({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-dotted border-surface-300 pb-0.5 ${strong ? 'font-bold' : 'font-medium'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
