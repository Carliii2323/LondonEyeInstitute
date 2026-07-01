import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { LogIn, UserPlus } from 'lucide-react'
import type { ElementType } from 'react'


/* ============================================================
 * AuthTabs — Switcher Login / Registrarse
 *
 * Navega entre /login y /registro con tabs visuales.
 * ============================================================ */


const TABS: { label: string; path: string; icon: ElementType }[] = [
  { label: 'Iniciar Sesion', path: '/login', icon: LogIn },
  { label: 'Registrarse', path: '/registro', icon: UserPlus },
]

export function AuthTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex border-b border-surface-200 mb-8">
      {TABS.map((tab) => {
        const isActive = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 pb-3 text-body font-medium transition-colors',
              isActive ? 'text-accent-500 border-b-2 border-accent-500' : 'text-surface-400 hover:text-surface-600',
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}