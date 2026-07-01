import { type FormEvent, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import { SettingsSelect } from './SettingsSelect'
import { cn } from '@/lib/cn'
import { settingsService, type LateFeeKind } from '@/services/settingsService'
import { formatBackendError } from '@/lib/formatBackendError'
import { Building, CreditCard, Landmark, Info } from 'lucide-react'

/* ============================================================
 * SettingsPage — Configuracion del instituto (conectado)
 *
 * Secciones: Datos del Instituto, Configuracion de Pagos, Datos Bancarios.
 * Los campos numericos se manejan como string en el form y se parsean al guardar.
 * ============================================================ */

interface SettingsForm {
  name: string
  legal_name: string
  cuit: string
  phone: string
  address: string
  email: string
  monthly_due_day: string
  grace_days: string
  late_fee_kind: LateFeeKind
  late_fee_value: string
  no_payment_months: number[]
  grade_grace_days_january: string
  cbu: string
  alias: string
  account_holder: string
}

const EMPTY: SettingsForm = {
  name: '', legal_name: '', cuit: '', phone: '', address: '', email: '',
  monthly_due_day: '10', grace_days: '5', late_fee_kind: 'porcentaje', late_fee_value: '0',
  no_payment_months: [], grade_grace_days_january: '0', cbu: '', alias: '', account_holder: '',
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(EMPTY)
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    settingsService
      .get()
      .then((s) => {
        if (!active) return
        setForm({
          name: s.name, legal_name: s.legal_name, cuit: s.cuit, phone: s.phone,
          address: s.address, email: s.email,
          monthly_due_day: String(s.monthly_due_day),
          grace_days: String(s.grace_days),
          late_fee_kind: s.late_fee_kind,
          late_fee_value: s.late_fee_value,
          no_payment_months: s.no_payment_months ?? [],
          grade_grace_days_january: String(s.grade_grace_days_january),
          cbu: s.cbu, alias: s.alias, account_holder: s.account_holder,
        })
      })
      .catch((err) => active && setError(formatBackendError(err)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  function toggleMonth(month: number) {
    setForm((prev) => ({
      ...prev,
      no_payment_months: prev.no_payment_months.includes(month)
        ? prev.no_payment_months.filter((m) => m !== month)
        : [...prev.no_payment_months, month].sort((a, b) => a - b),
    }))
    setSuccess(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await settingsService.update({
        name: form.name.trim(),
        legal_name: form.legal_name.trim(),
        cuit: form.cuit.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
        monthly_due_day: parseInt(form.monthly_due_day, 10) || 0,
        grace_days: parseInt(form.grace_days, 10) || 0,
        late_fee_kind: form.late_fee_kind,
        late_fee_value: form.late_fee_value.trim(),
        no_payment_months: form.no_payment_months,
        grade_grace_days_january: parseInt(form.grade_grace_days_january, 10) || 0,
        cbu: form.cbu.trim(),
        alias: form.alias.trim(),
        account_holder: form.account_holder.trim(),
      })
      setSuccess(true)
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSaving(false)
    }
  }

  const lateFeeHelper = form.late_fee_kind === 'porcentaje'
    ? `Se aplica ${form.late_fee_value || '0'}% sobre el monto original.`
    : `Se aplica $${form.late_fee_value || '0'} fijo sobre el monto original.`

  if (isLoading) {
    return (
      <PageContainer title="Configuracion">
        <div className="py-20 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-royal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Configuracion"
      actions={
        <Button type="submit" form="settings-form" variant="danger" size="md" isLoading={isSaving}>
          Guardar Cambios
        </Button>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-button bg-emerald-50 border border-emerald-200 text-small text-emerald-700">Configuracion guardada.</div>
      )}

      <form id="settings-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Datos del Instituto */}
        <SettingsSection icon={<Building size={20} />} title="Datos del Instituto">
          <div className="grid grid-cols-2 gap-4">
            <SettingsField label="Nombre del Instituto" name="name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            <SettingsField label="Razon Social" name="legal_name" value={form.legal_name} onChange={(e) => update('legal_name', e.target.value)} />
            <SettingsField label="CUIT" name="cuit" value={form.cuit} onChange={(e) => update('cuit', e.target.value)} />
            <SettingsField label="Telefono" name="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SettingsField label="Direccion" name="address" value={form.address} onChange={(e) => update('address', e.target.value)} />
            <SettingsField label="Mail Institucional" name="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
        </SettingsSection>

        {/* Configuracion de Pagos */}
        <SettingsSection icon={<CreditCard size={20} />} title="Configuracion de Pagos">
          <div className="grid grid-cols-2 gap-4">
            <SettingsField
              label="Dia de Vencimiento Mensual" name="monthly_due_day" type="number" min="1" max="31"
              value={form.monthly_due_day} onChange={(e) => update('monthly_due_day', e.target.value)}
              helperText={`Las cuotas vencen el dia ${form.monthly_due_day || '?'} de cada mes.`} required
            />
            <SettingsField
              label="Dias de Gracia Antes de Moratoria" name="grace_days" type="number" min="0" max="30"
              value={form.grace_days} onChange={(e) => update('grace_days', e.target.value)}
              helperText={`Despues de ${form.grace_days || '0'} dias se aplica moratoria.`} required
            />
            <SettingsSelect label="Tipo de Moratoria" name="late_fee_kind" value={form.late_fee_kind} onChange={(e) => update('late_fee_kind', e.target.value as LateFeeKind)}>
              <option value="porcentaje">Porcentaje</option>
              <option value="fijo">Monto fijo</option>
            </SettingsSelect>
            <SettingsField
              label="Valor de Moratoria" name="late_fee_value" type="number" min="0"
              value={form.late_fee_value} onChange={(e) => update('late_fee_value', e.target.value)}
              helperText={lateFeeHelper} suffix={form.late_fee_kind === 'porcentaje' ? '%' : '$'} required
            />
            <SettingsField
              label="Dias de Gracia para Notas (Enero)" name="grade_grace_days_january" type="number" min="0" max="31"
              value={form.grade_grace_days_january} onChange={(e) => update('grade_grace_days_january', e.target.value)}
              helperText="Dias de enero en que aun se pueden cargar notas del ciclo anterior."
            />
          </div>

          {/* Meses sin cobro */}
          <div className="mt-4">
            <span className="text-small font-semibold text-surface-500 uppercase tracking-wider">Meses sin Cobro de Cuota</span>
            <p className="text-small text-surface-500 italic mt-0.5 mb-2">No se generan cuotas en los meses marcados (ej. receso de verano).</p>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((label, i) => {
                const month = i + 1
                const active = form.no_payment_months.includes(month)
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => toggleMonth(month)}
                    className={cn(
                      'px-3 py-1.5 rounded-button text-small font-medium transition-colors',
                      active ? 'bg-accent-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </SettingsSection>

        {/* Datos Bancarios */}
        <SettingsSection icon={<Landmark size={20} />} title="Datos Bancarios para Transferencias" description="Estos datos se usan para que el alumno transfiera la cuota.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SettingsField label="CBU" name="cbu" value={form.cbu} onChange={(e) => update('cbu', e.target.value)} />
            <SettingsField label="Alias" name="alias" value={form.alias} onChange={(e) => update('alias', e.target.value)} />
            <SettingsField label="Titular de la Cuenta" name="account_holder" value={form.account_holder} onChange={(e) => update('account_holder', e.target.value)} />
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 bg-royal-50/50 border border-royal-100 rounded-button">
            <Info size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
            <span className="text-small text-royal-700">
              Estos datos son la fuente para mostrarle al alumno donde transferir (pendiente de exponer al alumno).
            </span>
          </div>
        </SettingsSection>
      </form>
    </PageContainer>
  )
}
