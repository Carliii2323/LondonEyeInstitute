import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorScreen } from './ErrorScreen'

/* ============================================================
 * ErrorBoundary — Red final de toda la aplicacion (M8-01)
 *
 * En React 18 una excepcion no capturada durante el render desmonta el arbol
 * entero: el usuario queda con una PANTALLA EN BLANCO, sin mensaje y sin
 * navegacion. Esto lo evita.
 *
 * Tiene que ser una clase: React no tiene equivalente en hooks para
 * getDerivedStateFromError.
 *
 * Cubre lo que el router NO puede cubrir, que es la razon de que exista
 * ademas de los errorElement por area:
 *   - el bootstrap de sesion de App.tsx, que corre ANTES del RouterProvider
 *   - cualquier error del propio router al montarse
 *
 * Para errores DENTRO de una pantalla, el que responde primero es el
 * errorElement del area (ver AppRouter), que conserva el menu lateral.
 * ============================================================ */

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola del navegador: es lo unico que vamos a tener para
    // reconstruir que paso cuando alguien reporte una pantalla rota.
    console.error('[ErrorBoundary] error de render:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen fullScreen detail={this.state.error.message} />
    }
    return this.props.children
  }
}
