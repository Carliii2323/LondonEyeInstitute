import { ActivityItem as ActivityRow } from '@/components/ui/ActivityItem'
import type { ActivityItem, ActivityType } from '@/services/dashboardService'
import { relativeTime } from '@/lib/relativeTime'
import { UserPlus, CreditCard, CheckCircle } from 'lucide-react'
import type { ReactNode } from 'react'

/* ============================================================
 * RecentActivity — Card de actividad reciente (conectada)
 *
 * Recibe los items ya cargados (GET /admin/dashboard/activity).
 * ============================================================ */

interface RecentActivityProps {
  items: ActivityItem[]
  isLoading: boolean
}

const META: Record<ActivityType, { icon: ReactNode; color: 'blue' | 'green' | 'amber'; title: string }> = {
  enrollment: { icon: <UserPlus size={18} />, color: 'blue', title: 'Nueva inscripcion' },
  payment_submitted: { icon: <CreditCard size={18} />, color: 'amber', title: 'Comprobante enviado' },
  payment_approved: { icon: <CheckCircle size={18} />, color: 'green', title: 'Pago aprobado' },
}

export function RecentActivity({ items, isLoading }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-6 h-full flex flex-col">
      <h2 className="font-heading text-section-title text-surface-900 mb-2">Actividad Reciente</h2>

      {isLoading ? (
        <div className="flex-1 flex flex-col gap-3 pt-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-button bg-surface-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="flex-1 text-body text-surface-400 italic pt-2">Sin actividad reciente.</p>
      ) : (
        <div className="flex-1 divide-y divide-surface-100">
          {items.map((item, idx) => {
            const meta = META[item.type] ?? { icon: <CreditCard size={18} />, color: 'blue' as const, title: 'Actividad' }
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
      )}
    </div>
  )
}
