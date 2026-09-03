import { SearchInput } from '@/components/ui/SearchInput'

/* ============================================================
 * StudentFilters — Busqueda + filtros de estado, curso y anio lectivo
 *
 * Curso y anio filtran por INSCRIPCION: el alumno curso ese curso y su
 * inscripcion se solapa con ese anio (aunque despues se haya dado de baja).
 * ============================================================ */

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'inactive', label: 'Inactivos' },
]

/** Anios ofrecidos: el actual y los 4 anteriores. */
const NOW_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => NOW_YEAR - i)

const SELECT_CLASS =
  'px-3 py-2.5 rounded-input border border-surface-200 bg-white text-body text-surface-700 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500'

interface StudentFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  statusValue: string
  onStatusChange: (value: string) => void
  courseValue: string
  onCourseChange: (value: string) => void
  yearValue: number
  onYearChange: (value: number) => void
  courses: { id: string; name: string }[]
}

export function StudentFilters({
  searchValue, onSearchChange,
  statusValue, onStatusChange,
  courseValue, onCourseChange,
  yearValue, onYearChange,
  courses,
}: StudentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        placeholder="Buscar por nombre, DNI o email..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        containerClassName="flex-1 min-w-[16rem] max-w-2xl"
      />

      <select
        value={courseValue}
        onChange={(e) => onCourseChange(e.target.value)}
        aria-label="Filtrar por curso"
        className={SELECT_CLASS}
      >
        <option value="">Todos los cursos</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        value={yearValue === 0 ? '' : String(yearValue)}
        onChange={(e) => onYearChange(e.target.value === '' ? 0 : Number(e.target.value))}
        aria-label="Filtrar por anio lectivo"
        className={SELECT_CLASS}
      >
        <option value="">Todos los anios</option>
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <select
        value={statusValue}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filtrar por estado"
        className={SELECT_CLASS}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
