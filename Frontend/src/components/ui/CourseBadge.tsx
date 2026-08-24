import { cn } from '@/lib/cn'

/* ============================================================
 * CourseBadge — Atomo: Badge de nombre de curso
 *
 * Muestra el nombre del curso en un badge coloreado.
 * Los colores se asignan por un hash simple del nombre
 * para que siempre sean consistentes.
 * ============================================================ */

interface CourseBadgeProps {
  name: string
  className?: string
}

const BADGE_COLORS = [
  'bg-royal-50 text-royal-700 border-royal-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-accent-50 text-accent-700 border-accent-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function CourseBadge({ name, className }: CourseBadgeProps) {
  const colorIndex = hashString(name) % BADGE_COLORS.length
  const colorClass = BADGE_COLORS[colorIndex]

  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded text-[0.6875rem] font-semibold uppercase border leading-tight',
        colorClass,
        className,
      )}
    >
      {name}
    </span>
  )
}