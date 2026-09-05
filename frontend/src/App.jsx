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
import PermisosPage from './pages/seguridad/PermisosPage';
import RolPermisoPage from './pages/seguridad/RolPermisoPage';
import AsignacionesPage from './pages/seguridad/AsignacionesPage';
import ProductosPage from './pages/productos/ProductosPage';
import ClientesPage from './pages/clientes/ClientesPage';
import RecetasPage from './pages/recetas/RecetasPage';
import MateriasPrimasPage from './pages/recetas/MateriasPrimasPage'
import VentasPage from './pages/ventas/VentasPage'

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
              element={<PermisosPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="seguridad.gestionar_rol_permiso" />
            }
          >
            <Route
              path="seguridad/rol-permiso"
              element={<RolPermisoPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="seguridad.asignar_roles_permisos" />
            }
          >
            <Route
              path="seguridad/asignaciones"
              element={<AsignacionesPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="productos.gestionar_producto" />
            }
          >
            <Route
              path="productos"
              element={<ProductosPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="clientes.gestionar_cliente" />
            }
          >
            <Route
              path="clientes"
              element={<ClientesPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="recetas.gestionar_receta" />
            }
          >
            <Route
              path="recetas"
              element={<RecetasPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="recetas.gestionar_receta" />
            }
          >
            <Route
              path="recetas/materias-primas"
              element={<MateriasPrimasPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute permiso="ventas.gestionar_venta" />
            }
          >
            <Route
              path="ventas"
              element={<VentasPage />}
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