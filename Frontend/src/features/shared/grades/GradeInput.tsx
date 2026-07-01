import { cn } from '@/lib/cn'

/* ============================================================
 * GradeInput — Input numerico compacto para una celda de nota
 *
 * Valida rango 0-10 visualmente con borde rojo si esta desaprobado.
 * ============================================================ */

interface GradeInputProps {
  value: number | null
  onChange: (value: number | null) => void
  isFailing?: boolean
  emphasize?: boolean
  disabled?: boolean
}

export function GradeInput({ value, onChange, isFailing = false, emphasize = false, disabled = false }: GradeInputProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/[^\d]/g, '')
    if (raw === '') {
      onChange(null)
      return
    }
    const parsed = Number(raw)
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 10) return
    onChange(parsed)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        'w-12 h-9 appearance-none text-center rounded-button border bg-white',
        'text-body tabular-nums',
        'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
        'transition-colors',
        'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
        isFailing ? 'border-accent-300 text-accent-600 bg-accent-50/30' : 'border-surface-200 text-surface-800 hover:border-surface-300',
        emphasize && 'font-semibold',
      )}
    />
  )
}
