import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioAutenticado,
} from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [verificandoSesion, setVerificandoSesion] =
    useState(true)

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

  const login = async (
    nombreUsuario,
    contrasena,
  ) => {
    const respuesta = await iniciarSesion({
      nombre_usuario: nombreUsuario,
      contrasena: contrasena,
    })

    setUsuario(respuesta.usuario)

    return respuesta
  }

  const logout = async () => {
    await cerrarSesion()
    setUsuario(null)
  }

  const tienePermiso = (permiso) => {
    if (
      !usuario ||
      !Array.isArray(usuario.permisos)
    ) {
      return false
    }

    return usuario.permisos.includes(permiso)
  }

  const valor = useMemo(
    () => ({
      usuario,
      verificandoSesion,
      autenticado: Boolean(usuario),
      login,
      logout,
      tienePermiso,
    }),
    [usuario, verificandoSesion],
  )

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)

  if (!contexto) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider.',
    )
  }

  return contexto
}