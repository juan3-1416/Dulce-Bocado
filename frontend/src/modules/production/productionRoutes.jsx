import { Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import ProduccionList from '../../pages/produccion/ProduccionList'
import ProduccionForm from '../../pages/produccion/ProduccionForm'

export const productionRoutes = (
  <>
    <Route
      element={
        <ProtectedRoute
          permiso="produccion.ver"
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

    {/* La ruta legada de consumo queda fuera del flujo de Sprint 3. */}
    <Route
      element={
        <ProtectedRoute
          permiso="produccion.registrar_consumo"
        />
      }
    >
      <Route
        path="produccion/consumo-desperdicio"
        element={<Navigate to="/produccion" replace />}
      />
    </Route>
  </>
)
