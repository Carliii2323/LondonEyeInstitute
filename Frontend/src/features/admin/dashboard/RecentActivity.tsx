import { useState, type ReactNode } from 'react'
import { ActivityItem as ActivityRow } from '@/components/ui/ActivityItem'
import { Modal } from '@/components/ui/Modal'
import { dashboardService, type ActivityItem, type ActivityType } from '@/services/dashboardService'
import { relativeTime } from '@/lib/relativeTime'
import { UserPlus, CreditCard, CheckCircle, X } from 'lucide-react'

/* ============================================================
 * RecentActivity — Card de actividad reciente (conectada)
 *
 * El card del panel muestra solo las ultimas PREVIEW_COUNT para no ocupar
 * media pantalla; "Ver todo" abre un modal con la lista completa y scroll
 * (se pide aparte con un limit mayor).
 * ============================================================ */

interface RecentActivityProps {
  items: ActivityItem[]
  isLoading: boolean
}

/** Cuantas se ven en el card del panel. El resto queda en el modal. */
const PREVIEW_COUNT = 4
/** Cuantas trae el modal. */
const FULL_LIMIT = 50

const META: Record<ActivityType, { icon: ReactNode; color: 'blue' | 'green' | 'amber'; title: string }> = {
  enrollment: { icon: <UserPlus size={18} />, color: 'blue', title: 'Nueva inscripcion' },
  payment_submitted: { icon: <CreditCard size={18} />, color: 'amber', title: 'Comprobante enviado' },
  payment_approved: { icon: <CheckCircle size={18} />, color: 'green', title: 'Pago aprobado' },
}

const FALLBACK_META = { icon: <CreditCard size={18} />, color: 'blue' as const, title: 'Actividad' }

function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <div className="divide-y divide-surface-100">
      {items.map((item, idx) => {
        const meta = META[item.type] ?? FALLBACK_META
        return (
          <ActivityRow
            key={`${item.type}-${item.at}-${idx}`}
            icon={meta.icon}
            iconColor={meta.color}
            title={meta.title}
            description={item.description}
            timestamp={relativeTime(item.at)}
          />
        )
      })}
    </div>
  )
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 rounded-button bg-surface-100 animate-pulse" />
      ))}
    </div>
  )
}

export function RecentActivity({ items, isLoading }: RecentActivityProps) {
  const [isOpen, setOpen] = useState(false)
  const [fullItems, setFullItems] = useState<ActivityItem[]>([])
  const [isLoadingFull, setLoadingFull] = useState(false)

  async function openAll() {
    setOpen(true)
    setLoadingFull(true)
    try {
      setFullItems(await dashboardService.activity(FULL_LIMIT))
    } catch {
      setFullItems(items) // si falla, al menos mostramos lo que ya teniamos
    } finally {
      setLoadingFull(false)
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-small font-semibold text-surface-500 uppercase tracking-wider">Actividad Reciente</h3>
        {!isLoading && items.length > 0 && (
          <button
            type="button"
            onClick={openAll}
            className="text-small font-medium text-royal-500 hover:text-royal-600 transition-colors"
          >
            Ver todo
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton rows={PREVIEW_COUNT} />
      ) : items.length === 0 ? (
        <p className="text-body text-surface-400 italic pt-1">Sin actividad reciente.</p>
      ) : (
        <ActivityList items={items.slice(0, PREVIEW_COUNT)} />
      )}

      <Modal isOpen={isOpen} onClose={() => setOpen(false)} size="lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-section-title text-surface-900">Actividad reciente</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="p-1.5 rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {isLoadingFull ? (
            <Skeleton rows={6} />
          ) : fullItems.length === 0 ? (
            <p className="text-body text-surface-400 italic">Sin actividad reciente.</p>
          ) : (
            <ActivityList items={fullItems} />
          )}
        </div>
      </Modal>
    </div>
  )
}
