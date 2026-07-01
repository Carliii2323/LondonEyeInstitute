import { type ReactNode, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const SIZE_STYLES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
}

export function Modal({ isOpen, onClose, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={cn( 'relative w-full bg-white rounded-card shadow-dropdown max-h-[90vh] flex flex-col overflow-hidden', SIZE_STYLES[size], className, )} role="dialog" aria-modal="true">
        <div className="overflow-y-auto flex-1 rounded-card">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  title: string
  onClose: () => void
  children?: ReactNode
}

export function ModalHeader({ title, onClose, children }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 pb-4">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-section-title text-surface-900">{title}</h2>
        {children}
      </div>
      <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600 transition-colors" aria-label="Cerrar">
        <X size={20} />
      </button>
    </div>
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 pb-4', className)}>{children}</div>
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 px-6 py-4 border-t border-surface-100 bg-surface-50/50 rounded-b-card', className)}>
      {children}
    </div>
  )
}
