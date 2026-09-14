# Resumen CU20: Gestionar Egreso de Inventario

## Objetivo Completado
Se ha implementado con éxito el flujo completo para registrar y gestionar egresos de inventario. Este módulo permite registrar la salida física de materias primas y productos/presentaciones (por mermas, vencimiento, daños, consumo o desincorporación), descontando automáticamente las existencias de la tabla `inventario` y garantizando la regla crítica de que el stock **nunca sea negativo**.

## Componentes Implementados

### 1. Base de Datos y Modelos
- Se mantuvieron intactas las migraciones históricas del sistema.
- Se hizo uso de las tablas `egreso` y `detalle_egreso` y sus respectivos modelos Eloquent (`Egreso.php` y `DetalleEgreso.php`).
- Se respetó la precisión de cantidades ajustada previamente a `NUMERIC(12,3)`.

### 2. Controlador, Request y Lógica de Negocio
- **EgresoController**:
  - `index`: Lista los egresos ordenados por `fecha_egreso` de forma descendente, junto con el usuario responsable y los detalles.
  - `show`: Devuelve la información detallada de un egreso específico (almacén de origen, usuario, materia prima o producto/presentación).
  - `store`: Ejecuta transaccionalmente (`DB::beginTransaction`) el descuento de stock previa validación estricta (`stock_disponible >= cantidad_egreso`). Si el stock es insuficiente en cualquier ítem, revierte la transacción (`rollBack`) y retorna HTTP 422 con un mensaje claro.
- **StoreEgresoRequest**: Valida la glosa/motivo obligatoria, la estructura del array de detalles, que la cantidad sea mayor a 0 (mínimo 0.001) y que cada detalle contenga exclusivamente Materia Prima o Producto/Presentación.

### 3. Seguridad RBAC
- **EgresoPermissionSeeder**: Creado para insertar el permiso `inventario.gestionar_egreso` en `permisos`, relacionarlo con el rol `Administrador` en `rol_permiso`, e insertar la vinculación en `usuario_rol_permiso` para los usuarios administradores.
- **DatabaseSeeder**: Actualizado para incluir `EgresoPermissionSeeder`.

### 4. Frontend
- **egresoService.js**: Servicio para consumir los endpoints REST (`listarEgresos`, `obtenerEgreso`, `crearEgreso`).
- **EgresoList.jsx**: Vista de lista para consultar el historial de egresos con usuario, motivo y enlace a detalle.
- **EgresoForm.jsx**: Formulario dinámico para registrar egresos agregando múltiples ítems de forma flexible, especificando tipo de ítem, almacén de origen y cantidad.
- **EgresoDetail.jsx**: Vista detallada de solo lectura para revisar la información de un egreso registrado.
- **App.jsx**: Rutas protegidas (`/inventario/egresos`, `/inventario/egresos/crear`, `/inventario/egresos/:id`) configuradas con `ProtectedRoute` y el permiso `inventario.gestionar_egreso`.

## Flujo de Trabajo Confirmado
1. El usuario navega a la sección "Egresos" en el menú de Inventario.
2. Presiona "Registrar Egreso", cargando los catálogos de almacenes, materias primas y productos.
3. Completa la glosa o motivo de la salida y agrega uno o más detalles especificando el almacén origen y las cantidades a descontar.
4. El backend valida en una transacción DB que haya existencia suficiente para cada ítem.
5. Si la validación pasa, registra los cambios en `egreso`, `detalle_egreso` y descuenta del `inventario`.
6. Si falta stock para algún elemento, cancela la operación transaccionalmente e informa al usuario.
