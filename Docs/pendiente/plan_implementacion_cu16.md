# Plan de Implementación: CU16 Gestionar Producción

## Descripción del Caso de Uso (CU16)
Este caso de uso permite registrar y controlar el proceso de producción de productos en "Dulce Bocado". El flujo general establecido es:
1. Seleccionar la presentación de producto a producir.
2. Consultar su receta asociada.
3. Calcular los requerimientos de materia prima según la cantidad a producir.
4. Verificar disponibilidad en el almacén correspondiente (Materias Primas).
5. Registrar la orden de producción con la cantidad esperada.
6. Al finalizar, registrar la cantidad de unidades buenas obtenidas.
7. Generar trazabilidad. *Las operaciones críticas deben manejarse mediante transacciones de BD.*

## Estado Actual
- ✅ **Base de Datos:** Ya existen las tablas `produccion` y `detalle_produccion` y sus correspondientes modelos (`Produccion.php`, `DetalleProduccion.php`).
- ✅ **Dependencias Previas:** El módulo de recetas (CU9) y productos/presentaciones (CU7) están completados.

## Consideraciones a Definir (Para revisión)

> **Trazabilidad de Inventario:** El módulo de inventario (CU18-20) aún no está iniciado oficialmente según `AGENTS.md`. ¿Deseas que en este CU16 ya generemos e insertemos los registros en las tablas de `ingreso`, `egreso`, `detalle_ingreso` y `detalle_egreso` para afectar el stock real, o por el momento solo realizamos las validaciones lógicas y dejamos la estructura lista para cuando se trabaje de lleno el CU18-20? Mi recomendación es integrar la transacción de inventario de una vez para que la producción tenga efecto real.

> **Estados de Producción:** Propongo manejar los siguientes estados para el campo `estado`: 
> - `PENDIENTE` (orden creada y calculada), 
> - `EN_PROCESO` (materias primas consumidas), 
> - `COMPLETADA` (terminada, se registró cantidad de unidades buenas e ingresa a almacén), 
> - `CANCELADA`. 
> ¿Estás de acuerdo con este flujo de estados?

## Cambios Propuestos

---

### Backend

#### `app/Http/Controllers/Api/Produccion/ProduccionController.php`
- `index`: Listar órdenes de producción (con filtros por estado y fecha).
- `store`: Crear orden. Requerirá validar la receta, calcular insumos y verificar stock. Se ejecutará dentro de `DB::transaction()`.
- `show`: Ver detalles de la orden (incluyendo `DetalleProduccion` e insumos calculados).
- `updateEstado`: Transición de estados. Principalmente para pasar a `COMPLETADA` y recibir las unidades buenas.

#### `app/Http/Requests/Produccion/StoreProduccionRequest.php`
- Validación para la creación (id_producto_presentacion, cantidad, etc).

#### `app/Http/Requests/Produccion/CompletarProduccionRequest.php`
- Validación de unidades buenas al finalizar (no debe superar la cantidad esperada o manejar excepciones lógicas).

#### `routes/api.php`
- Agregar grupo de rutas para `produccion` protegidas por Sanctum y los middlewares de permisos: `produccion.listar`, `produccion.crear`, `produccion.gestionar`.

---

### Frontend

#### `frontend/src/services/produccionService.js`
- Llamadas `fetch` a los nuevos endpoints de producción.

#### Carpeta `frontend/src/pages/produccion`
- **`ProduccionList.jsx`**: Tabla para ver todo el historial de producciones, estados y fechas.
- **`ProduccionForm.jsx`**: Formulario interactivo. Al seleccionar la presentación, debe hacer "preview" de los insumos requeridos versus el stock actual para avisar si es posible producir.
- **`CompletarProduccionModal.jsx`**: Modal para ingresar la cantidad de "unidades buenas" obtenidas, observaciones y finalizar la orden.

#### `frontend/src/App.jsx`
- Registrar las rutas (`/produccion`, `/produccion/crear`, `/produccion/:id`).

#### `frontend/src/layouts/MainLayout.jsx`
- Agregar opción "Producción" al menú lateral, condicionado al permiso correspondiente.

## Plan de Verificación

### Pruebas de API
- Lanzar peticiones de creación (API) probando escenarios sin suficiente materia prima para verificar que retorne error 422 y no cree registros.

### Verificación Manual
1. Ingresar con un usuario administrador o personal de producción.
2. Navegar a Producción -> Crear Producción.
3. Seleccionar una presentación que no tenga receta (debería bloquear o avisar).
4. Seleccionar una presentación con receta, pero pedir una cantidad que exceda las materias primas en inventario (debe mostrar advertencia de "stock insuficiente").
5. Realizar una orden de producción válida (estado PENDIENTE/EN_PROCESO).
6. Cambiar la orden a COMPLETADA, indicando unidades buenas.
7. Comprobar que en la base de datos el stock de la materia prima se redujo y el de presentación aumentó.
