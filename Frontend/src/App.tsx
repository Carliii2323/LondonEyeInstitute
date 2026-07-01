import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes/AppRouter'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { HttpError } from '@/services/httpClient'

/* ============================================================
 * App — Componente raiz
 *
 * Bootstrap de sesion: si hay un token guardado, lo valida contra
 * /auth/me antes de montar el router. Mientras valida, muestra un
 * spinner global (no se renderizan rutas protegidas → sin parpadeo).
 * ============================================================ */

export function App() {
  const isLoading = useAuthStore((s) => s.isLoading)
  const setSessionUser = useAuthStore((s) => s.setSessionUser)
  const logout = useAuthStore((s) => s.logout)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    authService
      .me()
      .then((user) => setSessionUser(user))
      .catch((err) => {
        /* 401 = sesion invalida → limpiar. Otro error (500/red) = backend
           caido, no el usuario → no limpiar, solo dejar de cargar. */
        if (err instanceof HttpError && err.status === 401) {
          logout()
        }
      })
      .finally(() => setLoading(false))
  }, [setSessionUser, logout, setLoading])

  /* Sincronizacion entre pestañas: el evento `storage` solo se dispara en las
     OTRAS pestañas. Si en una se cierra sesion (desaparece el token), las demas
     cierran tambien; si se inicia sesion, las demas recargan para bootstrapear. */
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== 'access_token' && event.key !== null) return
      const hasToken = !!localStorage.getItem('access_token')
      const { isAuthenticated } = useAuthStore.getState()
      if (!hasToken && isAuthenticated) {
        useAuthStore.getState().logout()
      } else if (hasToken && !isAuthenticated) {
        window.location.reload()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-body text-surface-500">Cargando...</span>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
