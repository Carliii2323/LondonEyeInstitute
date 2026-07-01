import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { TeacherTable } from './TeacherTable'
import { TeacherInfoModal } from './TeacherInfoModal'
import { TeacherDropModal } from './TeacherDropModal'
import { NewTeacherModal, type NewTeacherValues } from './NewTeacherModal'
import { EditTeacherModal, type TeacherFormValues } from './EditTeacherModal'
import {
  teacherService,
  type TeacherListItem,
  type TeacherDetail,
} from '@/services/teacherService'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * TeachersPage — Gestion de Docentes (conectada al backend)
 * ============================================================ */

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

export function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dropTarget, setDropTarget] = useState<{ id: string; name: string } | null>(null)
  const [isNewOpen, setNewOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; values: TeacherFormValues } | null>(null)
  const [isInfoOpen, setInfoOpen] = useState(false)
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoDetail, setInfoDetail] = useState<TeacherDetail | null>(null)

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await teacherService.list({ search, status: statusFilter, page, page_size: PAGE_SIZE })
      setTeachers(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(formatBackendError(err))
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    const timer = setTimeout(fetchTeachers, 350)
    return () => clearTimeout(timer)
  }, [fetchTeachers])

  function openDrop(id: string) {
    const t = teachers.find((x) => x.id === id)
    if (t) setDropTarget({ id, name: `${t.first_name} ${t.last_name}` })
  }

  async function confirmDrop() {
    if (!dropTarget) return
    try {
      await teacherService.updateStatus(dropTarget.id, 'inactive')
      setDropTarget(null)
      fetchTeachers()
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function handleReactivate(id: string) {
    try {
      await teacherService.updateStatus(id, 'active')
      fetchTeachers()
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function submitNew(values: NewTeacherValues) {
    await teacherService.create(values)
    await fetchTeachers()
  }

  async function openEdit(id: string) {
    try {
      const d = await teacherService.getById(id)
      setEditTarget({
        id,
        values: {
          first_name: d.first_name, last_name: d.last_name, dni: d.dni, phone: d.phone,
          email: d.email, join_date: d.join_date, notes: d.notes,
        },
      })
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function submitEdit(values: TeacherFormValues) {
    if (!editTarget) return
    await teacherService.update(editTarget.id, {
      first_name: values.first_name, last_name: values.last_name, dni: values.dni,
      phone: values.phone, join_date: values.join_date, notes: values.notes,
    })
    await fetchTeachers()
  }

  async function openInfo(id: string) {
    setInfoOpen(true)
    setInfoLoading(true)
    setInfoDetail(null)
    try {
      const d = await teacherService.getById(id)
      setInfoDetail(d)
    } catch (err) {
      setError(formatBackendError(err))
      setInfoOpen(false)
    } finally {
      setInfoLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer
      title="Gestion de Docentes"
      actions={
        <Button variant="danger" size="md" onClick={() => setNewOpen(true)}>
          + Agregar Docente
        </Button>
      }
    >
      <div className="bg-white rounded-card shadow-card overflow-visible">
        <div className="flex items-center justify-between gap-3 p-4">
          <SearchInput
            placeholder="Buscar por nombre, DNI o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            containerClassName="flex-1 max-w-md"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2.5 rounded-input border border-surface-200 bg-white text-body text-surface-700 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-4 mb-3 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TeacherTable
            teachers={teachers}
            onViewTeacher={openInfo}
            onEditTeacher={openEdit}
            onDropTeacher={openDrop}
            onReactivateTeacher={handleReactivate}
          />
        )}

        <div className="px-5 py-4 border-t border-surface-100">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={PAGE_SIZE}
            itemLabel="docentes"
            onPageChange={setPage}
          />
        </div>
      </div>

      <TeacherInfoModal
        isOpen={isInfoOpen}
        onClose={() => setInfoOpen(false)}
        onEdit={() => { setInfoOpen(false); if (infoDetail) openEdit(infoDetail.id) }}
        onDrop={() => {
          if (infoDetail) {
            setInfoOpen(false)
            setDropTarget({ id: infoDetail.id, name: `${infoDetail.first_name} ${infoDetail.last_name}` })
          }
        }}
        onReactivate={() => {
          if (infoDetail) {
            setInfoOpen(false)
            handleReactivate(infoDetail.id)
          }
        }}
        detail={infoDetail}
        isLoading={infoLoading}
      />

      <TeacherDropModal
        isOpen={!!dropTarget}
        onClose={() => setDropTarget(null)}
        onConfirm={confirmDrop}
        teacherName={dropTarget?.name ?? ''}
        hasCourses={false}
      />

      <NewTeacherModal
        isOpen={isNewOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={submitNew}
      />

      <EditTeacherModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={submitEdit}
        initialValues={editTarget?.values ?? null}
      />
    </PageContainer>
  )
}
