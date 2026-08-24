import type { EventType } from './types'

/* ============================================================
 * CalendarLegend — Referencia de colores por tipo de evento
 * ============================================================ */

const LEGEND_ITEMS: { type: EventType; label: string; color: string }[] = [
  { type: 'vencimiento', label: 'Vencimiento', color: 'bg-accent-500' },
  { type: 'evento', label: 'Evento', color: 'bg-royal-500' },
  { type: 'feriado', label: 'Feriado', color: 'bg-amber-500' },
  { type: 'otro', label: 'Otro', color: 'bg-surface-400' },
]

export function CalendarLegend() {
  return (
    <div className="flex items-center justify-center gap-6 py-4 border-t border-surface-100">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.type} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-sm ${item.color}`} />
          <span className="text-small font-semibold text-surface-500 uppercase tracking-wider">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}