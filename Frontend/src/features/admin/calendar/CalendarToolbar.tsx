import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'

/* ============================================================
 * CalendarToolbar — Header del calendario admin
 *
 * El mes/año es clickeable y abre un MonthYearPicker dropdown.
 * Las flechas navegan mes a mes como acceso rapido.
 * ============================================================ */

interface CalendarToolbarProps {
  viewDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onMonthYearChange: (month: number, year: number) => void
  onNewEvent: () => void
}

export function CalendarToolbar({
  viewDate,
  onPrevMonth,
  onNextMonth,
  onMonthYearChange,
  onNewEvent,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-surface-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="hidden lg:block lg:w-[9rem]" />

      <div className="flex items-center justify-center gap-3">
        <ArrowButton onClick={onPrevMonth} direction="prev" />
        <MonthYearPicker
          month={viewDate.getMonth()}
          year={viewDate.getFullYear()}
          onChange={onMonthYearChange}
        />
        <ArrowButton onClick={onNextMonth} direction="next" />
      </div>

      <div className="flex justify-center lg:w-[9rem] lg:justify-end">
        <Button variant="danger" size="sm" onClick={onNewEvent}>
          + NUEVO EVENTO
        </Button>
      </div>
    </div>
  )
}

function ArrowButton({ onClick, direction }: { onClick: () => void; direction: 'prev' | 'next' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-500',
        'transition-colors hover:border-surface-300 hover:bg-surface-50 hover:text-surface-700',
      )}
      aria-label={direction === 'prev' ? 'Mes anterior' : 'Mes siguiente'}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 'prev' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} />
      </svg>
    </button>
  )
}
