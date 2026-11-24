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
      <main className="flex min-h-screen items-center justify-center bg-theme-app px-6">
        <div role="status" className="flex items-center gap-3 rounded-xl border border-theme-border-subtle bg-theme-surface px-6 py-5 text-sm text-theme-body">
          <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border border-t-pink-600" />
          <p>Verificando sesión…</p>
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
