import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { YearPicker } from '@/components/ui/YearPicker'
import { gradeService } from '@/services/gradeService'
import { libretaService, type LibretaRequestRow } from '@/services/libretaService'
import { StudentReportCardModal, type LibretaItem } from './StudentReportCardModal'
import { formatBackendError } from '@/lib/formatBackendError'
import { BookOpen, Download } from 'lucide-react'

/* ============================================================
 * StudentLibretaPage — Mi Libreta
 *
 * El alumno ve la libreta (REPORT CARD) de cada curso/año que cursó. La 1ra
 * descarga es libre; luego queda limitada y debe solicitar autorización al
 * administrador (que habilita una única descarga).
 * ============================================================ */

/** Estado de descarga de una libreta, derivado de las filas del backend. */
function statusFor(rows: LibretaRequestRow[], courseId: string, year: number): { canDownload: boolean; pending: boolean } {
  const mine = rows.filter((r) => r.course_id === courseId && r.year === year)
  const consumed = mine.some((r) => r.status === 'consumed')
  const approved = mine.some((r) => r.status === 'approved')
  const pending = mine.some((r) => r.status === 'pending')
  // 1ra libre (sin descargas) o con una autorización aprobada disponible.
  return { canDownload: !consumed || approved, pending }
}

export function StudentLibretaPage() {
  const [libretas, setLibretas] = useState<LibretaItem[]>([])
  const [rows, setRows] = useState<LibretaRequestRow[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState<LibretaItem | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [grades, reqRows] = await Promise.all([gradeService.getMine(), libretaService.listMine()])
      // Una libreta por cada curso/año con notas cargadas.
      const map = new Map<string, LibretaItem>()
      for (const g of grades.grades) {
        const key = `${g.course_id}_${g.year}`
        if (!map.has(key)) map.set(key, { course_id: g.course_id, course_name: g.course_name, year: g.year })
      }
      const list = [...map.values()].sort((a, b) => b.year - a.year || a.course_name.localeCompare(b.course_name))
      setLibretas(list)
      setRows(reqRows)
    } catch (err) {
      setError(formatBackendError(err))
      setLibretas([])
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Refresca solo el estado de las solicitudes (tras descargar/solicitar).
  const refreshRows = useCallback(() => {
    libretaService.listMine().then(setRows).catch(() => {})
  }, [])

  const years = useMemo(() => {
    const ys = [...new Set(libretas.map((l) => l.year))].sort((a, b) => b - a)
    return ys.length > 0 ? ys : [new Date().getFullYear()]
  }, [libretas])

  const filtered = libretas.filter((l) => {
    const matchesYear = years.includes(year) ? l.year === year : true
    const matchesSearch = l.course_name.toLowerCase().includes(search.toLowerCase())
    return matchesYear && matchesSearch
  })

  const selectedStatus = selected
    ? statusFor(rows, selected.course_id, selected.year)
    : { canDownload: false, pending: false }

  return (
    <PageContainer title="Mi Libreta">
      <div className="mb-6 flex items-start gap-2 rounded-button border border-surface-100 bg-surface-50 p-3">
        <BookOpen size={16} className="mt-0.5 flex-shrink-0 text-surface-400" />
        <span className="text-small text-surface-600">
          Acá ves la libreta de notas de cada curso que cursaste. La <strong>primera descarga es libre</strong>; para
          volver a descargarla tenés que solicitar autorización al administrador.
        </span>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-card border border-surface-100 bg-white p-4 shadow-card md:flex-row md:items-center md:justify-between">
        <SearchInput
          placeholder="Buscar por curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="w-full md:max-w-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-small font-semibold uppercase tracking-wider text-surface-500">Año</span>
          <YearPicker value={year} onChange={setYear} years={years} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-surface-200 bg-surface-50 p-10 text-center">
          <p className="text-body font-medium text-surface-700">Todavía no tenés libretas disponibles.</p>
          <p className="mt-1 text-small text-surface-400">Aparecerán cuando se carguen tus notas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filtered.map((l) => {
            const st = statusFor(rows, l.course_id, l.year)
            return (
              <div key={`${l.course_id}_${l.year}`} className="flex flex-col rounded-card border-t-4 border-t-royal-500 bg-white p-6 shadow-card">
                <div className="mb-3 flex items-start justify-between">
                  <BookOpen size={28} className="text-surface-800" />
                  {st.pending ? (
                    <Badge variant="warning">PENDIENTE</Badge>
                  ) : st.canDownload ? (
                    <Badge variant="success">DISPONIBLE</Badge>
                  ) : (
                    <Badge variant="default">LIMITADA</Badge>
                  )}
                </div>

                <h3 className="font-heading text-section-title text-surface-900">{l.course_name}</h3>
                <p className="mt-0.5 text-small text-surface-500">Ciclo {l.year}</p>

                <div className="mt-4 flex items-center justify-end border-t border-surface-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelected(l)}
                    className="flex items-center gap-1.5 text-small font-medium text-royal-500 transition-colors hover:text-royal-600"
                  >
                    <Download size={14} /> Ver libreta
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <StudentReportCardModal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        libreta={selected}
        status={selectedStatus}
        onChanged={refreshRows}
      />
    </PageContainer>
  )
}
