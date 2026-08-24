import { create } from 'zustand'

/* ============================================================
 * uiStore — Estado de interfaz global
 *
 * Para cosas como: sidebar abierto/cerrado, theme, toasts, etc.
 * NO poner logica de negocio aca.
 * ============================================================ */

interface UiState {
  /* Desktop: riel colapsado/expandido (w-64 <-> w-16). Compartido por todos los layouts. */
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  /* Mobile (< lg): drawer lateral off-canvas. Solo lo consume el layout de alumno por ahora. */
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  isSidebarOpen: true,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (isSidebarOpen) =>
    set({ isSidebarOpen }),

  isDrawerOpen: false,

  openDrawer: () => set({ isDrawerOpen: true }),

  closeDrawer: () => set({ isDrawerOpen: false }),
}))
