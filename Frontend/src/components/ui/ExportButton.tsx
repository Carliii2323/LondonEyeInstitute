import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react'

/* ============================================================
 * ExportButton — Boton "Exportar" con menu PDF / Excel (B34)
 *
 * Reusable en las pantallas con tablas. Recibe dos callbacks (uno por
 * formato); el de Excel suele ser async, asi que se muestra un estado
 * ocupado mientras corre. Cierra al hacer click afuera.
 * ============================================================ */

interface ExportButtonProps {
  onPdf: () => void | Promise<void>
  onXlsx: () => void | Promise<void>
  disabled?: boolean
  label?: string
  /** Alineacion del menu respecto del boton. Default 'right'. */
  align?: 'left' | 'right'
  className?: string
}

export function ExportButton({
  onPdf,
  onXlsx,
  disabled = false,
  label = 'Exportar',
  align = 'right',
  className,
}: ExportButtonProps) {
  const [isOpen, setOpen] = useState(false)
  const [isBusy, setBusy] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  async function run(fn: () => void | Promise<void>) {
    setOpen(false)
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || isBusy}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-button px-4 py-2 text-body',
          'bg-surface-100 text-surface-700 border border-surface-200',
          'transition-colors duration-150 hover:bg-surface-200 active:bg-surface-300',
          'focus-visible:outline-2 focus-visible:outline-royal-500 focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <Download size={16} />
        {isBusy ? 'Exportando...' : label}
        <ChevronDown size={15} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-card border border-surface-200 bg-white shadow-dropdown',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onPdf)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-body text-surface-700 transition-colors hover:bg-surface-50"
          >
            <FileText size={16} className="text-accent-500" />
            PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onXlsx)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-body text-surface-700 transition-colors hover:bg-surface-50 border-t border-surface-100"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            Excel
          </button>
        </div>
      )}
    </div>
  )
}
