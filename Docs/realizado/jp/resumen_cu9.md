# Resumen Oficial — CU9: Gestionar Receta

**Estado:** ✅ COMPLETADO

Este documento consolida todo el trabajo realizado durante la implementación del Caso de Uso 9, garantizando su integración con la arquitectura actual del sistema, las reglas establecidas en `AGENTS.md` y los módulos previamente desarrollados de Productos y Presentaciones.

## 1. Base de Datos (Paso 1)

- **Migraciones:**

  - Se realizó una migración incremental sobre `producto_presentacion` para agregar:

    - `id_producto_presentacion` como clave primaria autoincremental.
    - Restricción `UNIQUE` sobre la combinación `id_producto` + `id_presentacion`.
    - Se mantuvieron las relaciones existentes, el precio y sus restricciones.

  - `materia_prima`:

    - `id_materia_prima`
    - `nombre`
    - `unidad_medida`
    - `descripcion`
    - `estado`
    - `fecha_creacion`
    - `fecha_actualizacion`

  - `receta`:

    - `id_receta`
    - `id_producto_presentacion`
    - `observaciones`
    - `estado`
    - `fecha_creacion`
    - `fecha_actualizacion`

    Cada combinación Producto + Presentación puede tener únicamente una receta mediante una restricción `UNIQUE`.

  - `detalle_receta`:

    - `id_detalle_receta`
    - `id_receta`
    - `id_materia_prima`
    - `cantidad`
    - timestamps.

    Se agregó restricción `CHECK` para impedir cantidades menores o iguales a cero.

    También se agregó una restricción `UNIQUE` sobre:

    - `id_receta`
    - `id_materia_prima`

    evitando que una misma materia prima se repita dentro de una receta.

- **Relaciones principales:**

  - `ProductoPresentacion` 1:1 `Receta`.
  - `Receta` 1:N `DetalleReceta`.
  - `MateriaPrima` 1:N `DetalleReceta`.

- **Integridad referencial:**

  - La receta referencia directamente a `producto_presentacion`.
  - Los detalles se eliminan mediante `CASCADE` cuando corresponde.
  - Las materias primas mantienen restricción `RESTRICT` para proteger referencias existentes.
  - No se permiten cantidades iguales o menores a cero.

- **Seeder:**

  - Se creó `RecetasInicialSeeder`.
  - Fue integrado en `DatabaseSeeder`.
  - Se generaron materias primas iniciales:

    - Harina — g.
    - Azúcar — g.
    - Huevos — unidad.
    - Leche — ml.
    - Chocolate — g.

- **Seguridad:**

  - Se creó el permiso:

    `recetas.gestionar_receta`

  - El permiso fue asignado a los roles correspondientes, principalmente:

    - Administrador.
    - Producción.

  - El mismo permiso controla tanto la gestión de recetas como la administración de materias primas dentro de CU9.

## 2. Modelos y Requests (Paso 2)

- **Modelos Eloquent creados:**

  - `MateriaPrima`
  - `Receta`
  - `DetalleReceta`

- **Modelo actualizado:**

  - `ProductoPresentacion`

    Se agregó su relación 1:1 con `Receta` mediante `hasOne()`.

- **Configuración de modelos:**

  - `$table`
  - `$primaryKey`
  - `$fillable`
  - `$casts`
  - timestamps personalizados mediante:

    - `fecha_creacion`
    - `fecha_actualizacion`

- **Relaciones Eloquent:**

  - `MateriaPrima` → `hasMany(DetalleReceta)`
  - `Receta` → `belongsTo(ProductoPresentacion)`
  - `Receta` → `hasMany(DetalleReceta)`
  - `DetalleReceta` → `belongsTo(Receta)`
  - `DetalleReceta` → `belongsTo(MateriaPrima)`
  - `ProductoPresentacion` → `hasOne(Receta)`

- **Form Requests para Materias Primas:**

  - `StoreMateriaPrimaRequest`
  - `UpdateMateriaPrimaRequest`
  - `UpdateEstadoMateriaPrimaRequest`

- **Form Requests para Recetas:**

  - `StoreRecetaRequest`
  - `UpdateRecetaRequest`
  - `UpdateEstadoRecetaRequest`

- **Validaciones implementadas:**

  - Nombre de materia prima obligatorio y único.
  - Unidades permitidas:

    - `g`
    - `ml`
    - `unidad`

  - Estado booleano.
  - Producto-Presentación obligatorio al crear una receta.
  - Mínimo un ingrediente por receta.
  - Materias primas existentes y activas.
  - Materias primas no repetidas dentro de una receta.
  - Cantidad obligatoria y mayor a cero.
  - Validación de observaciones.
  - Una sola receta por Producto + Presentación.

## 3. Controladores y Rutas API (Paso 3)

- **Controladores creados:**

  - `MateriaPrimaController`
  - `RecetaController`

### MateriaPrimaController

Se implementaron las operaciones:

- Listar materias primas.
- Buscar por nombre, descripción o unidad.
- Filtrar por estado.
- Consultar una materia prima.
- Crear materia prima.
- Editar materia prima.
- Activar o desactivar materia prima.
- Validar nombres duplicados.

### RecetaController

Se implementaron las operaciones:

- Listar recetas.
- Buscar recetas por producto.
- Filtrar por estado.
- Consultar receta individual.
- Crear receta.
- Editar receta.
- Activar o desactivar receta.
- Obtener catálogos necesarios para el frontend.

- **Creación y actualización transaccional:**

  Las operaciones que modifican una receta y sus ingredientes utilizan transacciones con `DB::transaction()` para garantizar que la receta y sus detalles permanezcan consistentes.

  Durante la edición, los ingredientes de la receta se reemplazan de forma controlada dentro de la misma transacción.

- **Control de duplicados:**

  Se impide registrar una segunda receta para el mismo:

  `id_producto_presentacion`

  devolviendo respuesta HTTP `409 Conflict`.

- **Endpoint de catálogos:**

  Se agregó:

  `GET /api/recetas/catalogos`

  Este endpoint devuelve:

  - Productos y presentaciones activos disponibles para recibir una receta.
  - Materias primas activas.

  Para nuevas recetas se excluyen automáticamente las combinaciones Producto + Presentación que ya poseen una receta mediante:

  `whereDoesntHave('receta')`

- **Rutas API principales:**

  - `GET /api/recetas`
  - `POST /api/recetas`
  - `GET /api/recetas/catalogos`
  - `GET /api/recetas/{id}`
  - `PUT /api/recetas/{id}`
  - `PATCH /api/recetas/{id}/estado`

- **Rutas de Materias Primas:**

  - `GET /api/recetas/materias-primas`
  - `POST /api/recetas/materias-primas`
  - `GET /api/recetas/materias-primas/{id}`
  - `PUT /api/recetas/materias-primas/{id}`
  - `PATCH /api/recetas/materias-primas/{id}/estado`

- Todas las rutas están protegidas mediante:

  - `auth:sanctum`
  - `permiso:recetas.gestionar_receta`

- Se aplicaron restricciones:

  `->whereNumber('id')`

  en los parámetros numéricos de las rutas.

## 4. Servicios y Vistas Frontend (Paso 4)

- **Servicios creados:**

  - `recetaService.js`
  - `materiaPrimaService.js`

- **Funciones principales de `recetaService.js`:**

  - `listarRecetas`
  - `obtenerReceta`
  - `obtenerCatalogosReceta`
  - `crearReceta`
  - `actualizarReceta`
  - `cambiarEstadoReceta`

- **Funciones principales de `materiaPrimaService.js`:**

  - `listarMateriasPrimas`
  - `crearMateriaPrima`
  - `actualizarMateriaPrima`
  - `cambiarEstadoMateriaPrima`

- Las operaciones de escritura utilizan la protección CSRF estándar mediante Sanctum y `XSRF-TOKEN`.

### RecetasPage.jsx

Se creó la vista principal para administrar recetas.

Incluye:

- Tabla de recetas.
- Producto.
- Presentación.
- Ingredientes.
- Cantidades.
- Unidad de medida.
- Estado.
- Acciones.
- Búsqueda por producto.
- Filtro por estado.
- Botón `Nueva Receta`.
- Botón `Editar`.
- Botón `Activar / Desactivar`.

### RecetaModal.jsx

Se desarrolló un modal reutilizable para:

- Crear receta.
- Editar receta.

Durante la creación permite:

- Seleccionar Producto + Presentación.
- Cargar observaciones.
- Agregar múltiples ingredientes.
- Seleccionar materia prima.
- Definir cantidad.
- Agregar nuevas filas dinámicamente.
- Eliminar filas.
- Evitar seleccionar la misma materia prima dos veces.

Durante la edición:

- Producto + Presentación permanece fijo.
- Se cargan automáticamente los ingredientes actuales.
- Se pueden cambiar cantidades.
- Se pueden agregar o quitar ingredientes.
- Se pueden modificar observaciones.
- Los cambios se envían al backend mediante `PUT`.

### MateriasPrimasPage.jsx

Se creó una interfaz independiente para gestionar las materias primas utilizadas por las recetas.

Incluye:

- Listado de materias primas.
- Buscador.
- Filtro por estado.
- Crear materia prima.
- Editar materia prima.
- Activar.
- Desactivar.
- Visualización de unidad de medida.
- Visualización de descripción.
- Validación de duplicados.

- **Routing:**

  Se actualizaron las rutas protegidas en `App.jsx` para incluir:

  - `/recetas`
  - `/recetas/materias-primas`

  Ambas rutas utilizan:

  `recetas.gestionar_receta`

- **Sidebar:**

  La sección `Catálogo y Recetas` quedó organizada con:

  - Productos y Presentaciones.
  - Recetas.
  - Materias Primas.

  La visualización de Recetas y Materias Primas depende del permiso:

  `recetas.gestionar_receta`

## 5. Validaciones y Pruebas Realizadas

Durante la implementación se realizaron pruebas reales tanto desde PowerShell/PostgreSQL como desde la interfaz React.

Se verificó:

- Creación de la primera receta.
- Persistencia de receta en PostgreSQL.
- Persistencia de múltiples ingredientes.
- Cantidades y unidades correctas.
- Restricción de receta duplicada.
- Respuesta `409 Conflict` ante una receta repetida.
- Edición transaccional de ingredientes.
- Agregar ingredientes.
- Cambiar cantidades.
- Activar receta.
- Desactivar receta.
- Listar recetas.
- Buscar recetas.
- Filtrar por estado.
- Crear receta desde React.
- Editar receta desde React.
- Activar/desactivar desde React.
- Crear materia prima.
- Evitar materia prima duplicada.
- Editar materia prima.
- Activar/desactivar materia prima.
- Buscar materia prima.
- Filtrar materias primas.

También se verificó la relación entre CU7 y CU9:

`Producto → Presentación vinculada → ProductoPresentacion → Receta`

Una presentación únicamente puede ser utilizada para crear una receta cuando previamente se encuentra vinculada a un producto en `producto_presentacion`.

## 6. Ajustes y Problemas Corregidos

Durante CU9 se detectaron y corrigieron varios puntos importantes:

- Las rutas de recetas inicialmente estaban registradas incorrectamente como:

  `/api`

  en lugar de:

  `/api/recetas`

  Se corrigió el grupo de rutas utilizando `Route::prefix('recetas')`.

- Se agregó una clave primaria propia:

  `id_producto_presentacion`

  a la tabla pivote para permitir que `receta` pueda referenciar directamente una presentación concreta de producto.

- Se confirmó que crear una presentación no significa automáticamente vincularla a un producto.

  Para poder crear una receta debe existir primero una relación en:

  `producto_presentacion`.

- Se corrigió la función `cambiarEstado` en `RecetasPage.jsx`, ya que inicialmente había quedado declarada dentro de `manejarGuardado`.

- Se unificó el permiso de Materias Primas con:

  `recetas.gestionar_receta`

  tanto en Sidebar, rutas frontend y backend.

## Conclusión

Se completaron todas las fases necesarias del Caso de Uso 9 — Gestionar Receta.

El módulo permite administrar de forma completa las recetas asociadas a cada combinación de Producto + Presentación, incluyendo sus ingredientes y cantidades, manteniendo integridad referencial y operaciones transaccionales.

También se incorporó la gestión de materias primas como catálogo necesario para la construcción de recetas.

El backend, la base de datos, las rutas REST, la seguridad mediante Sanctum y permisos, los servicios frontend y las interfaces React fueron implementados y probados de forma integrada.

**CU9 — Gestionar Receta queda cerrado oficialmente al 100%.** ✅