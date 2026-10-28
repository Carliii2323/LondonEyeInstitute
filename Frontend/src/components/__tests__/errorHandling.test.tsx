import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, Route, createRoutesFromElements, Outlet } from 'react-router-dom'
import { ErrorBoundary } from '../ErrorBoundary'
import { RouteError } from '../RouteError'

/*
M8-01 — que una pantalla rota no deje al usuario en blanco.

Lo que de verdad se verifica aca es la suposicion sobre la que se eligio el
diseño: poniendo el errorElement en una ruta SIN PATH que vive DENTRO del
layout, el error se renderiza en el <Outlet> y el MENU SOBREVIVE. Si eso no
fuera cierto, usar errorElement no tendria ninguna ventaja sobre envolver el
area en un ErrorBoundary comun.
*/

function LayoutConMenu() {
  return (
    <div>
      <nav>MENU-LATERAL</nav>
      <Outlet />
    </div>
  )
}

function PantallaQueExplota(): JSX.Element {
  throw new Error('explota a proposito')
}

function PantallaNormal() {
  return <p>contenido normal</p>
}

describe('M8-01 — manejo de errores de render', () => {
  beforeEach(() => {
    // React y el router loguean el error capturado; no ensucia la salida.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('el errorElement del area conserva el menu de navegacion', () => {
    const router = createMemoryRouter(
      createRoutesFromElements(
        <Route element={<LayoutConMenu />}>
          <Route errorElement={<RouteError />}>
            <Route path="/" element={<PantallaQueExplota />} />
          </Route>
        </Route>,
      ),
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    // La pantalla de error aparece...
    expect(screen.getByText('Algo salió mal')).toBeDefined()
    // ...Y EL MENU SIGUE AHI. Esta es la linea que justifica el diseño.
    expect(screen.getByText('MENU-LATERAL')).toBeDefined()
  })

  it('CONTRAEJEMPLO: con el errorElement en el layout, el menu se pierde', () => {
    // Misma app, unica diferencia: el errorElement esta en la ruta DEL LAYOUT
    // en vez de en una ruta sin path adentro. El error reemplaza al layout
    // entero y el usuario queda sin navegacion. Este test existe para que, si
    // alguien "simplifica" moviendo el errorElement un nivel para arriba, el
    // test de arriba falle y se entienda por que.
    const router = createMemoryRouter(
      createRoutesFromElements(
        <Route element={<LayoutConMenu />} errorElement={<RouteError />}>
          <Route path="/" element={<PantallaQueExplota />} />
        </Route>,
      ),
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByText('Algo salió mal')).toBeDefined()
    expect(screen.queryByText('MENU-LATERAL')).toBeNull() // <- se perdio la navegacion
  })

  it('una pantalla sana no muestra el error', () => {
    const router = createMemoryRouter(
      createRoutesFromElements(
        <Route element={<LayoutConMenu />}>
          <Route errorElement={<RouteError />}>
            <Route path="/" element={<PantallaNormal />} />
          </Route>
        </Route>,
      ),
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByText('contenido normal')).toBeDefined()
    expect(screen.queryByText('Algo salió mal')).toBeNull()
  })

  it('el ErrorBoundary global atrapa lo que pasa fuera del router', () => {
    render(
      <ErrorBoundary>
        <PantallaQueExplota />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Algo salió mal')).toBeDefined()
  })

  it('el ErrorBoundary global no estorba cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <PantallaNormal />
      </ErrorBoundary>,
    )

    expect(screen.getByText('contenido normal')).toBeDefined()
    expect(screen.queryByText('Algo salió mal')).toBeNull()
  })
})
