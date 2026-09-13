import {
  Route,
  Routes,
} from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout.jsx'

import AccesoDenegadoPage from './pages/AccesoDenegadoPage'
import InicioPage from './pages/InicioPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

import UsuariosPage from './pages/seguridad/UsuariosPage'
import RolesPage from './pages/seguridad/RolesPage'
import PermisosPage from './pages/seguridad/PermisosPage'
import RolPermisoPage from './pages/seguridad/RolPermisoPage'
import AsignacionesPage from './pages/seguridad/AsignacionesPage'

import ProductosPage from './pages/productos/ProductosPage'
import ClientesPage from './pages/clientes/ClientesPage'

import RecetasPage from './pages/recetas/RecetasPage'
import MateriasPrimasPage from './pages/recetas/MateriasPrimasPage'

import VentasPage from './pages/ventas/VentasPage'
import PagosPage from './pages/pagos/PagosPage'
import PagosInternetPage from './pages/pagosInternet/PagosInternetPage'
import RecibosPage from './pages/recibos/RecibosPage.jsx'
import PedidosPage from './pages/pedidos/PedidosPage.jsx'

import ProduccionList from './pages/produccion/ProduccionList'
import ProduccionForm from './pages/produccion/ProduccionForm'

import AlmacenList from './pages/inventario/AlmacenList'
import ExistenciaList from './pages/inventario/ExistenciaList'

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

          {/* SEGURIDAD */}

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

          {/* PRODUCTOS */}

          <Route
            element={
              <ProtectedRoute
                permiso="productos.gestionar_producto"
              />
            }
          >
            <Route
              path="productos"
              element={<ProductosPage />}
            />
          </Route>

          {/* CLIENTES */}

          <Route
            element={
              <ProtectedRoute
                permiso="clientes.gestionar_cliente"
              />
            }
          >
            <Route
              path="clientes"
              element={<ClientesPage />}
            />
          </Route>

          {/* RECETAS */}

          <Route
            element={
              <ProtectedRoute
                permiso="recetas.gestionar_receta"
              />
            }
          >
            <Route
              path="recetas"
              element={<RecetasPage />}
            />

            <Route
              path="recetas/materias-primas"
              element={<MateriasPrimasPage />}
            />
          </Route>

          {/* VENTAS */}

          <Route
            element={
              <ProtectedRoute
                permiso="ventas.gestionar_venta"
              />
            }
          >
            <Route
              path="ventas"
              element={<VentasPage />}
            />
          </Route>

          {/* PAGOS */}

          <Route
            element={
              <ProtectedRoute
                permiso="pagos.gestionar_pago"
              />
            }
          >
            <Route
              path="pagos"
              element={<PagosPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                permiso="pagos.gestionar_pago_internet"
              />
            }
          >
            <Route
              path="pagos-internet"
              element={<PagosInternetPage />}
            />
          </Route>

          {/* RECIBOS */}

          <Route
            element={
              <ProtectedRoute
                permiso="recibos.gestionar_recibo"
              />
            }
          >
            <Route
              path="recibos"
              element={<RecibosPage />}
            />
          </Route>

          {/* PEDIDOS */}

          <Route
            element={
              <ProtectedRoute
                permiso="pedidos.gestionar_pedido"
              />
            }
          >
            <Route
              path="pedidos"
              element={<PedidosPage />}
            />
          </Route>

          {/* CU16 - PRODUCCIÓN */}

          <Route
            element={
              <ProtectedRoute
                permiso="produccion.listar"
              />
            }
          >
            <Route
              path="produccion"
              element={<ProduccionList />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                permiso="produccion.crear"
              />
            }
          >
            <Route
              path="produccion/crear"
              element={<ProduccionForm />}
            />
          </Route>

          {/* CU17 - CONSUMO, COSTO Y DESPERDICIO */}

          <Route
            element={
              <ProtectedRoute
                permiso="produccion.registrar_consumo"
              />
            }
          >
            <Route
              path="produccion/consumo-desperdicio"
              element={<ProduccionList />}
            />
          </Route>

          {/* CU18 - ALMACENES Y EXISTENCIAS */}

          <Route
            element={
              <ProtectedRoute
                permiso="inventario.listar_almacenes"
              />
            }
          >
            <Route
              path="almacenes"
              element={<AlmacenList />}
            />
            <Route
              path="almacenes/:id/existencias"
              element={<ExistenciaList />}
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