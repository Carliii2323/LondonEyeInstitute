import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authService } from '@/services/authService'
import { formatBackendError } from '@/lib/formatBackendError'
import { BookOpen, GraduationCap, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

/* ============================================================
 * VerifyEmailPage — Confirmacion de email (F1)
 *
 * Lee ?token= del link del mail y llama a POST /auth/verify-email.
 * No activa la cuenta: el admin sigue aprobando.
 * ============================================================ */

type Status = 'loading' | 'ok' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return // evita doble llamada en StrictMode
    done.current = true

    if (!token) {
      setStatus('error')
      setMessage('El link no es valido: falta el token de verificacion.')
      return
    }

    authService
      .verifyEmail(token)
      .then((res) => {
        setStatus('ok')
        setMessage(res.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(formatBackendError(err))
      })
  }, [token])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4">
      <div className="flex items-center gap-2 mb-8">
        <BookOpen size={20} className="text-navy-500" />
        <span className="font-heading font-bold text-body text-navy-500">London Eye</span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-card shadow-card p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <GraduationCap size={24} className="text-navy-500" />
          <span className="font-heading font-bold text-body text-surface-900">London Eye</span>
        </div>
        <p className="text-small text-surface-400 uppercase tracking-wider mb-6">Verificacion de cuenta</p>

        <div className="border-t border-surface-100 pt-6" />

        {status === 'loading' && (
          <div className="py-4">
            <div className="flex justify-center mb-4">
              <Loader2 size={48} className="text-royal-500 animate-spin" />
            </div>
            <h1 className="font-heading text-page-title text-surface-900">Verificando tu email...</h1>
          </div>
        )}

        {status === 'ok' && (
          <div className="py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <h1 className="font-heading text-page-title text-surface-900">Email verificado</h1>
            <p className="text-body text-surface-500 mt-3 max-w-sm mx-auto">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="flex justify-center mb-4">
              <XCircle size={48} className="text-accent-500" />
            </div>
            <h1 className="font-heading text-page-title text-surface-900">No pudimos verificar</h1>
            <p className="text-body text-surface-500 mt-3 max-w-sm mx-auto">{message}</p>
          </div>
        )}

        <div className="mt-8">
          <Link to="/login" className="text-body font-semibold text-navy-500 hover:text-navy-600 transition-colors">
            Ir al inicio de sesion
          </Link>
        </div>
      </div>
    </div>
  )
}
