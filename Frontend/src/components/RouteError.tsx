import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { ErrorScreen } from './ErrorScreen'

/* ============================================================
 * RouteError — errorElement de cada area de rutas (M8-01)
 *
 * Se usa en una ruta sin path que envuelve a las pantallas, DENTRO del layout
 * de cada rol. Gracias a eso se renderiza en el <Outlet> del layout: el menu
 * lateral sigue en pie y el usuario puede irse a otra seccion en vez de quedar
 * atrapado.
 *
 * Por eso no alcanza con un ErrorBoundary comun alrededor del area: ese
 * reemplazaria el layout entero y la navegacion se perderia igual.
 * ============================================================ */

export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()

  let detail: string
  if (isRouteErrorResponse(error)) {
    detail = `${error.status} ${error.statusText}`
  } else if (error instanceof Error) {
    detail = error.message
  } else {
    detail = String(error)
  }

  console.error('[RouteError] error en la pantalla:', error)

  return (
    <ErrorScreen
      detail={detail}
      retryLabel="Volver atrás"
      // navigate(0) recarga la ruta actual; si no hay historial, al home.
      onRetry={() => navigate(-1)}
    />
  )
}
