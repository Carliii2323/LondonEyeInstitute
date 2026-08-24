import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { roleHome } from './roleHome'

/* ============================================================
 * RoleRedirect — Redirige al home segun el rol del usuario
 *
 * Se usa en la ruta raiz "/" para que el usuario logueado
 * aterrice en su panel correspondiente.
 * ============================================================ */

export function RoleRedirect() {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(user.role)} replace />
}
