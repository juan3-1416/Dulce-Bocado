import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardPage from '../../pages/dashboard/DashboardPage'
import ReportesPage from '../../pages/reportes/ReportesPage'

export const reportRoutes = (
  <>
    {/* CU24 - CONSULTAR DASHBOARD */}
    <Route
      element={
        <ProtectedRoute
          permiso="dashboard.consultar"
        />
      }
    >
      <Route
        path="dashboard"
        element={<DashboardPage />}
      />
    </Route>

    {/* CU25 - GENERAR Y ENVIAR REPORTES */}
    <Route
      element={
        <ProtectedRoute
          permiso="reportes.generar"
        />
      }
    >
      <Route
        path="reportes"
        element={<ReportesPage />}
      />
    </Route>
  </>
)
