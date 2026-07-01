import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * ActivityItem — Molecula: Item de actividad reciente
 *
 * Cada item tiene: icono con fondo de color, titulo, descripcion,
 * y timestamp relativo.
 *
 * Uso:
 *   <ActivityItem
 *     icon={<UserPlusIcon />}
 *     iconColor="blue"
 *     title="Nuevo alumno registrado"
 *     description="Sofia Martinez se unio a Conv. Teen II"
 *     timestamp="Hace 5 min."
 *   />
 * ============================================================ */

type IconColor = 'blue' | 'green' | 'amber' | 'red'

interface ActivityItemProps {
  icon: ReactNode
  iconColor?: IconColor
  title: string
  description: string
  timestamp: string
  className?: string
}

const ICON_BG: Record<IconColor, string> = {
  blue: 'bg-royal-50 text-royal-500',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-accent-50 text-accent-500',
}

export function ActivityItem({
  icon,
  iconColor = 'blue',
  title,
  description,
  timestamp,
  className,
}: ActivityItemProps) {
  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      {/* Icono circular con fondo de color */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          ICON_BG[iconColor],
        )}
      >
        {icon}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-surface-800">{title}</p>
        <p className="text-small text-surface-500 mt-0.5">{description}</p>
      </div>

      {/* Timestamp */}
      <span className="text-small text-surface-400 flex-shrink-0 whitespace-nowrap">
        {timestamp}
      </span>
    </div>
  )
}
