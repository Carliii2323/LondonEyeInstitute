import { type SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * SettingsSelect — Select estilizado con label uppercase
 *
 * Variante para Configuracion. Misma logica visual que
 * SettingsField pero para opciones desplegables.
 * ============================================================ */

interface SettingsSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  helperText?: string
}

export const SettingsSelect = forwardRef<HTMLSelectElement, SettingsSelectProps>(
  function SettingsSelect({ label, name, helperText, className, children, ...rest }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={name} className="text-small font-semibold text-surface-500 uppercase tracking-wider">
          {label}
        </label>

        <select
          ref={ref}
          id={name}
          name={name}
          className={cn(
            'appearance-none px-3 py-2 pr-8',
            'rounded-input border border-surface-200 bg-white',
            'text-body text-surface-800',
            'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
            'bg-[url("data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%205l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")]',
            'bg-[length:12px] bg-[right_10px_center] bg-no-repeat',
            className,
          )}
          {...rest}
        >
          {children}
        </select>

        {helperText && (
          <span className="text-small text-surface-500 italic">{helperText}</span>
        )}
      </div>
    )
  },
)