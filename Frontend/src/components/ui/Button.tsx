import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * Button — Atomo del design system
 *
 * Variantes: primary | secondary | danger | ghost
 * Tamaños:  sm | md | lg
 *
 * Uso:
 *   <Button variant="primary" size="md" onClick={handleSave}>
 *     Guardar
 *   </Button>
 * ============================================================ */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-royal-500 text-white hover:bg-royal-600 active:bg-royal-700',
  secondary: 'bg-surface-100 text-surface-700 border border-surface-200 hover:bg-surface-200 active:bg-surface-300',
  danger: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700',
  ghost: 'bg-transparent text-surface-600 hover:bg-surface-100 active:bg-surface-200',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-small',
  md: 'px-4 py-2 text-body',
  lg: 'px-6 py-2.5 text-body',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'font-medium rounded-button',
        'transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-royal-500 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      disabled={isDisabled}
      {...rest}
    >
      {isLoading && <LoadingSpinner />}
      {children}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
