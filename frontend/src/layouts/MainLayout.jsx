import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'

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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-bold text-pink-600">
              Dulce Bocado
            </p>
            <p className="text-xs text-slate-500">
              Sistema de Gestión
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {usuario?.nombre ?? 'Usuario'}
              </p>

              <p className="text-xs text-slate-500">
                {usuario?.roles?.length
                  ? usuario.roles.join(', ')
                  : 'Sin rol asignado'}
              </p>
            </div>

            <button
              type="button"
              onClick={manejarLogout}
              disabled={cerrandoSesion}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {cerrandoSesion
                ? 'Cerrando...'
                : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </header>

      {errorLogout && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorLogout}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[240px_1fr]">
        <Sidebar />

        <section>
          <Outlet />
        </section>
      </div>
    </div>
  )
}

export default MainLayout