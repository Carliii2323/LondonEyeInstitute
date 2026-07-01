import { type FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import { formatBackendError } from '@/lib/formatBackendError'
import { AuthLayout } from './AuthLayout'
import { AuthTabs } from './AuthTabs'
import { Mail, Lock, IdCard, Phone, Send, Info } from 'lucide-react'
import type { ElementType } from 'react'
import registerHero from '@/assets/auth/register-hero.jpg'

export function RegisterPage() {
  const navigate = useNavigate()
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.target as HTMLFormElement)
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      await authService.register({
        email: String(form.get('email') ?? ''),
        password,
        first_name: String(form.get('firstName') ?? ''),
        last_name: String(form.get('lastName') ?? ''),
        dni: String(form.get('dni') ?? ''),
        phone: String(form.get('phone') ?? ''),
      })
      navigate('/solicitud-pendiente', { replace: true })
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
          <AuthField label="Nombre" name="firstName" placeholder="Ej. Juan" required />
          <AuthField label="Apellido" name="lastName" placeholder="Ej. Perez" required />
        </div>

        <AuthField label="DNI" name="dni" placeholder="Sin puntos ni guiones" required icon={IdCard} />
        <AuthField label="Correo Electronico" name="email" type="email" placeholder="usuario@londoneye.com" required icon={Mail} />
        <AuthField label="Telefono" name="phone" placeholder="Ej. +54 9 11 1234 5678" icon={Phone} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthField label="Contrasena" name="password" type="password" placeholder="Min. 8 caracteres" required icon={Lock} />
          <AuthField label="Confirmar" name="confirmPassword" type="password" placeholder="Repetir" required icon={Lock} />
        </div>

        <div className="flex items-start gap-2 rounded-button border border-royal-100 bg-royal-50/50 p-3">
          <Info size={18} className="text-royal-500 flex-shrink-0 mt-0.5" />
          <span className="text-small text-royal-700">Tu solicitud sera revisada por administracion antes de que puedas acceder al sistema. Recibiras un mail de confirmacion.</span>
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
}

function AuthField({ label, name, type = 'text', placeholder, required, icon: Icon }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-small font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />}
        <input
          id={name} name={name} type={type} placeholder={placeholder} required={required}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-input border border-surface-200 bg-surface-50/50 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 hover:border-surface-300`}
        />
      </div>
    </div>
  )
}
