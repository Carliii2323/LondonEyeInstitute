import type { AttendanceRecord } from './types'

/* ============================================================
 * AttendanceStats — 3 pills con conteo por estado
 *
 * Derivados automaticamente desde los records.
 * ============================================================ */

interface AttendanceStatsProps {
  records: AttendanceRecord[]
}

export function AttendanceStats({ records }: AttendanceStatsProps) {
  const counts = {
    presentes: records.filter((r) => r.status === 'presente').length,
    ausentes: records.filter((r) => r.status === 'ausente').length,
    justificados: records.filter((r) => r.status === 'justificado').length,
  }

  return (
    <div className="flex flex-wrap gap-2">
      <StatPill color="emerald" label="Presentes" value={counts.presentes} />
      <StatPill color="accent" label="Ausentes" value={counts.ausentes} />
      <StatPill color="amber" label="Justificados" value={counts.justificados} />
    </div>
  )
}

/* ---- Pill individual ---- */

interface StatPillProps {
  color: 'emerald' | 'accent' | 'amber'
  label: string
  value: number
}

const PILL_STYLES = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-700', dot: 'bg-accent-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
}

function StatPill({ color, label, value }: StatPillProps) {
  const style = PILL_STYLES[color]
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-badge ${style.bg}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      <span className={`text-small font-semibold uppercase tracking-wider ${style.text}`}>
        {label}: {value}
      </span>
    </div>
  )
}