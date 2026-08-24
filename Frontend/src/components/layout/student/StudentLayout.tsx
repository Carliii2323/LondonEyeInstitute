import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/uiStore'
import { StudentSidebar } from './StudentSidebar'
import { Header } from '@/components/layout/Header'

export function StudentLayout() {
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const isDrawerOpen = useUiStore((s) => s.isDrawerOpen)
  const openDrawer = useUiStore((s) => s.openDrawer)
  const closeDrawer = useUiStore((s) => s.closeDrawer)
  const location = useLocation()

  // Cerrar el drawer al navegar a otra ruta.
  useEffect(() => { closeDrawer() }, [location.pathname, closeDrawer])

  // Mientras el drawer esta abierto: Escape lo cierra y se bloquea el scroll del body.
  useEffect(() => {
    if (!isDrawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen, closeDrawer])

  return (
    <div className="min-h-screen bg-surface-50">
      <StudentSidebar />

      {/* Backdrop del drawer (solo mobile). */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <div className={cn('transition-[margin-left] duration-200 ease-in-out', isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16')}>
        <Header onOpenDrawer={openDrawer} />
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
