import { type ChangeEvent, type ElementType, type FormEvent, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import { formatBackendError } from '@/lib/formatBackendError'
import { AuthLayout } from './AuthLayout'
import { AuthTabs } from './AuthTabs'
import { Mail, Lock, IdCard, Phone, Send, Info, Calendar, MapPin, UserRound, Upload } from 'lucide-react'
import registerHero from '@/assets/auth/register-hero.jpg'

/** true si la fecha (YYYY-MM-DD) corresponde a un menor de 18 anios hoy. */
function isMinorFrom(iso: string): boolean {
  if (!iso) return false
  const bd = new Date(iso)
  if (Number.isNaN(bd.getTime())) return false
  const now = new Date()
  let age = now.getFullYear() - bd.getFullYear()
  const m = now.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--
  return age < 18
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [dniFileName, setDniFileName] = useState('')

  const minor = useMemo(() => isMinorFrom(birthDate), [birthDate])
  const todayISO = new Date().toISOString().slice(0, 10)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.target as HTMLFormElement)
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirm_password') ?? '')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    const dniFront = form.get('dni_front')
    if (!(dniFront instanceof File) || dniFront.size === 0) {
      setError('Adjunta una foto o PDF del frente de tu DNI.')
      return
    }

    if (minor && (!String(form.get('tutor_name') ?? '').trim() || !String(form.get('tutor_phone') ?? '').trim())) {
      setError('Como sos menor de edad, el nombre y teléfono del tutor son obligatorios.')
      return
    }

    const email = String(form.get('email') ?? '')

    // multipart: campos del alumno + el frente del DNI. Nombres = campos del backend.
    const payload = new FormData()
    payload.append('email', email)
    payload.append('password', password)
    payload.append('first_name', String(form.get('first_name') ?? ''))
    payload.append('last_name', String(form.get('last_name') ?? ''))
    payload.append('dni', String(form.get('dni') ?? ''))
    payload.append('phone', String(form.get('phone') ?? ''))
    payload.append('birth_date', String(form.get('birth_date') ?? ''))
    payload.append('address', String(form.get('address') ?? ''))
    payload.append('tutor_name', String(form.get('tutor_name') ?? ''))
    payload.append('tutor_phone', String(form.get('tutor_phone') ?? ''))
    payload.append('dni_front', dniFront)

    setSubmitting(true)
    try {
      await authService.register(payload)
      navigate('/solicitud-pendiente', { replace: true, state: { email } })
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout imageSrc={registerHero}>
      <AuthTabs />

      <div className="mb-5">
        <h1 className="font-heading text-page-title text-surface-900">Crear cuenta</h1>
        <p className="text-body text-surface-500 mt-1">Completa tus datos para solicitar acceso.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthField label="Nombre" name="first_name" placeholder="Ej. Juan" required />
          <AuthField label="Apellido" name="last_name" placeholder="Ej. Perez" required />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthField label="DNI" name="dni" placeholder="Sin puntos ni guiones" required icon={IdCard} />
          <AuthField
            label="Fecha de nacimiento" name="birth_date" type="date" placeholder="" required icon={Calendar}
            max={todayISO} value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <AuthField label="Correo Electronico" name="email" type="email" placeholder="usuario@londoneye.com" required icon={Mail} />
        <AuthField label="Telefono" name="phone" placeholder="Ej. +54 9 261 123 4567" required icon={Phone} />
        <AuthField label="Direccion" name="address" placeholder="Calle, numero, ciudad" required icon={MapPin} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthField label={minor ? 'Tutor (nombre)' : 'Tutor (opcional)'} name="tutor_name" placeholder="Nombre del tutor" required={minor} icon={UserRound} />
          <AuthField label={minor ? 'Tutor (telefono)' : 'Tutor tel. (opcional)'} name="tutor_phone" placeholder="Telefono del tutor" required={minor} icon={Phone} />
        </div>
        {minor && (
          <p className="-mt-1.5 text-small text-royal-600">Sos menor de edad: los datos del tutor son obligatorios.</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthField label="Contrasena" name="password" type="password" placeholder="Min. 8 caracteres" required icon={Lock} />
          <AuthField label="Confirmar" name="confirm_password" type="password" placeholder="Repetir" required icon={Lock} />
        </div>

        <FileField
          label="Frente del DNI"
          name="dni_front"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          fileName={dniFileName}
          onChange={(e) => setDniFileName(e.target.files?.[0]?.name ?? '')}
        />

        <div className="flex items-start gap-2 rounded-button border border-royal-100 bg-royal-50/50 p-3">
          <Info size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
          <span className="text-small text-royal-700">Te enviaremos un mail para verificar tu direccion. Ademas, administracion debe aprobar tu cuenta antes de que puedas acceder.</span>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 py-3 rounded-button bg-accent-500 text-white font-medium hover:bg-accent-600 active:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Enviando...' : <><span>Enviar Solicitud</span> <Send size={18} /></>}
        </button>
      </form>

      <p className="mt-5 text-center text-body text-surface-500">
        Ya tenes cuenta?{' '}
        <Link to="/login" className="font-medium text-royal-500 hover:text-royal-600 transition-colors">Inicia sesion</Link>
      </p>
    </AuthLayout>
  )
}

interface AuthFieldProps {
  label: string
  name: string
  type?: string
  placeholder: string
  required?: boolean
  icon?: ElementType
  max?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

function AuthField({ label, name, type = 'text', placeholder, required, icon: Icon, max, value, onChange }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-small font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />}
        <input
          id={name} name={name} type={type} placeholder={placeholder} required={required}
          max={max} value={value} onChange={onChange}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-input border border-surface-200 bg-surface-50/50 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 hover:border-surface-300`}
        />
      </div>
    </div>
  )
}

interface FileFieldProps {
  label: string
  name: string
  accept: string
  fileName: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

function FileField({ label, name, accept, fileName, onChange }: FileFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-small font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
      <label htmlFor={name} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-input border border-dashed border-surface-300 bg-surface-50/50 text-body text-surface-600 cursor-pointer hover:border-royal-500 hover:bg-royal-50/40 transition-colors">
        <Upload size={18} className="text-surface-400 flex-shrink-0" />
        <span className="truncate">{fileName || 'Subir foto o PDF del frente (max. 5 MB)'}</span>
      </label>
      <input id={name} name={name} type="file" accept={accept} onChange={onChange} className="sr-only" />
    </div>
  )
}
