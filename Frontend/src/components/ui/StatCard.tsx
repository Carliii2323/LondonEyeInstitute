import { cn } from '@/lib/cn'

/* ============================================================
 * StatCard — Molecula: Tarjeta de estadistica
 *
 * Muestra una metrica clave con label, valor, e indicador
 * de cambio (porcentaje o texto como "Estable").
 *
 * Uso:
 *   <StatCard
 *     label="TOTAL ESTUDIANTES"
 *     value="148"
 *     change="+5%"
 *     changeType="positive"
 *   />
 * ============================================================ */

type ChangeType = 'positive' | 'negative' | 'neutral'

interface StatCardProps {
  label: string
  value: string
  change: string
  changeType?: ChangeType
  className?: string
}

const CHANGE_STYLES: Record<ChangeType, string> = {
  positive: 'text-emerald-600 bg-emerald-50',
  negative: 'text-accent-500 bg-accent-50',
  neutral: 'text-surface-500 bg-surface-100',
}

export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        'bg-white rounded-card shadow-card p-5',
        'hover:shadow-card-hover transition-shadow',
        className,
      )}
    >
      <span className="text-small font-medium text-surface-400 uppercase tracking-wider">
        {label}
      </span>

      <div className="flex items-end justify-between mt-2">
        <span className="font-heading text-[1.75rem] font-bold text-surface-900 leading-none">
          {value}
        </span>

        <span
          className={cn(
            'text-small font-medium px-2 py-0.5 rounded-badge',
            CHANGE_STYLES[changeType],
          )}
        >
          {change}
        </span>
      </div>
    </article>
  )
}
