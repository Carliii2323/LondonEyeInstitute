import { type ReactNode } from 'react'

/* ============================================================
 * AuthLayout — Layout split: imagen izquierda + form derecha
 *
 * La imagen ocupa el 50% en desktop y se oculta en mobile.
 * ============================================================ */

interface AuthLayoutProps {
  imageSrc: string
  children: ReactNode
}

export function AuthLayout({ imageSrc, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-50 lg:grid lg:grid-cols-[1.05fr_minmax(0,0.95fr)]">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-6 lg:px-10 lg:py-8">
        <div className="w-full max-w-lg rounded-[1.25rem] border border-white/70 bg-white/95 p-6 shadow-dropdown backdrop-blur sm:p-8">
          {/* Marca del instituto */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <img src="/london-eye-logo.png" alt="London Eye School Institute" className="h-11 w-auto" />
            <span className="font-heading text-lg font-bold leading-tight text-surface-900">
              London Eye<br />School Institute
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
