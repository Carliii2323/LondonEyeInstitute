import { type InputHTMLAttributes, forwardRef } from 'react'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

/* ============================================================
 * FormField — Molecula: Label + Input + Error message
 *
 * Composicion de atomos. Estandariza la estructura de un campo
 * de formulario en toda la app.
 *
 * Uso:
 *   <FormField
 *     label="Email"
 *     name="email"
 *     type="email"
 *     required
 *     hasError={!!errors.email}
 *     errorMessage={errors.email}
 *   />
 * ============================================================ */

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hasError?: boolean
  errorMessage?: string
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ label, name, required, hasError, errorMessage, className, ...rest }, ref) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label
          htmlFor={name}
          className="text-body font-medium text-surface-700"
        >
          {label}
          {required && <span className="text-accent-500 ml-0.5">*</span>}
        </label>

        <Input
          ref={ref}
          id={name}
          name={name}
          required={required}
          hasError={hasError}
          errorMessage={errorMessage}
          {...rest}
        />
      </div>
    )
  },
)
