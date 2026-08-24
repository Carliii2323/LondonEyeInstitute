import { useUiStore } from '@/stores/uiStore'
import { Menu, Bell } from 'lucide-react'

/*
 * Header compartido (student / teacher / admin).
 *
 * - Desktop (lg+): la hamburguesa colapsa/expande el riel (toggleSidebar).
 * - Mobile (< lg): la hamburguesa abre el drawer si el layout provee `onOpenDrawer`;
 *   si no (teacher/admin, que todavia no tienen drawer), cae al toggle de siempre.
 */
export function Header({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const onMobileMenu = onOpenDrawer ?? toggleSidebar

  return (
    <header className="h-14 bg-surface-50 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="hidden lg:inline-flex p-2 rounded-button text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          aria-label="Alternar barra lateral"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={onMobileMenu}
          className="lg:hidden p-2 rounded-button text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          aria-label="Abrir menu"
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
