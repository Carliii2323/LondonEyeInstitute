import { cn } from '@/lib/cn'
import type { EventType } from './types'

/* ============================================================
 * CalendarEventBadge — Badge compacto de evento dentro de un dia
 * ============================================================ */

interface CalendarEventBadgeProps {
  title: string
  type: EventType
}

const TYPE_STYLES: Record<EventType, string> = {
  vencimiento: 'bg-accent-100 text-accent-700',
  evento: 'bg-royal-100 text-royal-700',
  feriado: 'bg-amber-100 text-amber-700',
  otro: 'bg-surface-200 text-surface-600',
}

export function CalendarEventBadge({ title, type }: CalendarEventBadgeProps) {
  return (
    <span
      className={cn(
        'block w-full px-1.5 py-0.5',
        'rounded text-[0.625rem] font-bold uppercase leading-tight truncate',
        TYPE_STYLES[type],
      )}
      title={title}
    >
      {title}
    </span>
  )
}