import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import ThemeSelector from '../components/ThemeSelector'

function MainLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const [errorLogout, setErrorLogout] = useState('')

  const manejarLogout = async () => {
    setCerrandoSesion(true)
    setErrorLogout('')

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error(error)
      setErrorLogout('No se pudo cerrar la sesión.')
    } finally {
      setCerrandoSesion(false)
    }
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-theme-app">
      <header className="border-b border-theme-border-subtle bg-theme-surface">
        <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1 sm:flex-none">
            <div>
              <p className="text-lg font-bold text-pink-600">
                Dulce Bocado
              </p>
              <p className="text-xs text-theme-muted">
                Sistema de Gestión
              </p>
            </div>
          </div>

          <div className="flex min-w-0 w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4">
            {/* Selector de Tema y Modo (CU23) */}
            <ThemeSelector />

            <div className="hidden min-w-0 max-w-48 border-l border-theme-border-subtle pl-3 text-right md:block">
              <p className="truncate text-sm font-semibold text-theme-heading" title={usuario?.nombre ?? 'Usuario'}>
                {usuario?.nombre ?? 'Usuario'}
              </p>

              <p className="truncate text-xs text-theme-muted">
                {usuario?.roles?.length
                  ? usuario.roles.join(', ')
                  : 'Sin rol asignado'}
              </p>
            </div>

            <button
              type="button"
              onClick={manejarLogout}
              disabled={cerrandoSesion}
              className="min-h-10 shrink-0 rounded-lg border border-theme-border px-3 py-2 text-xs font-medium text-theme-body transition-colors hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-60 sm:text-sm"
            >
              {cerrandoSesion
                ? 'Cerrando...'
                : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </header>

      {errorLogout && (
        <div className="mx-auto w-full max-w-[1680px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorLogout}
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[1680px] min-w-0 flex-1 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:py-6">
        <Sidebar />

        <section className="min-w-0 max-w-full">
          <Outlet />
        </section>
      </div>

      <Footer />
    </div>
  )
}

export default MainLayout
