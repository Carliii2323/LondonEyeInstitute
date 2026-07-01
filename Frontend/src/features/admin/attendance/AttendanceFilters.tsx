import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'

/* ============================================================
 * AttendanceFilters — Seleccion de curso + fecha + confirmar
 * ============================================================ */

interface AttendanceFiltersProps {
  courses: { id: string; name: string }[]
  courseId: string
  date: string
  onCourseChange: (courseId: string) => void
  onDateChange: (date: string) => void
  onConfirm: () => void
  isLoading?: boolean
}

export function AttendanceFilters({
  courses, courseId, date, onCourseChange, onDateChange, onConfirm, isLoading,
}: AttendanceFiltersProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="course" className="text-small font-semibold text-surface-500 uppercase tracking-wider">
            Curso / Grupo
          </label>
          <select
            id="course"
            value={courseId}
            onChange={(e) => onCourseChange(e.target.value)}
            className="appearance-none px-3 py-2.5 pr-8 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%205l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat"
          >
            <option value="">Seleccionar curso...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-small font-semibold text-surface-500 uppercase tracking-wider">
            Fecha de Clase
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-2.5 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
          />
        </div>

        <Button variant="danger" size="md" onClick={onConfirm} isLoading={isLoading} disabled={!courseId}>
          <CheckCircle size={16} /> Cargar
        </Button>
      </div>
    </div>
  )
}
