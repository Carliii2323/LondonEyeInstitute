import { cn } from '@/lib/cn'
import type { SortState } from '@/lib/sortTable'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

/* ============================================================
 * SortableTh — Encabezado de tabla clickeable para ordenar
 *
 * Solo se usa en las columnas donde ordenar tiene sentido (nombre, fecha,
 * curso, monto...). El resto siguen siendo <th> comunes.
 *
 * Un click ordena ascendente; el siguiente invierte a descendente.
 * El estado y el toggle viven en '@/lib/sortTable'.
 * ============================================================ */

interface SortableThProps {
  /** Clave de la columna (la que entiende el backend o el comparador local). */
  sortKey: string
  label: string
  sort: SortState | null
  onSort: (key: string) => void
  className?: string
  /** Alinea el contenido a la derecha (columnas numericas). */
  align?: 'left' | 'right'
}

export function SortableTh({ sortKey, label, sort, onSort, className, align = 'left' }: SortableThProps) {
  const active = sort?.by === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-5 py-3 text-small font-semibold uppercase tracking-wider', align === 'right' ? 'text-right' : 'text-left', className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wider transition-colors',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-royal-600' : 'text-surface-500 hover:text-surface-700',
        )}
      >
        {label}
        <Icon size={14} className={active ? 'opacity-100' : 'opacity-40'} />
      </button>
    </th>
  )
}
