import { useEffect, useState } from 'react'
import InicioPage from './pages/InicioPage'
import LoginPage from './pages/LoginPage'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioAutenticado,
} from './services/authService'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const usuarioActual =
          await obtenerUsuarioAutenticado()

        setUsuario(usuarioActual)
      } catch (error) {
        console.error(
          'Error al verificar la sesión:',
          error,
        )

        setUsuario(null)
      } finally {
        setVerificandoSesion(false)
      }
    }

    verificarSesion()
  }, [])

  const manejarLogin = async (
    nombreUsuario,
    contrasena,
  ) => {
    const respuesta = await iniciarSesion(
      nombreUsuario,
      contrasena,
    )

    setUsuario(respuesta.usuario)
  }

  const manejarLogout = async () => {
    setCerrandoSesion(true)

    try {
      await cerrarSesion()
      setUsuario(null)
    } catch (error) {
      console.error(
        'Error al cerrar sesión:',
        error,
      )

      alert(
        'No se pudo cerrar la sesión correctamente.',
      )
    } finally {
      setCerrandoSesion(false)
    }
  }

  if (verificandoSesion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-slate-600">
            Verificando sesión...
          </p>
        </div>
      </main>
    )
  }

  if (!usuario) {
    return <LoginPage onLogin={manejarLogin} />
  }

  return (
    <InicioPage
      usuario={usuario}
      onLogout={manejarLogout}
      cerrandoSesion={cerrandoSesion}
    />
  )
}

export default App