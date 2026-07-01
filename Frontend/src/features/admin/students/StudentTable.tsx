import { Button } from '@/components/ui/Button'
import { ActionMenu } from '@/components/ui/ActionMenu'
import type { StudentListItem } from '@/services/studentService'

/* ============================================================
 * StudentTable — Tabla de estudiantes
 *
 * Columnas (MVP): NOMBRE | DNI | CONTACTO | TELEFONO | ESTADO | ACCIONES
 * Las columnas "Cursos" y "Tutor" se restauran cuando el backend
 * amplíe ListStudents (ver Tareas-Post-Integracion.md [B1]).
 *
 * Los alumnos "pending" se resaltan y muestran boton APROBAR.
 * ============================================================ */

const COLUMN_HEADERS = ['Nombre', 'DNI', 'Contacto', 'Telefono', 'Estado', 'Acciones']

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  inactive: 'Inactivo',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  inactive: 'bg-surface-100 text-surface-500',
}

interface StudentTableProps {
  students: StudentListItem[]
  onViewStudent: (studentId: string) => void
  onEditStudent: (studentId: string) => void
  onDropStudent: (studentId: string) => void
  onApproveStudent: (studentId: string) => void
  onReactivateStudent: (studentId: string) => void
}

export function StudentTable({
  students,
  onViewStudent,
  onEditStudent,
  onDropStudent,
  onApproveStudent,
  onReactivateStudent,
}: StudentTableProps) {
  return (
    <div className="bg-white rounded-card shadow-card overflow-visible">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50/50">
              {COLUMN_HEADERS.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_HEADERS.length} className="px-4 py-10 text-center text-body text-surface-400">
                  No se encontraron estudiantes.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`
                return (
                  <tr
                    key={student.id}
                    className={student.status === 'pending' ? 'bg-amber-50/50' : 'hover:bg-surface-50 transition-colors'}
                  >
                    <td className="px-4 py-4 text-body font-medium text-surface-800 whitespace-nowrap">{fullName}</td>
                    <td className="px-4 py-4 text-body text-surface-600 whitespace-nowrap">{student.dni}</td>
                    <td className="px-4 py-4 text-body text-surface-600">
                      {student.email || <span className="text-surface-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4 text-body text-surface-600">
                      {student.phone || <span className="text-surface-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-badge text-small font-medium ${STATUS_CLASS[student.status] ?? ''}`}>
                        {STATUS_LABEL[student.status] ?? student.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 overflow-visible">
                      <div className="flex items-center gap-2">
                        {student.status === 'pending' && (
                          <Button variant="danger" size="sm" onClick={() => onApproveStudent(student.id)}>
                            APROBAR
                          </Button>
                        )}
                        <ActionMenu
                          label={`Acciones para ${fullName}`}
                          items={[
                            { label: 'Ver informacion', onSelect: () => onViewStudent(student.id) },
                            { label: 'Editar datos', onSelect: () => onEditStudent(student.id) },
                            ...(student.status !== 'inactive'
                              ? [{ label: 'Dar de baja', onSelect: () => onDropStudent(student.id), tone: 'danger' as const }]
                              : [{ label: 'Dar de alta', onSelect: () => onReactivateStudent(student.id) }]),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
