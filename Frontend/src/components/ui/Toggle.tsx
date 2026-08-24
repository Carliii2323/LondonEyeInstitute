import { cn } from '@/lib/cn'

/* ============================================================
 * Toggle — Atomo: Switch booleano
 *
 * Controlado desde afuera. Para labels complejos usar el
 * componente envuelto en un div junto con texto descriptivo.
 * ============================================================ */

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

export function Toggle({ checked, onChange, disabled, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-royal-500' : 'bg-surface-300',
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
          'transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}