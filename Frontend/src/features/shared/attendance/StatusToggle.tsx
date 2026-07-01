import { cn } from '@/lib/cn'
import type { AttendanceStatus } from './types'

/* ============================================================
 * StatusToggle — 3 circulos P/A/J para marcar asistencia
 *
 * El circulo activo se rellena con el color del estado,
 * los inactivos quedan outlined.
 * ============================================================ */

interface StatusToggleProps {
  value: AttendanceStatus
  onChange: (status: AttendanceStatus) => void
}

interface StatusOption {
  value: AttendanceStatus
  letter: string
  activeClass: string
}

const OPTIONS: StatusOption[] = [
  { value: 'presente', letter: 'P', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
  { value: 'ausente', letter: 'A', activeClass: 'bg-accent-500 border-accent-500 text-white' },
  { value: 'justificado', letter: 'J', activeClass: 'bg-amber-500 border-amber-500 text-white' },
]

export function StatusToggle({ value, onChange }: StatusToggleProps) {
  return (
    <div className="inline-flex items-center gap-2">
      {OPTIONS.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center',
              'text-small font-bold transition-colors duration-150',
              isActive
                ? option.activeClass
                : 'border-surface-200 text-surface-400 hover:border-surface-300',
            )}
            aria-label={option.value}
            aria-pressed={isActive}
          >
            {option.letter}
          </button>
        )
      })}
    </div>
  )
}