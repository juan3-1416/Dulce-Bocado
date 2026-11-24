import { Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import AlmacenList from '../../pages/inventario/AlmacenList'
import ExistenciaList from '../../pages/inventario/ExistenciaList'
import MovimientoInventarioPage from '../../pages/inventario/MovimientoInventarioPage'

export const inventoryRoutes = (
  <>
    {/* CU18 - ALMACENES Y EXISTENCIAS */}
    <Route
      element={
        <ProtectedRoute
          permiso="inventario.ver"
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

    {/* CU19 - INGRESOS DE INVENTARIO */}
    <Route
      element={
        <ProtectedRoute
          permiso="inventario.ingresar"
        />
      }
    >
      <Route
        path="inventario/ingresos"
        element={<MovimientoInventarioPage key="ingreso" modo="INGRESO" />}
      />
      <Route
        path="inventario/ingresos/crear"
        element={<Navigate to="/inventario/ingresos" replace />}
      />
      <Route
        path="inventario/ingresos/:id"
        element={<Navigate to="/inventario/ingresos" replace />}
      />
    </Route>

    {/* CU20 - EGRESOS DE INVENTARIO */}
    <Route
      element={
        <ProtectedRoute
          permiso="inventario.egresar"
        />
      }
    >
      <Route
        path="inventario/egresos"
        element={<MovimientoInventarioPage key="egreso" modo="EGRESO" />}
      />
      <Route
        path="inventario/egresos/crear"
        element={<Navigate to="/inventario/egresos" replace />}
      />
      <Route
        path="inventario/egresos/:id"
        element={<Navigate to="/inventario/egresos" replace />}
      />
    </Route>

    {/* TRASLADOS */}
    <Route element={<ProtectedRoute permiso="inventario.trasladar" />}>
      <Route path="inventario/traslados" element={<MovimientoInventarioPage key="traslado" modo="TRASLADO" />} />
    </Route>
  </>
)
