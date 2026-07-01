import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface MonthYearPickerProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
  minYear?: number
  maxYear?: number
  className?: string
}

export function MonthYearPicker({ month, year, onChange, minYear = 2020, maxYear = 2030, className }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(year)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isPositioned, setIsPositioned] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const dropdownWidth = 352 // 22rem
    const viewportPadding = 12

    let left = rect.left + rect.width / 2 - dropdownWidth / 2
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - dropdownWidth - viewportPadding))

    const top = rect.bottom + 12

    setPosition({ top, left })
    setIsPositioned(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false)
      return
    }

    updatePosition()

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  function handleSelect(selectedMonth: number) {
    onChange(selectedMonth, viewYear)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setIsOpen((v) => !v); setViewYear(year) }}
        className={cn(
          'inline-flex min-w-[14rem] items-center justify-center gap-3 rounded-card border border-surface-200 bg-surface-50 px-4 py-3',
          'text-body font-semibold text-surface-800 shadow-sm transition-colors',
          'hover:border-surface-300 hover:bg-white',
        )}
        aria-expanded={isOpen}
      >
        <span>{MONTHS[month] ?? ''} {year}</span>
        <ChevronDown size={16} className={cn('text-surface-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
            'fixed z-[60] w-[22rem] rounded-card border border-surface-200 bg-white p-5 shadow-dropdown',
            isPositioned ? 'opacity-100' : 'opacity-0',
          )}
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.max(minYear, y - 1))}
              disabled={viewYear <= minYear}
              className="rounded-full p-2 text-surface-500 transition-colors hover:bg-surface-100 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <span className="block text-small font-semibold uppercase tracking-[0.18em] text-surface-400">
                Calendario
              </span>
              <span className="block text-section-title text-surface-900">{viewYear}</span>
            </div>
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))}
              disabled={viewYear >= maxYear}
              className="rounded-full p-2 text-surface-500 transition-colors hover:bg-surface-100 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((name, index) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(index)}
                className={cn(
                  'rounded-button px-3 py-3 text-small font-semibold uppercase tracking-wider transition-colors',
                  index === month && viewYear === year
                    ? 'bg-surface-900 text-white shadow-sm'
                    : 'bg-surface-50 text-surface-600 hover:bg-surface-100 hover:text-surface-900',
                )}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
