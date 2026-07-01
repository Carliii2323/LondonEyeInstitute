import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * Input — Atomo del design system
 *
 * Campo de texto base. Para formularios completos, usar
 * FormField (molecula) que agrega label + error message.
 *
 * Uso:
 *   <Input placeholder="Email" type="email" />
 *   <Input hasError errorMessage="Campo requerido" />
 * ============================================================ */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
  errorMessage?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ hasError = false, errorMessage, className, ...rest }, ref) {
    return (
      <div className="flex flex-col gap-1">
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2',
            'rounded-input border bg-white',
            'text-body text-surface-800 placeholder:text-surface-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
            hasError
              ? 'border-accent-500 focus:ring-accent-500/30 focus:border-accent-500'
              : 'border-surface-200 hover:border-surface-300',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            className,
          )}
          aria-invalid={hasError || undefined}
          {...rest}
        />
        {hasError && errorMessage && (
          <span className="text-small text-accent-500" role="alert">
            {errorMessage}
          </span>
        )}
      </div>
    )
  },
)
