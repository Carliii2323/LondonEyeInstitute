import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { roleHome } from './RoleRedirect'

/* ============================================================
 * GuestRoute — Guard inverso: solo para usuarios SIN sesion.
 *
 * Si un usuario ya autenticado entra a /login o /registro, lo manda
 * a su panel en vez de mostrar el login como si no hubiera sesion.
 * ============================================================ */

export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)

  // Mientras valida la sesion (bootstrap), no decidir aun.
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

  if (isAuthenticated && user) {
    return <Navigate to={roleHome(user.role)} replace />
  }

  return <Outlet />
}
