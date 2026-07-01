import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { StudentFilters } from './StudentFilters'
import { StudentTable } from './StudentTable'
import { StudentDropModal } from './StudentDropModal'
import { StudentInfoModal } from './StudentInfoModal'
import { NewStudentModal, type NewStudentValues } from './NewStudentModal'
import { EditStudentModal, type StudentFormValues } from './EditStudentModal'
import {
  studentService,
  type StudentListItem,
  type StudentDetail,
  type StudentPaymentItem,
} from '@/services/studentService'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * StudentsPage — Gestion de Estudiantes (conectada al backend)
 * ============================================================ */

const PAGE_SIZE = 10

export function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dropTarget, setDropTarget] = useState<{ id: string; name: string } | null>(null)
  const [isNewOpen, setNewOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; values: StudentFormValues } | null>(null)

  const [isInfoOpen, setInfoOpen] = useState(false)
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoDetail, setInfoDetail] = useState<StudentDetail | null>(null)
  const [infoPayments, setInfoPayments] = useState<StudentPaymentItem[]>([])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await studentService.list({ search, status: statusFilter, page, page_size: PAGE_SIZE })
      setStudents(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(formatBackendError(err))
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 350)
    return () => clearTimeout(timer)
  }, [fetchStudents])

  async function handleApprove(id: string) {
    try {
      await studentService.approve(id)
      fetchStudents()
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  function openDrop(id: string) {
    const s = students.find((x) => x.id === id)
    if (s) setDropTarget({ id, name: `${s.first_name} ${s.last_name}` })
  }

  async function confirmDrop() {
    if (!dropTarget) return
    try {
      await studentService.updateStatus(dropTarget.id, 'inactive')
      setDropTarget(null)
      fetchStudents()
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function handleReactivate(id: string) {
    try {
      await studentService.updateStatus(id, 'active')
      fetchStudents()
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function submitNew(values: NewStudentValues) {
    await studentService.create(values)
    await fetchStudents()
  }

  async function openEdit(id: string) {
    try {
      const d = await studentService.getById(id)
      setEditTarget({
        id,
        values: {
          first_name: d.first_name, last_name: d.last_name, dni: d.dni, email: d.email,
          phone: d.phone, address: d.address, tutor_name: d.tutor_name, tutor_phone: d.tutor_phone,
        },
      })
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function submitEdit(values: StudentFormValues) {
    if (!editTarget) return
    await studentService.update(editTarget.id, {
      first_name: values.first_name, last_name: values.last_name, dni: values.dni,
      phone: values.phone, address: values.address,
      tutor_name: values.tutor_name, tutor_phone: values.tutor_phone,
    })
    await fetchStudents()
  }

  async function openInfo(id: string) {
    setInfoOpen(true)
    setInfoLoading(true)
    setInfoDetail(null)
    setInfoPayments([])
    try {
      const [d, p] = await Promise.all([studentService.getById(id), studentService.getPayments(id)])
      setInfoDetail(d)
      setInfoPayments(p)
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
      title="Gestion de Estudiantes"
      actions={
        <Button variant="danger" size="md" onClick={() => setNewOpen(true)}>
          + Nuevo Estudiante
        </Button>
      }
    >
      <StudentFilters
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        statusValue={statusFilter}
        onStatusChange={(v) => { setStatusFilter(v); setPage(1) }}
      />

      {error && (
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <div className="bg-white rounded-card shadow-card py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <StudentTable
            students={students}
            onViewStudent={openInfo}
            onEditStudent={openEdit}
            onDropStudent={openDrop}
            onApproveStudent={handleApprove}
            onReactivateStudent={handleReactivate}
          />
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={PAGE_SIZE}
        itemLabel="estudiantes"
        onPageChange={setPage}
      />

      <StudentDropModal
        isOpen={!!dropTarget}
        onClose={() => setDropTarget(null)}
        onConfirm={confirmDrop}
        studentName={dropTarget?.name ?? ''}
      />

      <NewStudentModal
        isOpen={isNewOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={submitNew}
      />

      <EditStudentModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={submitEdit}
        initialValues={editTarget?.values ?? null}
      />

      <StudentInfoModal
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
        payments={infoPayments}
        isLoading={infoLoading}
      />
    </PageContainer>
  )
}
