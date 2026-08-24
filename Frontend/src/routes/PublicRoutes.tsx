import { Route } from 'react-router-dom'
import { GuestRoute } from './GuestRoute'
import { LoginPage } from '@/features/public/auth/LoginPage'
import { RegisterPage } from '@/features/public/auth/RegisterPage'
import { RequestPendingPage } from '@/features/public/auth/RequestPendingPage'
import { VerifyEmailPage } from '@/features/public/auth/VerifyEmailPage'

/* ============================================================
 * PublicRoutes — Rutas sin autenticacion
 *
 * login/registro van detras de GuestRoute: si ya hay sesion,
 * redirige al panel del rol en vez de mostrar el login.
 * ============================================================ */

export function publicRoutes() {
  return (
    <>
      <Route element={<GuestRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
      </Route>
      <Route path="solicitud-pendiente" element={<RequestPendingPage />} />
      <Route path="verificar-email" element={<VerifyEmailPage />} />
    </>
  )
}