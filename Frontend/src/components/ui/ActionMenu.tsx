import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { MoreVertical } from 'lucide-react'

interface ActionMenuItem {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

interface ActionMenuProps {
  label?: string
  items: ActionMenuItem[]
  className?: string
}

export function ActionMenu({
  label = 'Abrir acciones',
  items,
  className,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isPositioned, setIsPositioned] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const estimatedMenuWidth = 176
    const estimatedMenuHeight = items.length * 42
    const viewportPadding = 12

    let left = rect.right + 8
    let top = rect.top + rect.height / 2

    if (left + estimatedMenuWidth > window.innerWidth - viewportPadding) {
      left = rect.left - estimatedMenuWidth - 8
    }

    const minTop = viewportPadding + estimatedMenuHeight / 2
    const maxTop = window.innerHeight - viewportPadding - estimatedMenuHeight / 2

    top = Math.min(Math.max(top, minTop), maxTop)

    setPosition({ top, left })
    setIsPositioned(true)
  }, [items.length])

  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false)
      return
    }

    updatePosition()

    function handleClickOutside(event: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleWindowChange() {
      updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [isOpen, updatePosition])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full text-surface-400',
          'transition-colors hover:bg-surface-100 hover:text-surface-700',
        )}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className={cn('fixed z-[70] min-w-[11rem] -translate-y-1/2 overflow-hidden rounded-card border border-surface-200 bg-white shadow-dropdown', isPositioned ? 'opacity-100' : 'opacity-0')}
          style={{ top: position.top, left: position.left }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onSelect()
                setIsOpen(false)
              }}
              className={cn(
                'flex w-full items-center px-3 py-2.5 text-left text-body transition-colors',
                item.tone === 'danger'
                  ? 'text-accent-600 hover:bg-accent-50'
                  : 'text-surface-700 hover:bg-surface-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
