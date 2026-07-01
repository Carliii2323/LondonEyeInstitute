import { NavLink, Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { Home, ClipboardCheck, FileText, Calendar, Bell, GraduationCap, Settings } from 'lucide-react'
import type { ElementType } from 'react'

const NAV_ITEMS: { label: string; path: string; icon: ElementType }[] = [
  { label: 'Home', path: '/profesor/inicio', icon: Home },
  { label: 'Asistencia', path: '/profesor/asistencia', icon: ClipboardCheck },
  { label: 'Notas', path: '/profesor/notas', icon: FileText },
  { label: 'Calendario', path: '/profesor/calendario', icon: Calendar },
  { label: 'Notificaciones', path: '/profesor/notificaciones', icon: Bell },
]

export function TeacherSidebar() {
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const user = useAuthStore((s) => s.user)

  return (
    <aside className={cn('fixed top-0 left-0 z-40 h-screen bg-navy-500 text-white flex flex-col transition-[width] duration-200 ease-in-out', isSidebarOpen ? 'w-64' : 'w-16')}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-navy-400/30">
        <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        {isSidebarOpen && (
          <div>
            <span className="font-heading font-bold text-body text-white block leading-tight">LONDON EYE</span>
            <span className="text-small text-navy-200/60 uppercase tracking-wider leading-tight">Panel de Gestion</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-button text-body transition-colors duration-150',
                    isActive ? 'bg-accent-500 text-white font-medium' : 'text-navy-100/80 hover:bg-navy-400/30 hover:text-white',
                    !isSidebarOpen && 'justify-center px-0',
                  )
                }
              >
                <item.icon size={20} className="flex-shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <div className="border-t border-navy-400/30 px-3 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy-400/50 flex items-center justify-center text-small font-medium flex-shrink-0">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          {isSidebarOpen && (
            <>
              <div className="flex-1 truncate">
                <p className="text-small font-medium truncate">{user.first_name} {user.last_name}</p>
                <p className="text-small text-navy-200/60 truncate">Profesor</p>
              </div>
              <Link to="/profesor/configuracion" className="p-1 text-navy-200/60 hover:text-white transition-colors" aria-label="Configuracion">
                <Settings size={18} />
              </Link>
            </>
          )}
        </div>
      )}
    </aside>
  )
}