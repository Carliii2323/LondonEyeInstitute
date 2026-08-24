import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ActionMenu } from '@/components/ui/ActionMenu'
import type { TeacherListItem } from '@/services/teacherService'

/* ============================================================
 * TeacherTable — Tabla de docentes
 *
 * Columnas (MVP): NOMBRE | DNI | CONTACTO | ESTADO | ACCIONES
 * La columna "Cursos Asignados" se restaura cuando el backend la
 * provea en el listado (ver Tareas-Post-Integracion.md).
 * ============================================================ */

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Activo', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  inactive: { label: 'Inactivo', variant: 'default' },
}

interface TeacherTableProps {
  teachers: TeacherListItem[]
  onViewTeacher: (teacherId: string) => void
  onEditTeacher: (teacherId: string) => void
  onDropTeacher: (teacherId: string) => void
  onReactivateTeacher: (teacherId: string) => void
}

export function TeacherTable({ teachers, onViewTeacher, onEditTeacher, onDropTeacher, onReactivateTeacher }: TeacherTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-50/50 border-b border-surface-100">
            {['Nombre', 'DNI', 'Contacto', 'Cursos', 'Estado', 'Acciones'].map((h) => (
              <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {teachers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-body text-surface-400">No se encontraron docentes.</td>
            </tr>
          ) : (
            teachers.map((teacher) => {
              const fullName = `${teacher.first_name} ${teacher.last_name}`
              const initials = `${teacher.first_name[0] ?? ''}${teacher.last_name[0] ?? ''}`
              const status = STATUS_BADGE[teacher.status] ?? { label: teacher.status, variant: 'default' as const }

              return (
                <tr key={teacher.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials} />
                      <span className="text-body font-medium text-surface-800">{fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-body text-surface-600 whitespace-nowrap">{teacher.dni}</td>
                  <td className="px-5 py-4 text-body text-surface-600">{teacher.email}</td>
                  <td className="px-5 py-4 text-body text-surface-600">{teacher.courses_count}</td>
                  <td className="px-5 py-4">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-5 py-4 overflow-visible">
                    <ActionMenu
                      label={`Acciones para ${fullName}`}
                      items={[
                        { label: 'Ver informacion', onSelect: () => onViewTeacher(teacher.id) },
                        { label: 'Editar docente', onSelect: () => onEditTeacher(teacher.id) },
                        ...(teacher.status !== 'inactive'
                          ? [{ label: 'Dar de baja', onSelect: () => onDropTeacher(teacher.id), tone: 'danger' as const }]
                          : [{ label: 'Dar de alta', onSelect: () => onReactivateTeacher(teacher.id) }]),
                      ]}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
