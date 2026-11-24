import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import ClientesPage from '../../pages/clientes/ClientesPage'

export const customerRoutes = (
  <Route
    element={
      <ProtectedRoute
        permiso="clientes.ver"
      />
    }
  >
    <Route
      path="clientes"
      element={<ClientesPage />}
    />
  </Route>
)
