import type { UserRole } from '@/types'

/* ============================================================
 * roleHome — Ruta del panel inicial segun el rol del usuario.
 *
 * Vive aparte del componente RoleRedirect para no romper el fast-refresh
 * (un archivo de componentes no debe exportar tambien helpers). Lo usan
 * RoleRedirect y GuestRoute para mandar al usuario logueado a su panel.
 * ============================================================ */
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
