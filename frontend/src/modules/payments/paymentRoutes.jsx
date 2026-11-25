import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import PagosPage from '../../pages/pagos/PagosPage'
import PagosInternetPage from '../../pages/pagosInternet/PagosInternetPage'
import RecibosPage from '../../pages/recibos/RecibosPage.jsx'
import PagoQrPublicPage from '../../pages/pagosInternet/PagoQrPublicPage'

export const paymentPublicRoutes = (
  <Route
    path="/pago-qr/:token"
    element={<PagoQrPublicPage />}
  />
)

export const paymentRoutes = (
  <>
    <Route
      element={
        <ProtectedRoute
          permiso="pagos.ver"
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
  </>
)
