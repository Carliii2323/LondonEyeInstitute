import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { SettingsSection } from '@/features/admin/settings/SettingsSection'
import { SettingsField } from '@/features/admin/settings/SettingsField'
import { useAuthStore } from '@/stores/authStore'
import { profileService } from '@/services/profileService'
import { studentService } from '@/services/studentService'
import { authService } from '@/services/authService'
import { formatBackendError } from '@/lib/formatBackendError'
import { Info, Shield, User } from 'lucide-react'

/* ============================================================
 * StudentSettingsPage — Datos personales + seguridad (conectado)
 *
 *   Datos personales -> PUT /profile (first_name, last_name, phone)
 *                     + PUT /student/profile/address (direccion propia, F9)
 *   Seguridad        -> PUT /profile/password (revoca sesiones -> re-login)
 *
 * El email es identidad (no editable).
 * ============================================================ */

export function StudentSettingsPage() {
  const user = useAuthStore((s) => s.user)
  const setSessionUser = useAuthStore((s) => s.setSessionUser)
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileOk, setProfileOk] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([profileService.get(), studentService.getMyProfile()])
      .then(([p, s]) => {
        if (!active) return
        setFirstName(p.first_name)
        setLastName(p.last_name)
        setPhone(p.phone)
        setEmail(p.email)
        setAddress(s.address)
      })
      .catch((err) => active && setProfileError(formatBackendError(err)))
    return () => { active = false }
  }, [])

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    setProfileOk(false)
    try {
      const [updated] = await Promise.all([
        profileService.update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        }),
        studentService.updateMyAddress(address.trim()),
      ])
      if (user) setSessionUser(updated) // refresca el nombre en el sidebar
      setProfileOk(true)
    } catch (err) {
      setProfileError(formatBackendError(err))
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('La nueva contrasena debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contrasenas no coinciden.')
      return
    }
    setPasswordSaving(true)
    try {
      await profileService.changePassword({ current_password: currentPassword, new_password: newPassword })
      // El backend revoca las sesiones -> cerramos sesion y volvemos a login.
      await authService.logoutAndClear()
      navigate('/login')
    } catch (err) {
      setPasswordError(formatBackendError(err))
      setPasswordSaving(false)
    }
  }

  return (
    <PageContainer title="Configuracion" description="Actualiza tus datos personales y tu contrasena de acceso.">
      <div className="flex flex-col gap-5">
        {/* Datos personales */}
        <form id="profile-form" onSubmit={handleProfileSubmit}>
          <SettingsSection icon={<User size={20} />} title="Datos Personales">
            {profileError && (
              <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{profileError}</div>
            )}
            {profileOk && (
              <div className="mb-4 p-3 rounded-button bg-emerald-50 border border-emerald-200 text-small text-emerald-700">Datos actualizados.</div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SettingsField label="Nombre" name="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <SettingsField label="Apellido" name="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              <SettingsField label="Correo Electronico" name="email" value={email} disabled readOnly />
              <SettingsField label="Telefono" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <div className="md:col-span-2">
                <SettingsField label="Direccion" name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" form="profile-form" variant="danger" size="md" isLoading={profileSaving} className="w-full sm:w-auto">
                Guardar Datos
              </Button>
            </div>
          </SettingsSection>
        </form>

        {/* Seguridad */}
        <form id="password-form" onSubmit={handlePasswordSubmit}>
          <SettingsSection icon={<Shield size={20} />} title="Seguridad">
            {passwordError && (
              <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{passwordError}</div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SettingsField label="Contrasena Actual" name="current_password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <SettingsField label="Nueva Contrasena" name="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <SettingsField label="Confirmar Nueva" name="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-button border border-royal-100 bg-royal-50/50 p-3">
              <Info size={18} className="mt-0.5 flex-shrink-0 text-royal-500" />
              <span className="text-small text-royal-700">
                Al cambiar la contrasena se cierra la sesion en todos los dispositivos y tendras que volver a iniciar sesion.
              </span>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" form="password-form" variant="secondary" size="md" isLoading={passwordSaving} className="w-full sm:w-auto">
                Cambiar Contrasena
              </Button>
            </div>
          </SettingsSection>
        </form>
      </div>
    </PageContainer>
  )
}
