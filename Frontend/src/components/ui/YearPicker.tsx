import { cn } from '@/lib/cn'

/* ============================================================
 * YearPicker — Desplegable inline de año para notas historicas
 * ============================================================ */

interface YearPickerProps {
  value: number
  onChange: (year: number) => void
  years: number[]
  className?: string
}

export function YearPicker({ value, onChange, years, className }: YearPickerProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'appearance-none px-3 py-1.5 pr-7 rounded-button border border-surface-200 bg-white',
        'text-small font-medium text-surface-700',
        'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
        "bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%205l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]",
        'bg-[length:12px] bg-[right_6px_center] bg-no-repeat',
        className,
      )}
    >
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  )
}