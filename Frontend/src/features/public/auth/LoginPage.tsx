import { type FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { formatBackendError } from '@/lib/formatBackendError'
import { AuthLayout } from './AuthLayout'
import { AuthTabs } from './AuthTabs'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import loginHero from '@/assets/auth/login-hero.jpg'

/* ============================================================
 * LoginPage — Pantalla de inicio de sesion rediseñada
 *
 * Split layout con imagen de cabina telefonica a la izquierda.
 * Inputs con iconos inline, toggle de visibilidad de password.
 * ============================================================ */

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await authService.login(email, password)
      setUser(res.user, res.access_token, res.refresh_token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(formatBackendError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout imageSrc={loginHero}>
      <AuthTabs />

      <div className="mb-6">
        <h1 className="font-heading text-page-title text-surface-900">Bienvenido de vuelta</h1>
        <p className="text-body text-surface-500 mt-1">Ingresa tus datos para continuar.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-button bg-accent-50 border border-accent-200 text-small text-accent-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-small font-semibold text-surface-500 uppercase tracking-wider">Correo Electronico</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@london-eye.com" required className="w-full pl-10 pr-4 py-3 rounded-input border border-surface-200 bg-surface-50/50 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 hover:border-surface-300" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-small font-semibold text-surface-500 uppercase tracking-wider">Contrasena</label>
            <button type="button" className="text-small font-medium text-royal-500 hover:text-royal-600 transition-colors">Olvidaste tu contrasena?</button>
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contrasena" required className="w-full pl-10 pr-12 py-3 rounded-input border border-surface-200 bg-surface-50/50 text-body text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-500 hover:border-surface-300" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 py-3 rounded-button bg-accent-500 text-white font-medium hover:bg-accent-600 active:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {isSubmitting ? 'Cargando...' : <><span>Iniciar Sesion</span> <LogIn size={18} /></>}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-surface-200" />
        <span className="text-small text-surface-400">o</span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>

      <p className="text-center text-body text-surface-500">
        No tenes cuenta?{' '}
        <Link to="/registro" className="font-medium text-royal-500 hover:text-royal-600 transition-colors">Registrate aqui</Link>
      </p>
    </AuthLayout>
  )
}
