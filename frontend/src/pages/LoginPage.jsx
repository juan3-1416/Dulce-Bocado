import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const {
    autenticado,
    verificandoSesion,
    login,
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (verificandoSesion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Verificando sesión...
        </p>
      </main>
    )
  }

  if (autenticado) {
    return <Navigate to="/" replace />
  }

  const manejarSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setCargando(true)

    try {
      await login(nombreUsuario, contrasena)

      const destino =
        location.state?.desde?.pathname || '/'

      navigate(destino, { replace: true })
    } catch (errorLogin) {
      if (errorLogin.status === 401) {
        const restantes =
          errorLogin.data?.intentos_restantes

        if (typeof restantes === 'number') {
          setError(
            `Credenciales incorrectas. Intentos restantes: ${restantes}.`,
          )
        } else {
          setError(
            'El usuario o la contraseña son incorrectos.',
          )
        }
      } else if (errorLogin.status === 423) {
        setError(
          'El usuario está bloqueado temporalmente.',
        )
      } else if (errorLogin.status === 403) {
        setError(
          'El usuario se encuentra inactivo.',
        )
      } else if (errorLogin.status === 422) {
        setError(
          'Revisa los datos ingresados.',
        )
      } else {
        setError(
          errorLogin.message ||
            'No se pudo conectar con el servidor.',
        )
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <span className="inline-block rounded-full bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-700">
            Dulce Bocado
          </span>

          <h1 className="mt-5 text-3xl font-bold text-slate-800">
            Iniciar sesión
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sistema de gestión de ventas, pedidos,
            producción e inventario
          </p>
        </div>

        <form
          className="mt-8 space-y-5"
          onSubmit={manejarSubmit}
        >
          <div>
            <label
              htmlFor="nombre_usuario"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nombre de usuario
            </label>

            <input
              id="nombre_usuario"
              type="text"
              value={nombreUsuario}
              onChange={(event) =>
                setNombreUsuario(event.target.value)
              }
              autoComplete="username"
              maxLength={80}
              required
              disabled={cargando}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label
              htmlFor="contrasena"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>

            <input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(event) =>
                setContrasena(event.target.value)
              }
              autoComplete="current-password"
              required
              disabled={cargando}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-pink-600 px-4 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
          >
            {cargando
              ? 'Ingresando...'
              : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage