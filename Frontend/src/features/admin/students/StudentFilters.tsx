import { SearchInput } from '@/components/ui/SearchInput'

/* ============================================================
 * StudentFilters — Busqueda + filtro de estado
 *
 * (El boton "Exportar" se reincorpora post-integracion.)
 * ============================================================ */

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'inactive', label: 'Inactivos' },
]

interface StudentFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  statusValue: string
  onStatusChange: (value: string) => void
}

export function StudentFilters({ searchValue, onSearchChange, statusValue, onStatusChange }: StudentFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <SearchInput
        placeholder="Buscar por nombre, DNI o email..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        containerClassName="flex-1 max-w-2xl"
      />

      <select
        value={statusValue}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2.5 rounded-input border border-surface-200 bg-white text-body text-surface-700 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
