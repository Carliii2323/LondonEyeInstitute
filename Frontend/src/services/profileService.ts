import type { AuthUser, StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * profileService — Perfil propio del usuario autenticado
 *
 *   GET  /profile
 *   PUT  /profile            (first_name, last_name, phone)
 *   PUT  /profile/password   (current_password, new_password)
 *
 * GET/PUT devuelven UserInfo (mismo shape que AuthUser).
 * Cambiar la contrasena revoca las sesiones en el backend.
 * ============================================================ */

export interface UpdateProfileInput {
  first_name: string
  last_name: string
  phone: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

export const profileService = {
  get() {
    return httpClient.get<AuthUser>('/profile')
  },

  update(input: UpdateProfileInput) {
    return httpClient.put<AuthUser>('/profile', input)
  },

  changePassword(input: ChangePasswordInput) {
    return httpClient.put<StatusResponse>('/profile/password', input)
  },

  /** Sube/actualiza el avatar (JPG/PNG/WebP, máx 2 MB). Devuelve el perfil actualizado. */
  updateAvatar(file: File) {
    const fd = new FormData()
    fd.append('avatar', file)
    return httpClient.put<AuthUser>('/profile/avatar', fd)
  },
}
