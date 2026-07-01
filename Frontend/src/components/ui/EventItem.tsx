import { cn } from '@/lib/cn'

/* ============================================================
 * EventItem — Molecula: Item de evento proximo
 *
 * Muestra un badge de fecha (dia + mes) junto a titulo y subtitulo.
 *
 * Uso:
 *   <EventItem
 *     day={18}
 *     month="AGO"
 *     title="Examen Final B1"
 *     subtitle="Aula 4 - 15:00 hs"
 *   />
 * ============================================================ */

interface EventItemProps {
  day: number
  month: string
  title: string
  subtitle: string
  className?: string
}

export function EventItem({ day, month, title, subtitle, className }: EventItemProps) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      {/* Badge de fecha */}
      <div className="w-12 h-12 rounded-card bg-royal-50 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-body font-bold text-royal-600 leading-none">{day}</span>
        <span className="text-[0.625rem] font-semibold text-royal-500 uppercase leading-tight mt-0.5">
          {month}
        </span>
      </div>

      {/* Contenido */}
      <div className="min-w-0">
        <p className="text-body font-medium text-surface-800">{title}</p>
        <p className="text-small text-surface-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}
