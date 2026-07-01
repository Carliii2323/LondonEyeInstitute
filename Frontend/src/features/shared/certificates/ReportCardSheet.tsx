import { reportCardTotal, reportCardMessage, numberToEnglish, type ReportCardData } from './reportCard'

/* ============================================================
 * ReportCardSheet — Planilla de notas (REPORT CARD)
 *
 * Acompaña al certificado. Notas R/W/L/S + Make Up por término +
 * ausencias por término, y Total Average (0–10) con mensaje.
 * `sheetClassName` define el tamaño (preview vs impresión).
 * ============================================================ */

const LOGO_SRC = '/london-eye-logo.png'

function cell(n: number | null): string {
  return n === null || n === undefined ? '—' : String(n)
}

export function ReportCardSheet({ data, sheetClassName }: { data: ReportCardData; sheetClassName: string }) {
  const total = reportCardTotal(data)
  const totalAbsences = data.term1.absences + data.term2.absences
  const message = reportCardMessage(total)

  return (
    <div className={`rc-sheet relative flex flex-col overflow-hidden border-[3px] border-surface-700 bg-white ${sheetClassName}`}>
      <div className="rc-pad flex flex-1 flex-col">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="text-left">
            <p className="rc-title font-heading font-bold uppercase text-surface-900 underline underline-offset-4">Report Card</p>
            <p className="rc-meta mt-2 text-surface-800"><span className="font-bold italic underline">Student:</span> {data.studentName}</p>
            <p className="rc-meta text-surface-800"><span className="font-bold italic underline">Level:</span> {data.level}</p>
            <p className="rc-meta text-surface-800"><span className="font-bold italic underline">Year:</span> {data.year}</p>
          </div>
          <img src={LOGO_SRC} alt="" className="rc-logo w-auto flex-shrink-0 object-contain" />
        </div>

        {/* Tabla de notas */}
        <table className="mt-4 text-surface-900">
          <thead>
            <tr>
              <td rowSpan={2} className="border-0" />
              <th colSpan={4} className="rc-head text-center font-bold uppercase">Skills (Habilidades)</th>
              <th rowSpan={2} className="rc-head text-center font-bold">Absences<br /><span className="rc-sub font-normal">(Ausentismo)</span></th>
            </tr>
            <tr>
              <th className="rc-head text-center font-bold">Reading<br /><span className="rc-sub font-normal">(La Lectura)</span></th>
              <th className="rc-head text-center font-bold">Writing<br /><span className="rc-sub font-normal">(La Escritura)</span></th>
              <th className="rc-head text-center font-bold">Listening<br /><span className="rc-sub font-normal">(La Escucha)</span></th>
              <th className="rc-head text-center font-bold">Speaking<br /><span className="rc-sub font-normal">(El Habla)</span></th>
            </tr>
          </thead>
          <tbody className="rc-cell text-center">
            <tr>
              <th className="rc-rowlabel text-left font-bold">1st Term <span className="font-normal">(1er Cuatrimestre)</span></th>
              <td>{cell(data.term1.reading)}</td>
              <td>{cell(data.term1.writing)}</td>
              <td>{cell(data.term1.listening)}</td>
              <td>{cell(data.term1.speaking)}</td>
              <td>{data.term1.absences}</td>
            </tr>
            <tr>
              <th className="rc-rowlabel text-left font-bold">2nd Term <span className="font-normal">(2do Cuatrimestre)</span></th>
              <td>{cell(data.term2.reading)}</td>
              <td>{cell(data.term2.writing)}</td>
              <td>{cell(data.term2.listening)}</td>
              <td>{cell(data.term2.speaking)}</td>
              <td>{data.term2.absences}</td>
            </tr>
            <tr>
              <th className="rc-rowlabel text-left font-bold">Make up Exam <span className="font-normal">(Recuperatorios)</span></th>
              <td colSpan={2}>1er Cuat.: {cell(data.term1.makeup)}</td>
              <td colSpan={2}>2do Cuat.: {cell(data.term2.makeup)}</td>
              <td>{totalAbsences}</td>
            </tr>
            <tr>
              <th className="rc-rowlabel text-left font-bold">Total Average <span className="font-normal">(Promedio Final)</span></th>
              <td colSpan={5} className="rc-total font-bold">
                {total !== null ? `${total} (${numberToEnglish(total)})` : '—'}
              </td>
            </tr>
            {message && (
              <tr>
                <td colSpan={6} className="rc-msg text-center font-semibold italic text-surface-700">{message}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
