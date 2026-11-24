import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import VentasPage from '../../pages/ventas/VentasPage'

export const salesRoutes = (
  <Route
    element={
      <ProtectedRoute
        permiso="ventas.ver"
      />
    }
  >
    <Route
      path="ventas"
      element={<VentasPage />}
    />
  </Route>
)
