import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { UserPlus, X } from 'lucide-react'
import { formatBackendError } from '@/lib/formatBackendError'
import { courseService, type CourseDetail } from '@/services/courseService'
import type { EnrollmentListItem } from '@/services/enrollmentService'
import { statusBadge } from '@/lib/paymentFormat'
import type { PaymentStatus } from '@/services/paymentService'

/* ============================================================
 * CourseDetailModal — Detalle del curso + gestion de inscripciones
 *
 * Permite inscribir alumnos y darlos de baja (Opcion A).
 * ============================================================ */

interface CourseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  detail: CourseDetail | null
  enrollments: EnrollmentListItem[]
  allStudents: { id: string; name: string; dni: string }[]
  onEnroll: (studentId: string) => Promise<void>
  onDrop: (enrollmentId: string) => Promise<void>
  isLoading?: boolean
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  activo: { label: 'ACTIVO', variant: 'success' },
  cupo_completo: { label: 'CUPO COMPLETO', variant: 'warning' },
  inactivo: { label: 'INACTIVO', variant: 'default' },
}

export function CourseDetailModal({
  isOpen, onClose, onEdit, detail, enrollments, allStudents, onEnroll, onDrop, isLoading,
}: CourseDetailModalProps) {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [isMutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Estado de la cuota del mes por alumno (id → status). Se trae aparte del roster.
  const [cuotaByStudent, setCuotaByStudent] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen || !detail) {
      setCuotaByStudent({})
      return
    }
    let active = true
    courseService
      .getStudents(detail.id)
      .then((rows) => {
        if (!active) return
        const map: Record<string, string> = {}
        for (const r of rows) map[r.id] = r.payment_status
        setCuotaByStudent(map)
      })
      .catch(() => active && setCuotaByStudent({}))
    return () => { active = false }
  }, [isOpen, detail])

  /* Alumnos disponibles = activos que aun no estan inscriptos */
  const availableStudents = useMemo(() => {
    const enrolledIds = new Set(enrollments.map((e) => e.student_id))
    return allStudents.filter((s) => !enrolledIds.has(s.id))
  }, [allStudents, enrollments])

  /* Coincidencias del buscador (por nombre o DNI). */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return availableStudents.filter((s) => `${s.name} ${s.dni}`.toLowerCase().includes(q)).slice(0, 8)
  }, [availableStudents, query])

  function selectStudent(s: { id: string; name: string; dni: string }) {
    setSelectedStudent(s.id)
    setQuery(`${s.name} (${s.dni})`)
    setListOpen(false)
  }

  async function handleEnroll() {
    if (!selectedStudent) return
    setError(null)
    setMutating(true)
    try {
      await onEnroll(selectedStudent)
      setSelectedStudent('')
      setQuery('')
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setMutating(false)
    }
  }

  async function handleDrop(enrollmentId: string) {
    setError(null)
    setMutating(true)
    try {
      await onDrop(enrollmentId)
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setMutating(false)
    }
  }

  const badge = detail ? (STATUS_BADGE[detail.status] ?? { label: detail.status, variant: 'default' as const }) : null
  const hasTeacher = detail ? Boolean(detail.teacher_id) : false

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title={detail?.name ?? 'Curso'} onClose={onClose}>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </ModalHeader>

      <ModalBody>
        {isLoading || !detail ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Info + docente */}
            <div className="flex flex-col gap-5">
              <SectionTitle>Informacion del Curso</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Nivel" value={detail.level} />
                <DataField label="Horario" value={detail.schedule} />
                <DataField label="Precio Mensual" value={`$${detail.price_monthly}`} />
                <DataField label="Inscriptos" value={`${enrollments.length}/${detail.capacity}`} />
              </div>

              <div>
                <SectionTitle className="mb-3">Docente Asignado</SectionTitle>
                {hasTeacher ? (
                  <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-button border border-surface-100">
                    <Avatar initials={`${detail.teacher_first_name[0] ?? ''}${detail.teacher_last_name[0] ?? ''}`} size="md" />
                    <p className="text-body font-semibold text-surface-800">
                      {detail.teacher_first_name} {detail.teacher_last_name}
                    </p>
                  </div>
                ) : (
                  <p className="text-body text-surface-400 italic">Sin docente asignado.</p>
                )}
              </div>
            </div>

            {/* Inscripciones */}
            <div>
              <SectionTitle>Alumnos Inscriptos ({enrollments.length})</SectionTitle>
              <p className="mt-1 text-small text-surface-400">El badge muestra la cuota del mes en curso.</p>

              {error && (
                <div className="mt-3 p-2.5 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
              )}

              {/* Inscribir alumno — buscador por nombre o DNI */}
              <div className="flex items-start gap-2 mt-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedStudent(''); setListOpen(true) }}
                    onFocus={() => setListOpen(true)}
                    onBlur={() => setTimeout(() => setListOpen(false), 150)}
                    disabled={isMutating || availableStudents.length === 0}
                    placeholder={availableStudents.length === 0 ? 'No hay alumnos disponibles' : 'Buscar alumno por nombre o DNI...'}
                    className="w-full px-3 py-2 rounded-input border border-surface-200 bg-white text-body text-surface-800 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 disabled:bg-surface-50 disabled:text-surface-400"
                  />
                  {listOpen && matches.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-input border border-surface-200 bg-white shadow-dropdown">
                      {matches.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onMouseDown={() => selectStudent(s)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-body text-surface-700 hover:bg-surface-50"
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-small text-surface-400 flex-shrink-0">DNI {s.dni}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {listOpen && query.trim() !== '' && matches.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-input border border-surface-200 bg-white px-3 py-2 text-small text-surface-400 shadow-dropdown">
                      Sin resultados.
                    </div>
                  )}
                </div>
                <Button variant="danger" size="sm" onClick={handleEnroll} isLoading={isMutating} disabled={!selectedStudent}>
                  <UserPlus size={16} /> Inscribir
                </Button>
              </div>

              {/* Lista de inscriptos */}
              {enrollments.length === 0 ? (
                <p className="text-body text-surface-400 italic mt-4">Todavia no hay alumnos inscriptos.</p>
              ) : (
                <ul className="flex flex-col gap-2 mt-4 max-h-64 overflow-y-auto">
                  {enrollments.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar initials={`${e.first_name[0] ?? ''}${e.last_name[0] ?? ''}`} />
                        <span className="text-body text-surface-800 truncate">{e.first_name} {e.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CuotaBadge status={cuotaByStudent[e.student_id] ?? ''} />
                        <button
                          onClick={() => handleDrop(e.id)}
                          disabled={isMutating}
                          className="p-1 text-surface-400 hover:text-accent-500 transition-colors disabled:opacity-40"
                          aria-label={`Dar de baja a ${e.first_name} ${e.last_name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="justify-between">
        <Button variant="secondary" onClick={onEdit}>Editar Curso</Button>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </ModalFooter>
    </Modal>
  )
}

/** Badge del estado de la cuota del mes en curso ("" = sin cuota generada). */
function CuotaBadge({ status }: { status: string }) {
  if (!status) return <Badge variant="default">Sin cuota</Badge>
  const b = statusBadge(status as PaymentStatus)
  return <Badge variant={b.variant}>{b.label}</Badge>
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-small font-semibold text-surface-500 uppercase tracking-wider pb-2 border-b border-surface-100', className)}>
      {children}
    </h3>
  )
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-small font-semibold text-surface-400 uppercase tracking-wider">{label}</span>
      <p className="text-body text-surface-800 font-medium mt-0.5">{value}</p>
    </div>
  )
}
