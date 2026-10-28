import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/* ============================================================
 * ErrorScreen — Pantalla que se muestra cuando algo revienta
 *
 * La parte visual, compartida por los dos mecanismos de captura:
 * el ErrorBoundary global y el errorElement de cada area de rutas.
 * ============================================================ */

interface ErrorScreenProps {
  /** Mensaje tecnico. Solo se muestra en desarrollo. */
  detail?: string
  /** Accion principal. Por defecto recarga la pagina. */
  onRetry?: () => void
  retryLabel?: string
  /** `true` cuando ocupa toda la ventana (boundary global). */
  fullScreen?: boolean
}

export function ErrorScreen({ detail, onRetry, retryLabel = 'Recargar', fullScreen = false }: ErrorScreenProps) {
  return (
    <div className={`flex items-center justify-center p-6 ${fullScreen ? 'min-h-screen bg-surface-50' : 'min-h-[60vh]'}`}>
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50">
            <AlertTriangle size={26} className="text-accent-500" />
          </div>
        </div>

        <h2 className="font-heading text-page-title text-surface-900">Algo salió mal</h2>
        <p className="text-body text-surface-500 mt-2">
          Ocurrió un error inesperado en esta pantalla. Tus datos no se perdieron.
        </p>

        {/* El detalle tecnico solo en desarrollo: al usuario final no le dice
            nada y puede filtrar informacion interna. */}
        {detail && import.meta.env.DEV && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-button bg-surface-100 p-3 text-left text-small text-surface-600">
            {detail}
          </pre>
        )}

        <div className="mt-6 flex justify-center">
          <Button variant="danger" onClick={onRetry ?? (() => window.location.reload())}>
            {retryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
