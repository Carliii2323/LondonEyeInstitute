import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRedirect } from './RoleRedirect'
import { publicRoutes } from './PublicRoutes'
import { adminRoutes } from './AdminRoutes'
import { NotFoundPage } from '@/features/public/errors/NotFoundPage'
import { teacherRoutes } from './TeacherRoutes'
import { studentRoutes } from './StudentRoutes'

/* ============================================================
 * AppRouter — Router raiz que delega en sub-routers por rol
 *
 * Estructura:
 *   /                   -> RoleRedirect (manda al home del rol)
 *   /login              -> Publica
 *   /admin/*            -> Solo admin/secretary
 *   /profesor/*         -> Solo teacher (TODO)
 *   /app/*              -> Solo student (TODO)
 *   *                   -> 404 (TODO)
 * ============================================================ */

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Ruta raiz: redirige segun rol */}
      <Route index element={<RoleRedirect />} />

      {/* Rutas publicas */}
      {publicRoutes()}

      {/* Rutas de administracion */}
      <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
        {adminRoutes()}
      </Route>

      {/* Rutas de profesor (TODO etapa 5) */}
      {<Route path="profesor" element={<ProtectedRoute allowedRoles={['teacher']} />}>
        {teacherRoutes()}
      </Route> }

      {/* Rutas de alumno (TODO) */}
      {<Route path="app" element={<ProtectedRoute allowedRoles={['student']} />}>
        {studentRoutes()}
      </Route> }

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
)