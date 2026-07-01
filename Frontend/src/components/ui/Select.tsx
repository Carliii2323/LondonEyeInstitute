import { type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * Select — Atomo del design system
 *
 * Dropdown nativo estilizado. Para selects custom con busqueda
 * se creara un Combobox separado mas adelante.
 *
 * Uso:
 *   <Select value={period} onChange={handleChange}>
 *     <option value="6">Ultimos 6 meses</option>
 *     <option value="12">Ultimo año</option>
 *   </Select>
 * ============================================================ */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
}

export function Select({ hasError = false, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(
        'appearance-none px-3 py-1.5 pr-8',
        'rounded-button border bg-white',
        'text-body text-surface-700',
        'transition-colors duration-150 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
        'bg-[url("data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%205l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")]',
        'bg-[length:12px] bg-[right_8px_center] bg-no-repeat',
        hasError
          ? 'border-accent-500'
          : 'border-royal-500 hover:border-royal-400',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
}
