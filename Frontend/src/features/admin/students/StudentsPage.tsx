import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { ExportButton } from '@/components/ui/ExportButton'
import type { TableExport } from '@/lib/exportTable'
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
import { courseService } from '@/services/courseService'
import { enrollmentService } from '@/services/enrollmentService'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * StudentsPage — Gestion de Estudiantes (conectada al backend)
 * ============================================================ */

const PAGE_SIZE = 10

const STATUS_EXPORT_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  inactive: 'Inactivo',
}

export function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(0) // 0 = todos los anios
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
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
      const res = await studentService.list({
        search, status: statusFilter, course_id: courseFilter, year: yearFilter,
        page, page_size: PAGE_SIZE,
      })
      setStudents(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(formatBackendError(err))
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, courseFilter, yearFilter, page])

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 350)
    return () => clearTimeout(timer)
  }, [fetchStudents])

  useEffect(() => {
    courseService
      .list({ status: 'activo', page_size: 100 })
      .then((res) => setCourses(res.data.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
  }, [])

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
    const { course_ids, ...studentData } = values
    const created = await studentService.create(studentData)
    // Inscribir a los cursos elegidos (best-effort: si uno falla por cupo, sigue).
    let failed = 0
    for (const courseId of course_ids) {
      try {
        await enrollmentService.enroll(created.id, courseId)
      } catch {
        failed += 1
      }
    }
    await fetchStudents()
    if (failed > 0) {
      setError(`El alumno se creó, pero no se pudo inscribir en ${failed} curso(s) (¿cupo lleno?).`)
    }
  }

  async function openEdit(id: string) {
    try {
      const d = await studentService.getById(id)
      setEditTarget({
        id,
        values: {
          first_name: d.first_name, last_name: d.last_name, dni: d.dni, email: d.email,
          phone: d.phone, address: d.address, birth_date: d.birth_date,
          tutor_name: d.tutor_name, tutor_phone: d.tutor_phone,
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
      phone: values.phone, address: values.address, birth_date: values.birth_date,
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

  // Export: trae TODO el listado que matchea el filtro actual (no solo la pagina).
  async function buildStudentsExport(): Promise<TableExport> {
    const res = await studentService.list({
      search, status: statusFilter, course_id: courseFilter, year: yearFilter,
      page: 1, page_size: 1000,
    })
    const courseName = courses.find((c) => c.id === courseFilter)?.name
    const filterParts = [
      statusFilter ? `Estado: ${STATUS_EXPORT_LABEL[statusFilter] ?? statusFilter}` : 'Todos los estados',
      courseName ? `Curso: ${courseName}` : null,
      yearFilter ? `Anio: ${yearFilter}` : null,
      search ? `Busqueda: "${search}"` : null,
    ].filter(Boolean)
    return {
      title: 'Listado de estudiantes',
      subtitle: `${filterParts.join(' · ')} · ${res.data.length} alumno(s)`,
      head: ['Nombre', 'DNI', 'Email', 'Telefono', 'Cursos', 'Tutor', 'Estado'],
      body: res.data.map((s) => [
        `${s.first_name} ${s.last_name}`,
        s.dni,
        s.email,
        s.phone,
        s.courses,
        s.tutor_name,
        STATUS_EXPORT_LABEL[s.status] ?? s.status,
      ]),
      filename: 'alumnos',
      columnWidths: [26, 12, 30, 18, 28, 22, 12],
    }
  }

  async function handleExport(kind: 'pdf' | 'xlsx') {
    setError(null)
    try {
      const table = await buildStudentsExport()
      const { exportTableToPdf, exportTableToXlsx } = await import('@/lib/exportTable')
      if (kind === 'pdf') exportTableToPdf(table, 'landscape')
      else await exportTableToXlsx(table)
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer
      title="Gestion de Estudiantes"
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            onPdf={() => handleExport('pdf')}
            onXlsx={() => handleExport('xlsx')}
            disabled={total === 0}
          />
          <Button variant="danger" size="md" onClick={() => setNewOpen(true)}>
            + Nuevo Estudiante
          </Button>
        </div>
      }
    >
      <StudentFilters
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        statusValue={statusFilter}
        onStatusChange={(v) => { setStatusFilter(v); setPage(1) }}
        courseValue={courseFilter}
        onCourseChange={(v) => { setCourseFilter(v); setPage(1) }}
        yearValue={yearFilter}
        onYearChange={(v) => { setYearFilter(v); setPage(1) }}
        courses={courses}
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
        courses={courses}
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
