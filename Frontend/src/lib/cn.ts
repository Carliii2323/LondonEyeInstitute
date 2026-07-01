import { clsx, type ClassValue } from 'clsx'

/**
 * Combina clases de Tailwind de forma condicional.
 *
 * Uso:
 *   cn('base-class', isActive && 'active-class', className)
 *
 * Nota: si mas adelante necesitamos merge de clases conflictivas
 * (ej: "p-2" vs "p-4"), se puede agregar tailwind-merge aca
 * sin cambiar ningun componente.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
