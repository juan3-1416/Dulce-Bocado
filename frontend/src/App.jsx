import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout.jsx'
import AccesoDenegadoPage from './pages/AccesoDenegadoPage'
import InicioPage from './pages/InicioPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import SeguridadPage from './pages/SeguridadPage'
import UsuariosPage from './pages/seguridad/UsuariosPage';
import RolesPage from './pages/seguridad/RolesPage';
function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/acceso-denegado"
        element={<AccesoDenegadoPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route
            index
            element={<InicioPage />}
          />

          <Route
            element={
              <ProtectedRoute permiso="seguridad.gestionar_usuario" />
            }
          >
            <Route
              path="seguridad/usuarios"
              element={<UsuariosPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="seguridad.gestionar_rol" />
            }
          >
            <Route
              path="seguridad/roles"
              element={<RolesPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="seguridad.gestionar_permiso" />
            }
          >
            <Route
              path="seguridad/permisos"
              element={<SeguridadPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="seguridad.gestionar_rol_permiso" />
            }
          >
            <Route
              path="seguridad/rol-permiso"
              element={<SeguridadPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="seguridad.asignar_roles_permisos" />
            }
          >
            <Route
              path="seguridad/asignaciones"
              element={<SeguridadPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}

export default App