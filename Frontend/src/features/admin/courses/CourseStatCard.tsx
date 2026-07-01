import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * CourseStatCard — Stat card con border-left de color
 *
 * Variante del Figma de Cursos: icono a la izquierda + metrica
 * grande, con una barra de color vertical al costado.
 * ============================================================ */

type StatColor = 'royal' | 'emerald' | 'amber'

interface CourseStatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  color: StatColor
}

const COLOR_STYLES: Record<StatColor, { border: string; iconBg: string; iconText: string }> = {
  royal: { border: 'border-l-royal-500', iconBg: 'bg-royal-50', iconText: 'text-royal-500' },
  emerald: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-500' },
  amber: { border: 'border-l-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-500' },
}

export function CourseStatCard({ icon, label, value, color }: CourseStatCardProps) {
  const style = COLOR_STYLES[color]

  return (
    <article className={cn('bg-white rounded-card shadow-card p-5 flex items-center gap-4 border-l-4', style.border)}>
      <div className={cn('w-12 h-12 rounded-card flex items-center justify-center flex-shrink-0', style.iconBg, style.iconText)}>
        {icon}
      </div>

      <div>
        <span className="text-small font-semibold text-surface-400 uppercase tracking-wider">{label}</span>
        <p className="font-heading text-[1.75rem] font-bold text-surface-900 leading-none mt-1">{value}</p>
      </div>
    </article>
  )
}