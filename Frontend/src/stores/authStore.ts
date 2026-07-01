import { create } from 'zustand'
import type { AuthUser } from '@/types'

/* ============================================================
 * authStore — Estado de autenticacion global
 *
 * Responsabilidades:
 *   - Guardar el usuario autenticado
 *   - Persistir/limpiar tokens en localStorage
 *
 * Nota: las llamadas a la API van en services/authService.ts.
 * El store solo guarda estado.
 * ============================================================ */

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  /** Login: guarda usuario + ambos tokens. */
  setUser: (user: AuthUser, token: string, refreshToken: string) => void
  /** Bootstrap: setea el usuario de una sesion ya existente (tokens ya en localStorage). */
  setSessionUser: (user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

/** Hay sesion potencial si quedo un token guardado (se valida con /auth/me). */
const hasStoredToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token')

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: hasStoredToken, // true hasta que el bootstrap valide el token

  setUser: (user, token, refreshToken) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    set({ user, isAuthenticated: true, isLoading: false })
  },

  setSessionUser: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))
