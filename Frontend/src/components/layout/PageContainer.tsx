import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================
 * PageContainer — Template para contenido de paginas
 *
 * Estandariza: titulo, descripcion, y area de acciones (botones)
 * en la parte superior de cada pagina. El children es el cuerpo.
 *
 * Uso:
 *   <PageContainer
 *     title="Alumnos"
 *     description="Gestion de alumnos inscriptos"
 *     actions={<Button>Nuevo alumno</Button>}
 *   >
 *     <StudentTable />
 *   </PageContainer>
 * ============================================================ */

interface PageContainerProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('flex flex-col gap-6 max-w-7xl mx-auto w-full', className)}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-page-title text-surface-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-body text-surface-500">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Page body */}
      <div>{children}</div>
    </div>
  )
}
