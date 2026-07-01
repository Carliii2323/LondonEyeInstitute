import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * SettingsField — Campo de configuracion con label uppercase
 *
 * Variante visual del FormField para el screen de Configuracion:
 * label en uppercase + tracking, helper text debajo, sufijo opt.
 * ============================================================ */

interface SettingsFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  /** Sufijo dentro del input (ej. "%") */
  suffix?: string
}

export const SettingsField = forwardRef<HTMLInputElement, SettingsFieldProps>(
  function SettingsField({ label, name, helperText, suffix, className, ...rest }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={name} className="text-small font-semibold text-surface-500 uppercase tracking-wider">
          {label}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={name}
            name={name}
            className={cn(
              'w-full px-3 py-2',
              'rounded-input border border-surface-200 bg-white',
              'text-body text-surface-800 placeholder:text-surface-400',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
              'hover:border-surface-300',
              suffix && 'pr-9',
              className,
            )}
            {...rest}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body text-surface-500 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>

        {helperText && (
          <span className="text-small text-surface-500 italic">{helperText}</span>
        )}
      </div>
    )
  },
)