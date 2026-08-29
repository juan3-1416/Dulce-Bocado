import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function MainLayout() {
  const {
    usuario,
    logout,
    tienePermiso,
  } = useAuth()

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

  const opcionesSeguridad = [
    {
      nombre: 'Usuarios',
      ruta: '/seguridad/usuarios',
      permiso: 'seguridad.gestionar_usuario',
    },
    {
      nombre: 'Roles',
      ruta: '/seguridad/roles',
      permiso: 'seguridad.gestionar_rol',
    },
    {
      nombre: 'Permisos',
      ruta: '/seguridad/permisos',
      permiso: 'seguridad.gestionar_permiso',
    },
    {
      nombre: 'Rol - Permiso',
      ruta: '/seguridad/rol-permiso',
      permiso: 'seguridad.gestionar_rol_permiso',
    },
    {
      nombre: 'Asignaciones',
      ruta: '/seguridad/asignaciones',
      permiso: 'seguridad.asignar_roles_permisos',
    },
  ]

  const opcionesVisibles = opcionesSeguridad.filter(
    (opcion) => tienePermiso(opcion.permiso),
  )

  const claseEnlace = ({ isActive }) =>
    [
      'block rounded-lg px-4 py-2.5 text-sm font-medium transition',
      isActive
        ? 'bg-pink-100 text-pink-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ')

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

      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            <NavLink
              to="/"
              end
              className={claseEnlace}
            >
              Inicio
            </NavLink>

            {opcionesVisibles.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Seguridad
                </p>

                {opcionesVisibles.map((opcion) => (
                  <NavLink
                    key={opcion.ruta}
                    to={opcion.ruta}
                    className={claseEnlace}
                  >
                    {opcion.nombre}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {errorLogout && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorLogout}
            </div>
          )}
        </aside>

        <section>
          <Outlet />
        </section>
      </div>
    </div>
  )
}

export default MainLayout