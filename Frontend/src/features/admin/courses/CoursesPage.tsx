import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { cn } from '@/lib/cn'
import { CourseDetailModal } from './CourseDetailModal'
import { CourseFormModal, type CourseFormValues } from './CourseFormModal'
import {
  courseService,
  type CourseListItem,
  type CourseDetail,
  type CourseStatus,
} from '@/services/courseService'
import { teacherService } from '@/services/teacherService'
import { studentService } from '@/services/studentService'
import { enrollmentService, type EnrollmentListItem } from '@/services/enrollmentService'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * CoursesPage — Gestion de Cursos (conectada al backend)
 * ============================================================ */

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'cupo_completo', label: 'Cupo completo' },
  { value: 'inactivo', label: 'Inactivos' },
]

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; dni: string }[]>([])

  const [isNewOpen, setNewOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; values: Partial<CourseFormValues> } | null>(null)
  const [isDetailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<CourseDetail | null>(null)
  const [detailEnrollments, setDetailEnrollments] = useState<EnrollmentListItem[]>([])

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await courseService.list({ search, status: statusFilter, page, page_size: PAGE_SIZE })
      setCourses(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(formatBackendError(err))
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    const timer = setTimeout(fetchCourses, 350)
    return () => clearTimeout(timer)
  }, [fetchCourses])

  /* Docentes (para el form) y alumnos (para inscribir) — una vez */
  useEffect(() => {
    teacherService
      .list({ status: 'active', page_size: 100 })
      .then((res) => setTeachers(res.data.map((t) => ({ id: t.id, name: `${t.first_name} ${t.last_name}` }))))
      .catch(() => setTeachers([]))
    studentService
      .list({ status: 'active', page_size: 100 })
      .then((res) => setAllStudents(res.data.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, dni: s.dni }))))
      .catch(() => setAllStudents([]))
  }, [])

  function toInput(values: CourseFormValues) {
    return {
      name: values.name,
      level: values.level,
      schedule: values.schedule,
      price_monthly: values.price_monthly,
      inscripcion_price: values.inscripcion_price ? values.inscripcion_price : null,
      examen_price: values.examen_price ? values.examen_price : null,
      classroom_code: values.classroom_code.trim(),
      capacity: parseInt(values.capacity, 10) || 0,
      teacher_id: values.teacher_id,
    }
  }

  async function submitNew(values: CourseFormValues) {
    await courseService.create(toInput(values))
    await fetchCourses()
  }

  async function openEdit(id: string) {
    try {
      const d = await courseService.getById(id)
      setEditTarget({
        id,
        values: {
          name: d.name, level: d.level, schedule: d.schedule,
          price_monthly: d.price_monthly,
          inscripcion_price: d.inscripcion_price ?? '',
          examen_price: d.examen_price ?? '',
          classroom_code: d.classroom_code ?? '',
          capacity: String(d.capacity), teacher_id: d.teacher_id,
        },
      })
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  async function submitEdit(values: CourseFormValues) {
    if (!editTarget) return
    await courseService.update(editTarget.id, toInput(values))
    await fetchCourses()
  }

  async function openDetail(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    setDetailEnrollments([])
    try {
      const [d, e] = await Promise.all([
        courseService.getById(id),
        enrollmentService.list({ course_id: id, status: 'active' }),
      ])
      setDetail(d)
      setDetailEnrollments(e)
    } catch (err) {
      setError(formatBackendError(err))
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  async function reloadEnrollments(courseId: string) {
    const e = await enrollmentService.list({ course_id: courseId, status: 'active' })
    setDetailEnrollments(e)
  }

  async function handleEnroll(studentId: string) {
    if (!detail) return
    await enrollmentService.enroll(studentId, detail.id)
    await reloadEnrollments(detail.id)
    fetchCourses() // actualiza enrolled_count / estado en la tabla
  }

  async function handleDrop(enrollmentId: string) {
    if (!detail) return
    await enrollmentService.drop(enrollmentId)
    await reloadEnrollments(detail.id)
    fetchCourses()
  }

  async function handleStatus(id: string, status: CourseStatus) {
    try {
      await courseService.updateStatus(id, status)
      await fetchCourses()
    } catch (err) {
      setError(formatBackendError(err))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer
      title="Gestion de Cursos"
      actions={
        <Button variant="danger" size="md" onClick={() => setNewOpen(true)}>
          + Nuevo Curso
        </Button>
      }
    >
      <div className="bg-white rounded-card shadow-card p-4 flex items-center justify-between gap-3">
        <SearchInput
          placeholder="Buscar curso..."
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
        <div className="mt-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <div className="mt-4 bg-white rounded-card shadow-card overflow-visible">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50/50 border-b border-surface-100">
                  {['Curso', 'Horario', 'Precio', 'Cupo', 'Inscriptos', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {courses.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-body text-surface-400">No se encontraron cursos.</td></tr>
                ) : (
                  courses.map((course) => {
                    const isFull = course.status === 'cupo_completo'
                    return (
                      <tr key={course.id} className={cn('transition-colors', isFull ? 'bg-amber-50/40' : 'hover:bg-surface-50/50')}>
                        <td className="px-5 py-4">
                          <p className="text-body font-semibold text-surface-800">{course.name}</p>
                          <p className="text-[0.6875rem] font-semibold text-royal-500 uppercase tracking-wider mt-0.5">{course.level}</p>
                        </td>
                        <td className="px-5 py-4 text-body text-surface-600 whitespace-nowrap">{course.schedule}</td>
                        <td className="px-5 py-4 text-body font-medium text-surface-800 whitespace-nowrap">{formatPrice(course.price_monthly)}</td>
                        <td className="px-5 py-4 text-body text-surface-600">{course.capacity}</td>
                        <td className="px-5 py-4 min-w-[120px]">
                          <EnrollmentCell enrolled={course.enrolled_count} capacity={course.capacity} />
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={course.status} /></td>
                        <td className="px-5 py-4 overflow-visible">
                          <ActionMenu
                            label={`Acciones para ${course.name}`}
                            items={[
                              { label: 'Ver informacion', onSelect: () => openDetail(course.id) },
                              { label: 'Editar curso', onSelect: () => openEdit(course.id) },
                              ...(course.status === 'inactivo'
                                ? [{ label: 'Dar de alta', onSelect: () => handleStatus(course.id, 'activo' as const) }]
                                : [{ label: 'Dar de baja', tone: 'danger' as const, onSelect: () => handleStatus(course.id, 'inactivo' as const) }]),
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-4 border-t border-surface-100">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={PAGE_SIZE}
            itemLabel="cursos"
            onPageChange={setPage}
          />
        </div>
      </div>

      <CourseDetailModal
        isOpen={isDetailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={() => { setDetailOpen(false); if (detail) openEdit(detail.id) }}
        detail={detail}
        enrollments={detailEnrollments}
        allStudents={allStudents}
        onEnroll={handleEnroll}
        onDrop={handleDrop}
        isLoading={detailLoading}
      />

      <CourseFormModal
        isOpen={isNewOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={submitNew}
        teachers={teachers}
        title="Nuevo Curso"
        submitLabel="Crear Curso"
      />

      <CourseFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={submitEdit}
        teachers={teachers}
        initialValues={editTarget?.values}
        title="Editar Curso"
        submitLabel="Guardar Cambios"
      />
    </PageContainer>
  )
}

function EnrollmentCell({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const ratio = capacity > 0 ? enrolled / capacity : 0
  const isFull = enrolled >= capacity
  return (
    <div className="flex flex-col gap-1">
      <span className="text-body font-medium text-surface-800 tabular-nums">{enrolled}/{capacity}</span>
      <div className="w-full h-1 rounded-full bg-surface-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', isFull ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: CourseStatus }) {
  const map: Record<CourseStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
    activo: { label: 'Activo', variant: 'success' },
    cupo_completo: { label: 'Cupo completo', variant: 'warning' },
    inactivo: { label: 'Inactivo', variant: 'default' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={variant}>{label}</Badge>
}

function formatPrice(value: string): string {
  const n = Number(value)
  return Number.isNaN(n) ? `$${value}` : `$${n.toLocaleString('es-AR')}`
}
