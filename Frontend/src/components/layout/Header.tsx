import { useUiStore } from '@/stores/uiStore'
import { Menu, Bell } from 'lucide-react'

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  return (
    <header className="h-14 bg-surface-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-button text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          aria-label="Alternar barra lateral"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-button text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors relative"
          aria-label="Notificaciones"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}