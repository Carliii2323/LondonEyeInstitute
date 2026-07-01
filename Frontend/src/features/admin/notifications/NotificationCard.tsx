import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { TYPE_BAR_COLOR, TYPE_BADGE_VARIANT, TYPE_LABEL } from '@/features/shared/notifications/notificationHelpers'
import { relativeTime } from '@/lib/relativeTime'
import { audienceLabel } from './notificationFormat'
import type { NotificationItem } from '@/services/notificationService'

interface NotificationCardProps {
  notification: NotificationItem
  onEdit: (notification: NotificationItem) => void
  onDelete: (notification: NotificationItem) => void
}

export function NotificationCard({ notification, onEdit, onDelete }: NotificationCardProps) {
  return (
    <article className="relative bg-white rounded-card overflow-hidden border border-surface-100">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', TYPE_BAR_COLOR[notification.type])} />

      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h3 className="font-heading text-card-title text-surface-900">{notification.title}</h3>
            <Badge variant={TYPE_BADGE_VARIANT[notification.type]}>{TYPE_LABEL[notification.type].toUpperCase()}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-small font-medium text-surface-400 uppercase tracking-wider">{relativeTime(notification.created_at)}</span>
            <KebabMenu onEdit={() => onEdit(notification)} onDelete={() => onDelete(notification)} />
          </div>
        </div>

        <p className="text-body text-surface-600 mt-2">{notification.message}</p>

        <div className="mt-3">
          <span className="inline-block px-2.5 py-1 rounded-badge border border-surface-200 text-[0.6875rem] font-semibold text-surface-500 uppercase tracking-wider">
            {audienceLabel(notification)}
          </span>
        </div>
      </div>
    </article>
  )
}

function KebabMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen((v) => !v)} className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded transition-colors" aria-label="Opciones">
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-surface-200 rounded-button shadow-dropdown z-10 overflow-hidden">
          <button onClick={() => { onEdit(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-body text-surface-700 hover:bg-surface-50 transition-colors text-left">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => { onDelete(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-body text-accent-500 hover:bg-accent-50 transition-colors text-left">
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
