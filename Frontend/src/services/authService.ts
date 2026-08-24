import type { AuthResponse, AuthUser, StatusResponse } from '@/types'
import { httpClient } from './httpClient'
import { useAuthStore } from '@/stores/authStore'

/* ============================================================
 * authService — Endpoints de autenticacion
 *
 * Los shapes son los del backend Go (probados). Sin normalizacion:
 * el front habla el idioma del backend directo.
 * ============================================================ */

export const authService = {
  /** POST /auth/login — devuelve tokens + usuario. */
  login(email: string, password: string) {
    return httpClient.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { skipRefresh: true },
    )
  },

  /** POST /auth/register — auto-registro de estudiante (queda pending).
   *  Es multipart/form-data: campos del alumno + el frente del DNI (`dni_front`). */
  register(data: FormData) {
    return httpClient.post<StatusResponse>('/auth/register', data, { skipRefresh: true })
  },

  /** POST /auth/verify-email — confirma el email con el token del link (F1). */
  verifyEmail(token: string) {
    return httpClient.post<StatusResponse>('/auth/verify-email', { token }, { skipRefresh: true })
  },

  /** POST /auth/resend-verification — reenvia el mail de verificacion. */
  resendVerification(email: string) {
    return httpClient.post<StatusResponse>('/auth/resend-verification', { email }, { skipRefresh: true })
  },

  /** GET /auth/me — usuario del token actual (para el bootstrap de sesion). */
  me() {
    return httpClient.get<AuthUser>('/auth/me')
  },

  /** POST /auth/logout — revoca el refresh token. */
  logout(refreshToken: string) {
    return httpClient.post<StatusResponse>('/auth/logout', { refresh_token: refreshToken })
  },

  /** Cierra sesion: revoca el token en el backend (best-effort) y limpia el estado local. */
  async logoutAndClear() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await this.logout(refreshToken)
      } catch {
        /* el token puede estar vencido/invalido; igual limpiamos local */
      }
    }
    useAuthStore.getState().logout()
  },
}
