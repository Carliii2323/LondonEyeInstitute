import { type ReactNode } from 'react'

/* ============================================================
 * SettingsSection — Card con titulo + icono + descripcion opt
 *
 * Wrapper visual para cada bloque de configuracion.
 * Tiene barra lateral roja a la izquierda como en el Figma.
 * ============================================================ */

interface SettingsSectionProps {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <section className="relative bg-white rounded-card shadow-card overflow-hidden">
      {/* Barra lateral accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-500" />

      <div className="pl-6 pr-5 py-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-accent-500">{icon}</span>
          <h2 className="font-heading text-section-title text-surface-900">{title}</h2>
        </div>

        {description && (
          <p className="text-small text-surface-500 mb-4">{description}</p>
        )}

        <div className={description ? '' : 'mt-4'}>{children}</div>
      </div>
    </section>
  )
}