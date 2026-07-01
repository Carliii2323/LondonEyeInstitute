import { httpClient } from './httpClient'

/* ============================================================
 * settingsService — Configuracion del instituto (admin)
 *
 *   GET /admin/settings
 *   PUT /admin/settings
 *
 * Shapes exactos del backend (SettingsResponse / UpdateSettingsRequest).
 * Nota: late_fee_value es decimal -> string. late_fee_kind: porcentaje | fijo.
 * ============================================================ */

export type LateFeeKind = 'porcentaje' | 'fijo'

export interface InstituteSettings {
  name: string
  legal_name: string
  cuit: string
  phone: string
  address: string
  email: string
  monthly_due_day: number
  grace_days: number
  late_fee_kind: LateFeeKind
  late_fee_value: string
  no_payment_months: number[]
  grade_grace_days_january: number
  cbu: string
  alias: string
  account_holder: string
  updated_at: string
}

export type UpdateSettingsInput = Omit<InstituteSettings, 'updated_at'>

/** Datos públicos del instituto (cualquier usuario autenticado) — GET /settings/public */
export interface PublicSettings {
  name: string
  cbu: string
  alias: string
  account_holder: string
}

export const settingsService = {
  get() {
    return httpClient.get<InstituteSettings>('/admin/settings')
  },

  getPublic() {
    return httpClient.get<PublicSettings>('/settings/public')
  },

  update(input: UpdateSettingsInput) {
    return httpClient.put<InstituteSettings>('/admin/settings', input)
  },
}
