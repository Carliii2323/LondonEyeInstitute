import { create } from 'zustand'

/* ============================================================
 * uiStore — Estado de interfaz global
 *
 * Para cosas como: sidebar abierto/cerrado, theme, toasts, etc.
 * NO poner logica de negocio aca.
 * ============================================================ */

interface UiState {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  isSidebarOpen: true,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (isSidebarOpen) =>
    set({ isSidebarOpen }),
}))
