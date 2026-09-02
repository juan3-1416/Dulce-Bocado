# Plan de Implementación: CU7 — Gestionar Productos y Presentaciones

Este documento define la arquitectura, modelo de base de datos, endpoints del backend y componentes del frontend para la implementación del **Caso de Uso 7 (CU7): Gestionar Productos y Presentaciones**, cumpliendo rigurosamente con las reglas de negocio de [AGENTS.md](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/AGENTS.md).

---

## 1. Contexto y Reglas de Negocio Oficiales

### 1.1. Reglas de Negocio (Módulo Productos y Presentaciones)
* **Separación de entidades:** Un producto puede tener una o varias presentaciones. **No se debe fusionar `Producto` y `Presentación` en una sola tabla.**
* **Presentaciones independientes:** Cada presentación posee su propio precio, estado de disponibilidad (`activo`), descripción y flag de personalización opcional (`permite_personalizacion`).
* **Personalización:** Permite indicar si una presentación admite personalización de decoración, mensajes o costos adicionales (utilizado posteriormente en CU10 Ventas y CU14 Pedidos).
* **Integración con otros módulos:**
  * En **CU9 (Recetas)**: Cada receta se asociará a una `Presentacion`.
  * En **CU18 (Inventario/Almacenes)**: El stock de producto terminado en mostrador se controla por `Presentacion`.
  * En **CU10 (Ventas) y CU14 (Pedidos)**: Se venden y cotizan `Presentaciones`.

---

## 2. Modelo de Base de Datos y Migraciones

> [!IMPORTANT]
> **Regla de oro de BD:** Nunca se modifican migraciones históricas ya ejecutadas. Se crearán migraciones nuevas siguiendo el orden cronológico.

### 2.1. Nueva Migración: `categorias`
Tabla para clasificar y organizar los productos (ej. *Tortas, Postres Fríos, Galletas, Panadería, Bebidas*):
* `id_categoria` (bigIncrements, PK)
* `nombre` (string(100), unique)
* `descripcion` (string(255), nullable)
* `activo` (boolean, default true)
* `fecha_creacion` (timestamp)
* `fecha_actualizacion` (timestamp)

### 2.2. Nueva Migración: `productos`
* `id_producto` (bigIncrements, PK)
* `categoria_id` (bigInteger, FK -> `categorias.id_categoria`, onDelete restrict)
* `nombre` (string(150))
* `descripcion` (text, nullable)
* `activo` (boolean, default true)
* `fecha_creacion` (timestamp)
* `fecha_actualizacion` (timestamp)

### 2.3. Nueva Migración: `presentaciones`
* `id_presentacion` (bigIncrements, PK)
* `producto_id` (bigInteger, FK -> `productos.id_producto`, onDelete cascade)
* `nombre` (string(150), ej. *"Porción Individual"*, *"Torta Entera 1 Kg"*, *"Caja x 6 unidades"*, *"Molde Grande 24 cm"*)
* `descripcion` (text, nullable)
* `precio` (decimal(10, 2), unsigned, > 0)
* `permite_personalizacion` (boolean, default false)
* `activo` (boolean, default true)
* `fecha_creacion` (timestamp)
* `fecha_actualizacion` (timestamp)

---

## 3. Seguridad y Permisos RBAC

Se creará un seeder (`ProductosInicialSeeder.php`) para registrar los nuevos permisos base y asignarlos a los roles autorizados:
* `productos.gestionar_producto`: Permite crear, editar, listar y cambiar estado de productos y categorías.
* `productos.gestionar_presentacion`: Permite crear, editar, listar y cambiar estado de presentaciones.

**Asignación inicial de permisos:**
* **Administrador:** Acceso total a `productos.gestionar_producto` y `productos.gestionar_presentacion`.
* **Vendedor / Producción:** Permiso de consulta o gestión según corresponda.

---

## 4. Backend (Laravel API REST)

### 4.1. Modelos Eloquent (`backend/app/Models/`)
* [`Categoria.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Models/Categoria.php): Relación `hasMany(Producto::class)`.
* [`Producto.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Models/Producto.php): Relación `belongsTo(Categoria::class)` y `hasMany(Presentacion::class)`.
* [`Presentacion.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Models/Presentacion.php): Relación `belongsTo(Producto::class)`.

### 4.2. Form Requests (`backend/app/Http/Requests/Productos/`)
* **Categorías:** `StoreCategoriaRequest.php`, `UpdateCategoriaRequest.php`.
* **Productos:** `StoreProductoRequest.php`, `UpdateProductoRequest.php`, `UpdateEstadoProductoRequest.php`.
* **Presentaciones:** `StorePresentacionRequest.php`, `UpdatePresentacionRequest.php`, `UpdateEstadoPresentacionRequest.php`.

### 4.3. Controladores (`backend/app/Http/Controllers/Api/Productos/`)
* **`CategoriaController.php`:** CRUD básico de categorías y catálogo para selects.
* **`ProductoController.php`:**
  * `index(Request $request)`: Listado con búsqueda por nombre, filtro por categoría y estado `activo`, incluyendo conteo de presentaciones.
  * `show(int $id)`: Detalle del producto con su categoría y listado de presentaciones asociadas.
  * `store(StoreProductoRequest $request)`: Registro de nuevo producto.
  * `update(UpdateProductoRequest $request, int $id)`: Actualización de datos del producto.
  * `updateEstado(UpdateEstadoProductoRequest $request, int $id)`: Activación / Desactivación.
* **`PresentacionController.php`:**
  * `index(Request $request)`: Listado filtrable por `producto_id`.
  * `store(StorePresentacionRequest $request)`: Creación de presentación vinculada a un producto.
  * `update(UpdatePresentacionRequest $request, int $id)`: Edición de nombre, precio, descripción y personalización.
  * `updateEstado(UpdateEstadoPresentacionRequest $request, int $id)`: Activación / Desactivación.

### 4.4. Rutas (`backend/routes/api.php`)
Grupo protegido bajo middleware `['auth:sanctum']` con prefijo `/productos`:
```
GET    /api/productos/categorias
POST   /api/productos/categorias
PUT    /api/productos/categorias/{id}

GET    /api/productos
POST   /api/productos
GET    /api/productos/{id}
PUT    /api/productos/{id}
PATCH  /api/productos/{id}/estado

GET    /api/productos/presentaciones
POST   /api/productos/presentaciones
GET    /api/productos/presentaciones/{id}
PUT    /api/productos/presentaciones/{id}
PATCH  /api/productos/presentaciones/{id}/estado
```

---

## 5. Frontend (React + Tailwind CSS)

### 5.1. Servicios (`frontend/src/services/`)
* `categoriaService.js`: Funciones REST para consultar y gestionar categorías.
* `productoService.js`: Funciones REST para consultar, crear, editar y cambiar estado de productos.
* `presentacionService.js`: Funciones REST para gestionar presentaciones asociadas a productos.

### 5.2. Vistas y Componentes (`frontend/src/pages/productos/`)
* **`ProductosPage.jsx`:**
  * Vista principal con barra de herramientas (Buscador en tiempo real, filtro por categoría, filtro por estado activo/inactivo).
  * Botón "Nuevo Producto" con modal responsivo para crear/editar productos y seleccionar categoría.
  * Tabla / Grid de tarjetas de productos mostrando: Nombre, Categoría, Estado, Cantidad de presentaciones y botón para ver/gestionar presentaciones.
* **`DetalleProductoModal.jsx` / `PresentacionesModal.jsx`:**
  * Modal drawer o modal interactivo que permite ver y gestionar las presentaciones del producto seleccionado:
    * Formulario rápido para agregar nueva presentación (Nombre, Precio en Bs., Permite personalización, Descripción).
    * Tabla de presentaciones existentes con edición en línea o modal de edición, cambio de estado (Activa / Inactiva) y precios.
* **`CategoriasModal.jsx`:**
  * Modal accesible desde la vista de productos para administrar el catálogo de categorías sin salir del módulo.

### 5.3. Navegación y Menú
* **`MainLayout.jsx`:** Agregar la sección **Productos** en la barra de navegación lateral cuando el usuario posea el permiso `productos.gestionar_producto`.
* **`App.jsx`:** Registrar las rutas `/productos` protegidas con `ProtectedRoute`.

---

## 6. Plan de Verificación

### Backend
1. **Migraciones:** Ejecutar `php artisan migrate` y verificar en PostgreSQL la creación correcta de `categorias`, `productos` y `presentaciones` con sus llaves foráneas e índices.
2. **Seeders:** Ejecutar el seeder y verificar que el Administrador reciba automáticamente los permisos del módulo `productos`.
3. **Validaciones:**
   * Intentar registrar una presentación con precio <= 0 o negativo (debe fallar con 422).
   * Intentar registrar un producto con una categoría inexistente (422).
   * Probar cambio de estado (PATCH) en productos y presentaciones.
   * Probar acceso sin token / sesión Sanctum (401) y sin permiso (403).

### Frontend
1. Iniciar sesión como Administrador en `http://localhost:5173`.
2. Verificar que en la barra lateral aparezca el nuevo módulo **Productos**.
3. Crear categorías de prueba (ej. *Tortas*, *Postres*).
4. Crear un producto (ej. *Torta Selva Negra*).
5. Agregarle presentaciones (ej. *Porción*, *Torta 1 Kg*, *Torta 2 Kg Personalizada*).
6. Editar precios y verificar actualización en tiempo real en la tabla.
7. Desactivar y activar presentaciones y productos comprobando los badges visuales.
