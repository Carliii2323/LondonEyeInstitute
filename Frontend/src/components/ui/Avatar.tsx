import { cn } from '@/lib/cn'

/* ============================================================
 * Avatar — Atomo: Iniciales en circulo coloreado
 * ============================================================ */

interface AvatarProps {
  initials: string
  size?: 'sm' | 'md'
  className?: string
}

const COLORS = [
  'bg-royal-100 text-royal-700',
  'bg-accent-100 text-accent-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]

function hashInitials(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

const SIZE = { sm: 'w-8 h-8 text-[0.6875rem]', md: 'w-10 h-10 text-small' }

export function Avatar({ initials, size = 'sm', className }: AvatarProps) {
  const color = COLORS[hashInitials(initials) % COLORS.length]

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        SIZE[size],
        color,
        className,
      )}
    >
      {initials}
    </div>
  )
}