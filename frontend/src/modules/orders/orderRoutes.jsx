import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import PedidosPage from '../../pages/pedidos/PedidosPage.jsx'

export const orderRoutes = (
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
)
