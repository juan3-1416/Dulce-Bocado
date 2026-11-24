import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import UsuariosPage from '../../pages/seguridad/UsuariosPage'
import RolesPage from '../../pages/seguridad/RolesPage'
import PermisosPage from '../../pages/seguridad/PermisosPage'
import RolPermisoPage from '../../pages/seguridad/RolPermisoPage'
import AsignacionesPage from '../../pages/seguridad/AsignacionesPage'

export const securityRoutes = (
  <>
    <Route
      element={
        <ProtectedRoute
          permiso="seguridad.gestionar_usuario"
        />
      }
    >
      <Route
        path="seguridad/usuarios"
        element={<UsuariosPage />}
      />
    </Route>

    <Route
      element={
        <ProtectedRoute
          permiso="seguridad.gestionar_rol"
        />
      }
    >
      <Route
        path="seguridad/roles"
        element={<RolesPage />}
      />
    </Route>

    <Route
      element={
        <ProtectedRoute
          permiso="seguridad.gestionar_permiso"
        />
      }
    >
      <Route
        path="seguridad/permisos"
        element={<PermisosPage />}
      />
    </Route>

    <Route
      element={
        <ProtectedRoute
          permiso="seguridad.gestionar_rol_permiso"
        />
      }
    >
      <Route
        path="seguridad/rol-permiso"
        element={<RolPermisoPage />}
      />
    </Route>

    <Route
      element={
        <ProtectedRoute
          permiso="seguridad.asignar_roles_permisos"
        />
      }
    >
      <Route
        path="seguridad/asignaciones"
        element={<AsignacionesPage />}
      />
    </Route>
  </>
)
