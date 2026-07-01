import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NotificationCard } from './NotificationCard'
import { NotificationFormModal, type NotificationFormValues } from './NotificationFormModal'
import {
  notificationService,
  type NotificationItem,
  type CreateNotificationInput,
} from '@/services/notificationService'
import { courseService } from '@/services/courseService'
import { studentService } from '@/services/studentService'
import { formatBackendError } from '@/lib/formatBackendError'
import { Trash2 } from 'lucide-react'

/* ============================================================
 * NotificationsPage — Publicaciones del Instituto (conectado)
 * ============================================================ */

const SUPPORTED_AUDIENCES = ['todos', 'estudiantes', 'docentes', 'curso', 'estudiante_especifico']

/** NotificationItem -> valores del form para edicion. */
function toFormValues(n: NotificationItem): Partial<NotificationFormValues> {
  return {
    title: n.title,
    message: n.message,
    type: n.type === 'archivado' ? 'informativo' : n.type,
    audience_type: SUPPORTED_AUDIENCES.includes(n.audience_type) ? n.audience_type : 'todos',
    audience_course_id: n.audience_course_id ?? '',
    audience_user_id: n.audience_user_id ?? '',
  }
}

const PAGE_SIZE = 8

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newOpen, setNewOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationItem | null>(null)
  const [deleting, setDeleting] = useState<NotificationItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await notificationService.list())
    } catch (err) {
      setError(formatBackendError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  useEffect(() => {
    courseService
      .list({ status: 'activo', page_size: 100 })
      .then((res) => setCourses(res.data.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCourses([]))
    studentService
      .list({ status: 'active', page_size: 100 })
      .then((res) => setStudents(res.data.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name} (${s.dni})` }))))
      .catch(() => setStudents([]))
  }, [])

  async function handleCreate(input: CreateNotificationInput) {
    await notificationService.create(input)
    await fetchList()
  }

  async function handleEdit(input: CreateNotificationInput) {
    if (!editing) return
    await notificationService.update(editing.id, input)
    await fetchList()
  }

  async function handleDeleteConfirm() {
    if (!deleting) return
    setIsDeleting(true)
    setError(null)
    try {
      await notificationService.remove(deleting.id)
      setDeleting(null)
      await fetchList()
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <PageContainer title="Notificaciones">
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-heading text-section-title text-surface-900">Publicaciones del Instituto</h2>
            <p className="text-small text-surface-500 mt-0.5">Visibles para los destinatarios seleccionados.</p>
          </div>
          <Button variant="danger" size="md" onClick={() => setNewOpen(true)}>+ Nueva Notificacion</Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        )}

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-body text-surface-400">No hay notificaciones publicadas.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {pageItems.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onEdit={(item) => setEditing(item)}
                  onDelete={(item) => setDeleting(item)}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-5 border-t border-surface-100 pt-4">
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  totalItems={items.length}
                  itemsPerPage={PAGE_SIZE}
                  itemLabel="notificaciones"
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <NotificationFormModal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={handleCreate}
        courses={courses}
        students={students}
        title="Nueva Publicacion"
        submitLabel="Publicar"
        showInfoBanner
      />

      <NotificationFormModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
        courses={courses}
        students={students}
        title="Editar Publicacion"
        submitLabel="Guardar Cambios"
        showInfoBanner={false}
        initialValues={editing ? toFormValues(editing) : undefined}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDeleteConfirm}
        icon={<DeleteIcon />}
        title="Eliminar publicacion"
        description={deleting ? `Vas a eliminar "${deleting.title}". Los destinatarios ya no la veran.` : ''}
        warning="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </PageContainer>
  )
}

function DeleteIcon() {
  return (
    <div className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center">
      <Trash2 size={28} className="text-accent-500" />
    </div>
  )
}
