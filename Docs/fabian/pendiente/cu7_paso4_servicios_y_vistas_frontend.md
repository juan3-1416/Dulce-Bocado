# CU7 — Paso 4: Servicios y Vistas Frontend (React + Tailwind CSS)

Este documento especifica la creación de los servicios API y la interfaz de usuario en React para la gestión de productos, presentaciones y categorías del **CU7: Gestionar Productos y Presentaciones**.

---

## 1. Archivos a Crear / Modificar

| Acción | Ruta del Archivo | Propósito |
| :--- | :--- | :--- |
| **[CREAR]** | `frontend/src/services/categoriaService.js` | Funciones de comunicación HTTP para categorías. |
| **[CREAR]** | `frontend/src/services/productoService.js` | Funciones de comunicación HTTP para productos. |
| **[CREAR]** | `frontend/src/services/presentacionService.js` | Funciones de comunicación HTTP para presentaciones y precios. |
| **[CREAR]** | `frontend/src/pages/productos/ProductosPage.jsx` | Vista principal del catálogo con filtros y listado. |
| **[CREAR]** | `frontend/src/pages/productos/ProductoModal.jsx` | Modal responsivo para crear y editar productos. |
| **[CREAR]** | `frontend/src/pages/productos/CategoriasModal.jsx` | Modal interactivo para administrar categorías sin abandonar la vista. |
| **[CREAR]** | `frontend/src/pages/productos/PresentacionesModal.jsx` | Modal/Drawer para gestionar presentaciones (precio, nombre, personalización y estado). |
| **[MODIFICAR]** | `frontend/src/App.jsx` | Registro de la ruta `/productos` bajo `ProtectedRoute`. |

---

## 2. Servicios API (`frontend/src/services/`)

Siguen el patrón de CSRF y Sanctum del proyecto (`credentials: 'include'` y token `X-XSRF-TOKEN`).

### 2.1. `categoriaService.js`
- `listarCategorias(params = {})`: `GET /api/productos/categorias`
- `crearCategoria(datos)`: `POST /api/productos/categorias`
- `actualizarCategoria(id, datos)`: `PUT /api/productos/categorias/{id}`

### 2.2. `productoService.js`
- `listarProductos(filtros = {})`: `GET /api/productos?buscar=...&categoria_id=...&activo=...`
- `obtenerProducto(id)`: `GET /api/productos/{id}`
- `crearProducto(datos)`: `POST /api/productos`
- `actualizarProducto(id, datos)`: `PUT /api/productos/{id}`
- `cambiarEstadoProducto(id, activo)`: `PATCH /api/productos/{id}/estado`

### 2.3. `presentacionService.js`
- `listarPresentaciones(filtros = {})`: `GET /api/productos/presentaciones?producto_id=...`
- `crearPresentacion(datos)`: `POST /api/productos/presentaciones`
- `actualizarPresentacion(id, datos)`: `PUT /api/productos/presentaciones/{id}`
- `cambiarEstadoPresentacion(id, activo)`: `PATCH /api/productos/presentaciones/{id}/estado`

---

## 3. Componentes de UI (`frontend/src/pages/productos/`)

### 3.1. `ProductosPage.jsx`
- **Encabezado y Acciones:** Título del módulo, resumen de productos registrados y botones para:
  - *Nueva Categoría / Gestionar Categorías* (abre `CategoriasModal`).
  - *Nuevo Producto* (abre `ProductoModal`).
- **Barra de Filtros:**
  - Input de búsqueda en tiempo real (filtra por nombre o descripción).
  - Select para filtrar por Categoría.
  - Select para filtrar por Estado (Todos, Activos, Inactivos).
- **Listado Dinámico:**
  - Tabla estilizada con Tailwind con columnas: ID, Nombre, Categoría, Presentaciones Asociadas (con badge contador), Estado (badge verde/rojo) y Acciones.
  - Botón *"Ver / Gestionar Presentaciones"* que abre `PresentacionesModal` para el producto seleccionado.
  - Botón *"Editar Producto"*.
  - Botón *"Activar / Desactivar"*.

### 3.2. `PresentacionesModal.jsx` (Gestión de Presentaciones y Precios)
- **Contexto:** Muestra el nombre del producto seleccionado y su categoría.
- **Formulario de Registro / Edición:**
  - Nombre de la presentación (ej. *"Porción individual"*, *"Torta 1 Kg"*).
  - Precio en Bolivianos (campo numérico con validación `> 0`).
  - Switch o Checkbox: *Permite personalización* (decoración, mensaje especial).
  - Descripción opcional.
- **Tabla de Presentaciones:**
  - Muestra las presentaciones existentes del producto con sus precios y estado.
  - Botón de edición rápida.
  - Toggle de activación / desactivación.

### 3.3. `CategoriasModal.jsx`
- Permite crear y editar categorías directamente sin tener que salir de la pantalla de productos.

---

## 4. Integración en Rutas (`frontend/src/App.jsx`)

Agregar la ruta protegida dentro de `MainLayout`:

```jsx
import ProductosPage from './pages/productos/ProductosPage'

// Dentro de las rutas protegidas:
<Route
  element={
    <ProtectedRoute permiso="productos.gestionar_producto" />
  }
>
  <Route
    path="productos"
    element={<ProductosPage />}
  />
</Route>
```

> [!NOTE]
> En `Sidebar.jsx`, el ítem de navegación para `Productos y Presentaciones` (`/productos`) ya se encuentra preconfigurado bajo la sección **Catálogo y Recetas** con el permiso `productos.gestionar_producto`, por lo que aparecerá automáticamente en cuanto el usuario tenga dicho permiso activo.

---

## 5. Criterios de Aceptación y Verificación

1. La vista `/productos` carga correctamente tras iniciar sesión como Administrador.
2. Los filtros por categoría y búsqueda funcionan sin recargar la página.
3. Se pueden agregar y editar presentaciones con precios numéricos mayores a 0.
4. El indicador de personalización se guarda y refleja adecuadamente en la interfaz.

> **Alto:** Una vez implementado el frontend, proceder con el **Paso 5 (Pruebas y Cierre)**.
