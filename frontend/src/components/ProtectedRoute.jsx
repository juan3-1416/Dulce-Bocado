import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ permiso = null }) {
  const {
    autenticado,
    verificandoSesion,
    tienePermiso,
  } = useAuth()

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

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  if (permiso && !tienePermiso(permiso)) {
    return <Navigate to="/acceso-denegado" replace />
  }

  return <Outlet />
}

export default ProtectedRoute