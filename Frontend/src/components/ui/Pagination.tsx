import { cn } from '@/lib/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  itemLabel?: string
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, itemLabel = 'items', onPageChange }: PaginationProps) {
  const pages = buildPageNumbers(currentPage, totalPages)
  const showing = Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage)

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-small text-surface-500">
        Mostrando <span className="font-medium text-surface-700">{showing}</span> de{' '}
        <span className="font-medium text-surface-700">{totalItems}</span> {itemLabel}
      </span>

      <div className="flex items-center gap-1">
        <PageButton disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Pagina anterior">
          <ChevronLeft size={14} />
        </PageButton>

        {pages.map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-small text-surface-400">...</span>
          ) : (
            <PageButton key={page} isActive={page === currentPage} onClick={() => onPageChange(page as number)}>
              {page}
            </PageButton>
          ),
        )}

        <PageButton disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Pagina siguiente">
          <ChevronRight size={14} />
        </PageButton>
      </div>
    </div>
  )
}

interface PageButtonProps {
  children: React.ReactNode
  isActive?: boolean
  disabled?: boolean
  onClick?: () => void
  'aria-label'?: string
}

function PageButton({ children, isActive = false, disabled = false, onClick, ...rest }: PageButtonProps) {
  return (
    <button
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-button text-small font-medium transition-colors duration-150',
        isActive ? 'bg-accent-500 text-white' : 'text-surface-600 hover:bg-surface-100',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}