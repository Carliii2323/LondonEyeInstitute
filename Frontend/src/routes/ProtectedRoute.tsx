import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

/* ============================================================
 * ProtectedRoute — Guard con verificacion de rol
 *
 * Uso:
 *   <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
 *     ...rutas del admin
 *   </Route>
 * ============================================================ */

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-royal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-body text-surface-500">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  /* Si hay roles permitidos y el usuario no es uno de ellos, redirigir a su home */
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}