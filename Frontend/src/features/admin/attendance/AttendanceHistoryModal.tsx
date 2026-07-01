import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { attendanceService, type AttendanceHistoryItem, type AttendanceStatusValue, type AttendanceScope } from '@/services/attendanceService'
import { formatDateOnly } from '@/lib/paymentFormat'
import { formatBackendError } from '@/lib/formatBackendError'

/* ============================================================
 * AttendanceHistoryModal — Historial de asistencia del alumno (real)
 * ============================================================ */

interface AttendanceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
  studentName: string
  courseId: string
  courseName: string
  scope?: AttendanceScope
}

const STATUS_MAP: Record<AttendanceStatusValue, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  presente: { label: 'Presente', variant: 'success' },
  ausente: { label: 'Ausente', variant: 'danger' },
  justificado: { label: 'Justificado', variant: 'warning' },
}

const MIN_REQUIRED_PERCENTAGE = 75

export function AttendanceHistoryModal({ isOpen, onClose, studentId, studentName, courseId, courseName, scope = 'admin' }: AttendanceHistoryModalProps) {
  const [items, setItems] = useState<AttendanceHistoryItem[]>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !studentId) return
    setLoading(true)
    setError(null)
    attendanceService
      .getHistory(studentId, courseId || undefined, scope)
      .then(setItems)
      .catch((err) => setError(formatBackendError(err)))
      .finally(() => setLoading(false))
  }, [isOpen, studentId, courseId, scope])

  const total = items.length
  const presentes = items.filter((e) => e.status === 'presente').length
  const ausentes = items.filter((e) => e.status === 'ausente').length
  const justificados = items.filter((e) => e.status === 'justificado').length
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0
  const meetsMinimum = pct >= MIN_REQUIRED_PERCENTAGE

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title={`Historial de Asistencia - ${studentName}`} onClose={onClose} />

      <div className="px-6 -mt-3 mb-4">
        <p className="text-small text-surface-500">{courseName}</p>
      </div>

      <ModalBody>
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <SummaryBadge color="emerald" label="Presentes" value={presentes} />
              <SummaryBadge color="accent" label="Ausentes" value={ausentes} />
              <SummaryBadge color="amber" label="Justificados" value={justificados} />
              <SummaryBadge color="surface" label={`Total ${total} clases`} />
            </div>

            {total > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-body font-medium text-surface-700">
                    Asistencia actual: <span className={meetsMinimum ? 'text-emerald-600 font-bold' : 'text-accent-600 font-bold'}>{pct}%</span>
                  </span>
                  <span className="text-small text-surface-500">Minimo requerido: {MIN_REQUIRED_PERCENTAGE}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${meetsMinimum ? 'bg-emerald-500' : 'bg-accent-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="max-h-[22rem] overflow-y-auto rounded-button border border-surface-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50/50">
                    {['Fecha', 'Estado', 'Observacion'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-small font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-8 text-center text-body text-surface-400">Sin registros de asistencia.</td></tr>
                  ) : (
                    items.map((entry, i) => {
                      const status = STATUS_MAP[entry.status]
                      return (
                        <tr key={`${entry.date}-${i}`}>
                          <td className="px-3 py-3 text-body text-surface-700">{formatDateOnly(entry.date)}</td>
                          <td className="px-3 py-3"><Badge variant={status.variant}>{status.label}</Badge></td>
                          <td className="px-3 py-3 text-body text-surface-500 italic">
                            {entry.observation || <span className="text-surface-300">—</span>}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </ModalFooter>
    </Modal>
  )
}

const BADGE_COLORS = {
  emerald: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  accent: { bg: 'bg-accent-50', dot: 'bg-accent-500', text: 'text-accent-700' },
  amber: { bg: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-700' },
  surface: { bg: 'bg-surface-100', dot: 'bg-surface-400', text: 'text-surface-600' },
}

function SummaryBadge({ color, label, value }: { color: keyof typeof BADGE_COLORS; label: string; value?: number }) {
  const c = BADGE_COLORS[color]
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-badge ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-small font-medium ${c.text}`}>{label}{value !== undefined && `: ${value}`}</span>
    </div>
  )
}
