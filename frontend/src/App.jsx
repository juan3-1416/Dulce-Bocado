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

// Rutas modulares por dominio (espejo de los microservicios)
import { securityRoutes } from './modules/security/securityRoutes'
import { catalogRoutes } from './modules/catalog/catalogRoutes'
import { customerRoutes } from './modules/customers/customerRoutes'
import { salesRoutes } from './modules/sales/salesRoutes'
import { orderRoutes } from './modules/orders/orderRoutes'
import { paymentRoutes, paymentPublicRoutes } from './modules/payments/paymentRoutes'
import { productionRoutes } from './modules/production/productionRoutes'
import { inventoryRoutes } from './modules/inventory/inventoryRoutes'
import { reportRoutes } from './modules/reports/reportRoutes'

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/acceso-denegado"
        element={<AccesoDenegadoPage />}
      />

      {paymentPublicRoutes}

      {/* Rutas protegidas con Layout principal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route
            index
            element={<InicioPage />}
          />

          {/* Módulos de dominio */}
          {securityRoutes}
          {catalogRoutes}
          {customerRoutes}
          {salesRoutes}
          {orderRoutes}
          {paymentRoutes}
          {productionRoutes}
          {inventoryRoutes}
          {reportRoutes}
        </Route>
      </Route>

      {/* Fallback 404 */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}

export default App
