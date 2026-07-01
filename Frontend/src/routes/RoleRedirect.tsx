import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

/* ============================================================
 * RoleRedirect — Redirige al home segun el rol del usuario
 *
 * Se usa en la ruta raiz "/" para que el usuario logueado
 * aterrice en su panel correspondiente.
 * ============================================================ */

/** Ruta del panel inicial segun el rol. */
export function roleHome(role: UserRole | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'teacher':
      return '/profesor/inicio'
    case 'student':
      return '/app/inicio'
    default:
      return '/login'
  }
}

export function RoleRedirect() {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(user.role)} replace />
}
