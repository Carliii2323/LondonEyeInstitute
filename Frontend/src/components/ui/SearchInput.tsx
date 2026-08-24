import { type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Search } from 'lucide-react'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

export function SearchInput({ containerClassName, className, ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
      <input
        type="search"
        className={cn(
          'w-full pl-10 pr-4 py-2.5',
          'rounded-card border border-surface-200 bg-white',
          'text-body text-surface-800 placeholder:text-surface-400',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500',
          'hover:border-surface-300',
          className,
        )}
        {...rest}
      />
    </div>
  )
}