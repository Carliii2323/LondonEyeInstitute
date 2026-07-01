import { useState, type ElementType } from 'react'
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { assetUrl } from '@/lib/assetUrl'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import {
  Home, Users, CreditCard, Calendar, ClipboardCheck,
  Bell, FileText, GraduationCap, UserCog, ChevronDown, Settings, LogOut, Award,
} from 'lucide-react'

/* ============================================================
 * AdminSidebar
 * ============================================================ */

interface SimpleNavItem {
  kind: 'link'
  label: string
  path: string
  icon: ElementType
}

interface GroupNavItem {
  kind: 'group'
  label: string
  icon: ElementType
  children: { label: string; path: string }[]
}

type NavItem = SimpleNavItem | GroupNavItem

const NAV_ITEMS: NavItem[] = [
  { kind: 'link', label: 'Home', path: '/admin/dashboard', icon: Home },
  { kind: 'link', label: 'Estudiantes', path: '/admin/estudiantes', icon: Users },
  {
    kind: 'group', label: 'Pagos', icon: CreditCard,
    children: [
      { label: 'Historial de Pagos', path: '/admin/pagos/historial' },
      { label: 'Revision de Comprobante', path: '/admin/pagos/revision' },
      { label: 'Historial de Revisiones', path: '/admin/pagos/revisiones' },
    ],
  },
  { kind: 'link', label: 'Calendario', path: '/admin/calendario', icon: Calendar },
  { kind: 'link', label: 'Asistencia', path: '/admin/asistencia', icon: ClipboardCheck },
  { kind: 'link', label: 'Notificaciones', path: '/admin/notificaciones', icon: Bell },
  { kind: 'link', label: 'Notas', path: '/admin/notas', icon: FileText },
  { kind: 'link', label: 'Cursos', path: '/admin/cursos', icon: GraduationCap },
  { kind: 'link', label: 'Docentes', path: '/admin/docentes', icon: UserCog },
  { kind: 'link', label: 'Certificados', path: '/admin/certificados', icon: Award },
]

export function AdminSidebar() {
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  async function handleLogout() {
    await authService.logoutAndClear()
    navigate('/login')
  }

  const activeGroup = NAV_ITEMS.find(
    (item): item is GroupNavItem =>
      item.kind === 'group' && item.children.some((c) => location.pathname.startsWith(c.path)),
  )
  const effectiveOpenGroup = openGroup ?? activeGroup?.label ?? null

  function toggleGroup(label: string) {
    setOpenGroup((prev) => (prev === label ? null : label))
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen',
        'bg-navy-500 text-white flex flex-col',
        'transition-[width] duration-200 ease-in-out',
        isSidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-navy-400/30">
        <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        {isSidebarOpen && (
          <div className={cn('overflow-hidden transition-all duration-200', isSidebarOpen ? 'w-40 opacity-100' : 'w-0 opacity-0',)}>
            <span className="font-heading font-bold text-body text-white block leading-tight whitespace-nowrap">LONDON EYE</span>
            <span className="text-small text-navy-200/60 uppercase tracking-wider leading-tight whitespace-nowrap">Panel de Gestion</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) =>
            item.kind === 'link' ? (
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
            ) : (
              <li key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-body transition-colors duration-150',
                    effectiveOpenGroup === item.label ? 'text-white font-medium' : 'text-navy-100/80 hover:bg-navy-400/30 hover:text-white',
                    !isSidebarOpen && 'justify-center px-0',
                  )}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {isSidebarOpen && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      <ChevronDown size={14} className={cn('transition-transform duration-200', effectiveOpenGroup === item.label && 'rotate-180')} />
                    </>
                  )}
                </button>
                {isSidebarOpen && effectiveOpenGroup === item.label && (
                  <ul className="mt-0.5 ml-8 flex flex-col gap-0.5">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <NavLink
                          to={child.path}
                          className={({ isActive }) =>
                            cn(
                              'block px-3 py-2 rounded-button text-small transition-colors duration-150',
                              isActive ? 'bg-accent-500 text-white font-medium' : 'text-navy-100/70 hover:bg-navy-400/30 hover:text-white',
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ),
          )}
        </ul>
      </nav>

      {/* Footer */}
      {user && (
        <div className="border-t border-navy-400/30 px-3 py-3 flex items-center gap-3">
          <Link to="/admin/perfil" className="flex items-center gap-3 min-w-0 flex-1" aria-label="Mi perfil">
            {user.avatar_url ? (
              <img src={assetUrl(user.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-navy-400/50 flex items-center justify-center text-small font-medium flex-shrink-0">
                {user.first_name[0]}{user.last_name[0]}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex-1 truncate">
                <p className="text-small font-medium truncate">{user.first_name} {user.last_name}</p>
                <p className="text-small text-navy-200/60 truncate">{user.role === 'admin' ? 'Administradora' : user.role}</p>
              </div>
            )}
          </Link>
          {isSidebarOpen && (
            <>
              <Link to="/admin/configuracion" className="p-1 text-navy-200/60 hover:text-white transition-colors" aria-label="Configuracion">
                <Settings size={18} />
              </Link>
              <button onClick={handleLogout} className="p-1 text-navy-200/60 hover:text-accent-400 transition-colors" aria-label="Cerrar sesion">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}