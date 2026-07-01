import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { SettingsSection } from '@/features/admin/settings/SettingsSection'
import { SettingsField } from '@/features/admin/settings/SettingsField'
import { useAuthStore } from '@/stores/authStore'
import { profileService } from '@/services/profileService'
import { authService } from '@/services/authService'
import { assetUrl } from '@/lib/assetUrl'
import { formatBackendError } from '@/lib/formatBackendError'
import { Camera, Info, Shield, User } from 'lucide-react'

/* ============================================================
 * AdminProfilePage — Mi Perfil del admin (datos + seguridad + avatar)
 *
 *   Datos     -> PUT /profile (first_name, last_name, phone)
 *   Avatar    -> PUT /profile/avatar (multipart, JPG/PNG/WebP, máx 2 MB)
 *   Seguridad -> PUT /profile/password (revoca sesiones -> re-login)
 * ============================================================ */

export function AdminProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setSessionUser = useAuthStore((s) => s.setSessionUser)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileOk, setProfileOk] = useState(false)

  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    profileService
      .get()
      .then((p) => {
        if (!active) return
        setFirstName(p.first_name)
        setLastName(p.last_name)
        setPhone(p.phone)
        setEmail(p.email)
        setAvatarUrl(p.avatar_url)
      })
      .catch((err) => active && setProfileError(formatBackendError(err)))
    return () => { active = false }
  }, [])

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarSaving(true)
    setAvatarError(null)
    try {
      const updated = await profileService.updateAvatar(file)
      setAvatarUrl(updated.avatar_url)
      setSessionUser(updated) // refresca el avatar del sidebar
    } catch (err) {
      setAvatarError(formatBackendError(err))
    } finally {
      setAvatarSaving(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    setProfileOk(false)
    try {
      const updated = await profileService.update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      if (user) setSessionUser(updated)
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
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }
    setPasswordSaving(true)
    try {
      await profileService.changePassword({ current_password: currentPassword, new_password: newPassword })
      await authService.logoutAndClear()
      navigate('/login')
    } catch (err) {
      setPasswordError(formatBackendError(err))
      setPasswordSaving(false)
    }
  }

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`
  const avatarSrc = assetUrl(avatarUrl)

  return (
    <PageContainer title="Mi Perfil" description="Actualizá tus datos, tu foto y tu contraseña de acceso.">
      <div className="flex flex-col gap-5">
        {/* Foto de perfil */}
        <SettingsSection icon={<User size={20} />} title="Foto de Perfil">
          {avatarError && (
            <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{avatarError}</div>
          )}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-100 flex items-center justify-center flex-shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading text-section-title font-semibold text-surface-400">{initials}</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()} isLoading={avatarSaving}>
                <Camera size={16} /> Cambiar foto
              </Button>
              <p className="mt-2 text-small text-surface-400">JPG, PNG o WebP. Máx 2 MB.</p>
            </div>
          </div>
        </SettingsSection>

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
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" form="profile-form" variant="danger" size="md" isLoading={profileSaving}>
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
                Al cambiar la contraseña se cierra la sesión en todos los dispositivos y tendrás que volver a iniciar sesión.
              </span>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" form="password-form" variant="secondary" size="md" isLoading={passwordSaving}>
                Cambiar Contraseña
              </Button>
            </div>
          </SettingsSection>
        </form>
      </div>
    </PageContainer>
  )
}
