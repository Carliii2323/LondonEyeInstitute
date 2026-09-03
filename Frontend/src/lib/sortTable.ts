/* ============================================================
 * sortTable — Estado de ordenamiento para tablas con headers clickeables
 *
 * Vive aparte del componente SortableTh para no romper el fast-refresh
 * (un archivo de componentes no debe exportar tambien helpers).
 * ============================================================ */

export type SortDir = 'asc' | 'desc'

export interface SortState {
  /** Clave de la columna (la que entiende el backend o el comparador local). */
  by: string
  dir: SortDir
}

/** Nuevo estado al clickear una columna: asc la primera vez, luego invierte. */
export function toggleSort(current: SortState | null, key: string): SortState {
  if (current?.by === key) {
    return { by: key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  }
  return { by: key, dir: 'asc' }
}

/** Valor comparable de una celda. */
export type SortValue = string | number | null | undefined

/**
 * Ordena en el CLIENTE. Se usa en las listas que llegan completas del backend
 * (sin paginado); las paginadas ordenan en el servidor para no ordenar solo la
 * pagina visible.
 *
 * `accessor` devuelve el valor de la fila para la columna pedida. Los vacios
 * quedan siempre al final, y los textos se comparan con locale es (numeric:
 * true para que "10" vaya despues de "9").
 */
export function sortRows<T>(
  rows: T[],
  sort: SortState | null,
  accessor: (row: T, key: string) => SortValue,
): T[] {
  if (!sort) return rows
  const factor = sort.dir === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const va = accessor(a, sort.by)
    const vb = accessor(b, sort.by)

    const aEmpty = va === null || va === undefined || va === ''
    const bEmpty = vb === null || vb === undefined || vb === ''
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1 // los vacios al final, sin importar la direccion
    if (bEmpty) return -1

    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
    return String(va).localeCompare(String(vb), 'es', { numeric: true }) * factor
  })
}
