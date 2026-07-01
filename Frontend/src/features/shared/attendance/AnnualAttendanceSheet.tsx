
/* ============================================================
 * AnnualAttendanceSheet — Planilla anual de asistencia
 *
 * Grid 2D: filas = clase (fecha), columnas = alumnos.
 * Celda = P (presente) / A (ausente) / J (justificado).
 *
 * Encabezado superior muestra resumen por alumno (presentes /
 * total + porcentaje) al estilo de la vista de notas.
 * ============================================================ */

export type AttendanceCode = 'P' | 'A' | 'J'

export interface SheetStudent {
  id: string
  name: string
}

export interface SheetClass {
  date: string
  attendances: Record<string, AttendanceCode>
}

interface AnnualAttendanceSheetProps {
  course: string
  year: number
  students: SheetStudent[]
  classes: SheetClass[]
}


export function AnnualAttendanceSheet({ course, year, students, classes }: AnnualAttendanceSheetProps) {

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-surface-100">
        <h2 className="font-heading text-section-title text-surface-900">Planilla Anual de Asistencia</h2>
        <p className="text-small text-surface-500 mt-0.5">{course} — Año {year}</p>
      </div>

      {/* Grid de clases */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              <th className="px-4 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider w-36 sticky left-0 bg-surface-50">
                Clases/Alumno
              </th>
              {students.map((s) => (
                <th key={s.id} className="px-2 py-3 text-center text-small font-semibold text-surface-600 min-w-[80px] border-l border-surface-200">
                  {s.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {classes.map((cls) => (
              <tr key={cls.date} className="hover:bg-surface-50/50 transition-colors">
                <td className="px-4 py-2.5 text-small font-medium text-surface-500 whitespace-nowrap sticky left-0 bg-white border-r border-surface-200">
                  {cls.date}
                </td>
                {students.map((s) => {
                  const code = cls.attendances[s.id] ?? 'A'
                  return (
                    <td key={s.id} className="px-2 py-2.5 text-center border-l border-surface-100">
                      <span className="text-small font-semibold text-surface-700">
                        {code}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
