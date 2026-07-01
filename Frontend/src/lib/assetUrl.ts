/* ============================================================
 * assetUrl — Resuelve la URL pública de un asset del backend (ej. avatar).
 *
 * Los avatars se sirven en el origen del backend (http://host/uploads/avatars/...),
 * NO bajo /api/v1. Por eso se toma el origin de VITE_API_URL y se le concatena
 * el path relativo que devuelve el backend.
 * ============================================================ */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  try {
    return new URL(API_URL).origin + path
  } catch {
    return path
  }
}
