/* ============================================================
 * Tipos globales del sistema London Eye Gestion
 *
 * Regla: los tipos reflejan EXACTAMENTE lo que devuelve el backend Go
 * (snake_case, sin capa de traduccion). Fuente de verdad: los DTOs del
 * backend (internal/dto/) ya probados.
 * ============================================================ */

/** Roles del sistema — mapea al ENUM user_role del backend */
export type UserRole = 'admin' | 'teacher' | 'student'

/** Estado de un usuario — mapea al ENUM user_status */
export type UserStatus = 'pending' | 'active' | 'inactive'

/** Usuario tal como lo devuelve el backend (UserInfo DTO) */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone: string
  avatar_url: string
  status: UserStatus
}

/** Cuerpo de POST /auth/login */
export interface LoginRequest {
  email: string
  password: string
}

/** Cuerpo de POST /auth/register (auto-registro de estudiante) */
export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  dni: string
  phone: string
}

/** Respuesta de login / refresh (AuthResponse DTO) */
export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

/** Respuesta paginada generica (PaginatedResponse[T] DTO) */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

/** Respuesta de estado simple ({ message }) */
export interface StatusResponse {
  message: string
}

/**
 * Respuesta de error del backend.
 * `respondError` devuelve { error, code }. Algunos endpoints agregan
 * `details` (string en la mayoria; objeto en NOT_ELIGIBLE de certificados).
 */
export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

/** Par value-label para selects y dropdowns */
export interface SelectOption {
  value: string
  label: string
}
