import { Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import ProductosPage from '../../pages/productos/ProductosPage'
import RecetasPage from '../../pages/recetas/RecetasPage'
import MateriasPrimasPage from '../../pages/recetas/MateriasPrimasPage'

export const catalogRoutes = (
  <>
    <Route
      element={
        <ProtectedRoute
          permiso="catalogo.ver"
        />
      }
    >
      <Route
        path="productos"
        element={<ProductosPage />}
      />
    </Route>

    <Route
      element={
        <ProtectedRoute
          permiso="recetas.ver"
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
  </>
)
