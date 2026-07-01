import type { ApiError } from '@/types'
import { useAuthStore } from '@/stores/authStore'

/* ============================================================
 * httpClient — Capa de comunicacion con el backend Go
 *
 * Principios:
 *   - Un solo lugar para headers, base URL, y manejo de errores
 *   - Nunca se usa fetch() directo en features/components
 *   - El access token se inyecta automaticamente desde localStorage
 *   - Refresh transparente en 401 (single-flight + reintento unico)
 * ============================================================ */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

/** Error tipado que envuelve la respuesta de error del backend. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    super(body.error)
    this.name = 'HttpError'
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Saltea el refresh automatico en 401 (lo usan login/register). */
  skipRefresh?: boolean
}

/**
 * Promesa compartida del refresh en curso. Si varios requests fallan con
 * 401 a la vez, todos esperan ESTE refresh — no se disparan N en paralelo.
 */
let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    throw new Error('no refresh token')
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) {
    throw new Error('refresh failed')
  }

  const data = (await res.json()) as { access_token: string; refresh_token: string }
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data.access_token
}

async function request<T>(endpoint: string, options: RequestOptions = {}, _retry = false): Promise<T> {
  const { body, headers: customHeaders, skipRefresh, ...rest } = options

  const isFormData = body instanceof FormData
  const token = localStorage.getItem('access_token')

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    ...rest,
  })

  /* 401 → intentar refrescar una sola vez (salvo login/register o reintento) */
  if (response.status === 401 && !_retry && !skipRefresh) {
    try {
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null
        })
      }
      await refreshPromise
      return request<T>(endpoint, options, true)
    } catch {
      /* El refresh tambien fallo → sesion invalida. Limpiar y a login. */
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      throw new HttpError(401, { error: 'Sesión expirada', code: 'SESSION_EXPIRED' })
    }
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
      error: 'Error desconocido',
      code: 'UNKNOWN',
    }))) as ApiError
    throw new HttpError(response.status, errorBody)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/**
 * Descarga binaria autenticada (ej. comprobantes). Mismo manejo de token y
 * refresh que `request`, pero devuelve un Blob en vez de JSON.
 */
async function requestBlob(endpoint: string, _retry = false): Promise<Blob> {
  const token = localStorage.getItem('access_token')
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { method: 'GET', headers })

  if (response.status === 401 && !_retry) {
    try {
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null
        })
      }
      await refreshPromise
      return requestBlob(endpoint, true)
    } catch {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      throw new HttpError(401, { error: 'Sesión expirada', code: 'SESSION_EXPIRED' })
    }
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
      error: 'Error desconocido',
      code: 'UNKNOWN',
    }))) as ApiError
    throw new HttpError(response.status, errorBody)
  }

  return response.blob()
}

export const httpClient = {
  get: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: 'GET' }),

  getBlob: (url: string) => requestBlob(url),

  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: 'POST', body }),

  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: 'PUT', body }),

  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: 'PATCH', body }),

  delete: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: 'DELETE' }),
}
