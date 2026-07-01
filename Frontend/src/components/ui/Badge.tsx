import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * Badge — Atomo del design system
 *
 * Indicadores pequenios de estado, categorias, contadores.
 *
 * Uso:
 *   <Badge variant="success">Activo</Badge>
 *   <Badge variant="warning">Pendiente</Badge>
 * ============================================================ */

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-accent-50 text-accent-600',
  info: 'bg-royal-50 text-royal-600',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5',
        'rounded-badge text-small font-medium',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
