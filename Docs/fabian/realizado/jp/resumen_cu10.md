# Resumen Oficial — CU10: Gestionar Venta

**Estado:** ✅ COMPLETADO FUNCIONALMENTE

Este documento consolida todo el trabajo realizado durante la implementación del Caso de Uso 10 — Gestionar Venta, garantizando su integración con la arquitectura actual del sistema, las reglas establecidas en `AGENTS.md` y los módulos previamente desarrollados de Clientes, Productos y Presentaciones.

El CU10 permite registrar, consultar, editar y anular ventas, trabajando con clientes registrados u ocasionales, uno o varios productos-presentaciones, cantidades, personalizaciones y cálculo seguro de precios y totales desde el backend.

> **Nota de integración futura:** la validación y descuento de stock del almacén Mostrador será incorporada cuando se desarrollen los CU18–CU21 correspondientes al módulo de Inventario. No se creó una solución temporal para evitar duplicar lógica o generar tablas que posteriormente deban eliminarse.

## 1. Base de Datos (Paso 1)

Se crearon las tablas principales necesarias para gestionar las ventas.

### Tabla `venta`

Campos principales:

- `id_venta`
- `id_cliente`
- `id_usuario`
- `nombre_cliente_ocasional`
- `fecha_venta`
- `total`
- `estado`
- `observaciones`
- `fecha_creacion`
- `fecha_actualizacion`

Posteriormente se incorporaron campos específicos para la auditoría de anulaciones:

- `id_usuario_anulacion`
- `motivo_anulacion`
- `fecha_anulacion`

### Relaciones de `venta`

- `id_cliente` → `cliente.id_cliente`
- `id_usuario` → `usuarios.id_usuario`
- `id_usuario_anulacion` → `usuarios.id_usuario`

Se utilizaron restricciones `RESTRICT` para evitar eliminar registros relacionados con ventas existentes.

### Estados permitidos

La venta maneja únicamente:

- `REGISTRADA`
- `ANULADA`

Se agregó la restricción:

`chk_venta_estado`

para impedir estados no permitidos.

También se agregó:

`chk_venta_total`

con la regla:

`total >= 0`

### Auditoría de anulación

Se incorporó la restricción:

`chk_venta_auditoria_anulacion`

Esta garantiza que:

- Una venta `REGISTRADA` no tenga datos de anulación.
- Una venta `ANULADA` tenga obligatoriamente:

  - usuario que anuló,
  - motivo,
  - fecha de anulación.

Una venta anulada no puede volver a activarse.

---

### Tabla `detalle_venta`

Campos principales:

- `id_detalle_venta`
- `id_venta`
- `id_producto_presentacion`
- `cantidad`
- `precio_unitario`
- `costo_personalizacion`
- `detalle_personalizacion`
- `subtotal`
- `fecha_creacion`
- `fecha_actualizacion`

### Relaciones de `detalle_venta`

- `id_venta` → `venta.id_venta`
- `id_producto_presentacion` → `producto_presentacion.id_producto_presentacion`

La relación:

`detalle_venta → venta`

utiliza `ON DELETE CASCADE`.

La referencia hacia `producto_presentacion` utiliza `RESTRICT`.

### Restricciones

Se implementaron:

- `cantidad > 0`
- `precio_unitario > 0`
- `costo_personalizacion >= 0`
- `subtotal > 0`

Mediante:

- `chk_detalle_venta_cantidad`
- `chk_detalle_venta_precio`
- `chk_detalle_venta_personalizacion`
- `chk_detalle_venta_subtotal`

---

## 2. Reglas de Cálculo de Venta

El frontend no controla directamente los precios finales.

El backend obtiene el precio real desde:

`producto_presentacion.precio`

y calcula:

`subtotal = (precio_unitario × cantidad) + costo_personalizacion`

Ejemplo:

- Precio unitario: Bs 150
- Cantidad: 2
- Personalización: Bs 25

Resultado:

`(150 × 2) + 25 = Bs 325`

El total de la venta se obtiene sumando todos los subtotales.

Esto evita que un usuario pueda modificar desde el navegador:

- `precio_unitario`
- `subtotal`
- `total`

y registrar una venta con valores manipulados.

El backend también conserva el `precio_unitario` utilizado en cada detalle para mantener el valor histórico de la venta aunque posteriormente cambie el precio del producto.

---

## 3. Modelos Eloquent (Paso 2)

Se crearon los siguientes modelos:

- `Venta`
- `DetalleVenta`

### Modelo `Venta`

Configurado con:

- `$table = 'venta'`
- `$primaryKey = 'id_venta'`
- `$fillable`
- `$casts`
- timestamps personalizados:

  - `fecha_creacion`
  - `fecha_actualizacion`

También se configuró:

- `fecha_venta` como datetime.
- `fecha_anulacion` como datetime.
- `total` como decimal.

### Relaciones de `Venta`

- `cliente()` → `belongsTo(Cliente)`
- `usuario()` → `belongsTo(Usuario)`
- `usuarioAnulacion()` → `belongsTo(Usuario)`
- `detalles()` → `hasMany(DetalleVenta)`

### Modelo `DetalleVenta`

Configurado con:

- `$table = 'detalle_venta'`
- `$primaryKey = 'id_detalle_venta'`
- `$fillable`
- `$casts`
- timestamps personalizados.

### Relaciones de `DetalleVenta`

- `venta()` → `belongsTo(Venta)`
- `productoPresentacion()` → `belongsTo(ProductoPresentacion)`

También se actualizaron modelos existentes:

### `ProductoPresentacion`

Se agregó:

`detallesVenta()`

como relación `hasMany`.

### `Cliente`

Se agregó:

`ventas()`

como relación `hasMany`.

### `Usuario`

Se agregó:

`ventas()`

como relación `hasMany`.

Los modelos fueron verificados mediante Tinker:

- `Venta::count()`
- `DetalleVenta::count()`
- carga de relaciones:

`Venta::with(['cliente', 'usuario', 'detalles'])->get()`

sin errores.

---

## 4. Seguridad y Seeder (Paso 3)

Se creó:

`VentasInicialSeeder`

y se integró en:

`DatabaseSeeder`

### Permiso creado

`ventas.gestionar_venta`

Descripción:

`Permite registrar, consultar, editar y anular ventas.`

### Roles asignados

El permiso fue asignado a:

- Administrador
- Vendedor

También se propagó a los usuarios que ya tenían asignaciones correspondientes a dichos roles mediante las relaciones existentes de:

- `RolPermiso`
- `UsuarioRolPermiso`

Se verificó directamente en PostgreSQL que:

- el permiso existe,
- está activo,
- está asociado a Administrador,
- está asociado a Vendedor.

---

## 5. Form Requests (Paso 4)

Se crearon tres clases de validación en:

`app/Http/Requests/Ventas/`

### `StoreVentaRequest`

Valida la creación de una venta.

### `UpdateVentaRequest`

Valida la modificación de una venta registrada.

### `AnularVentaRequest`

Valida la anulación de una venta.

### Validaciones principales

Se implementaron reglas para:

- Cliente registrado existente.
- Cliente ocasional.
- No permitir cliente registrado y ocasional simultáneamente.
- Exigir uno de los dos tipos de cliente.
- Mínimo un producto.
- Producto-Presentación existente.
- No repetir el mismo Producto-Presentación dentro de la misma venta.
- Cantidad entera mayor a cero.
- Costo de personalización mayor o igual a cero.
- Detalle de personalización opcional.
- Observaciones opcionales.

Para anulación:

- Motivo obligatorio.
- Mínimo 5 caracteres.
- Máximo 500 caracteres.

El frontend no envía como valores confiables:

- `id_usuario`
- `precio_unitario`
- `subtotal`
- `total`
- `fecha_venta`

Estos datos son determinados por el backend.

---

## 6. Controlador y Lógica Backend (Paso 5)

Se creó:

`VentaController`

ubicado en:

`app/Http/Controllers/Api/Ventas/VentaController.php`

Se implementaron los métodos:

- `index()`
- `show()`
- `catalogos()`
- `store()`
- `update()`
- `anular()`

También se implementó el método privado:

`guardarDetalles()`

para centralizar:

- obtención del precio desde BD,
- cálculo de subtotal,
- creación de detalles,
- cálculo del total.

---

### `index()`

Permite:

- Listar ventas.
- Buscar por cliente registrado.
- Buscar por cliente ocasional.
- Buscar por CI/NIT.
- Buscar por producto.
- Filtrar por estado.
- Ordenar por fecha y número de venta.

Carga las relaciones:

- cliente,
- usuario,
- usuario de anulación,
- detalles,
- producto,
- presentación.

---

### `show()`

Permite consultar una venta específica con toda su información relacionada.

Devuelve `404` si la venta no existe.

---

### `catalogos()`

Se agregó:

`GET /api/ventas/catalogos`

Este endpoint devuelve:

- Clientes activos.
- Productos-Presentaciones activos.
- Precio actual de cada combinación.

Es utilizado por el formulario frontend.

---

### `store()`

Registra una nueva venta dentro de:

`DB::transaction()`

El backend:

1. Obtiene el usuario autenticado.
2. Crea la cabecera de venta.
3. Consulta los precios actuales.
4. Verifica que producto y presentación estén activos.
5. Calcula subtotales.
6. Crea los detalles.
7. Calcula el total.
8. Actualiza la venta.

Una venta nueva se registra con:

`estado = REGISTRADA`

---

### `update()`

La edición también utiliza:

`DB::transaction()`

Se bloquea la venta mediante:

`lockForUpdate()`

Antes de modificarla.

Solo pueden editarse ventas:

`REGISTRADA`

Si la venta se encuentra:

`ANULADA`

el backend devuelve:

`409 Conflict`

con el mensaje correspondiente.

Durante la edición:

- se actualiza el cliente,
- se actualizan observaciones,
- se eliminan los detalles anteriores,
- se registran los nuevos detalles,
- se recalculan subtotales,
- se recalcula el total.

Todo ocurre dentro de una misma transacción.

---

### `anular()`

La anulación utiliza:

`DB::transaction()`

y:

`lockForUpdate()`

Al anular se registran simultáneamente:

- `estado = ANULADA`
- `id_usuario_anulacion`
- `motivo_anulacion`
- `fecha_anulacion`

Una venta que ya está anulada no puede volver a anularse.

Una venta anulada tampoco puede editarse ni reactivarse.

Esto permite mantener correctamente la trazabilidad histórica.

---

## 7. Rutas API (Paso 6)

Se configuró el grupo:

`/api/ventas`

protegido mediante:

- `auth:sanctum`
- `permiso:ventas.gestionar_venta`

### Endpoints implementados

- `GET /api/ventas`
- `POST /api/ventas`
- `GET /api/ventas/catalogos`
- `GET /api/ventas/{id}`
- `PUT /api/ventas/{id}`
- `PATCH /api/ventas/{id}/anular`

Se utilizaron constraints:

`->whereNumber('id')`

para los identificadores numéricos.

Inicialmente las rutas de CU10 quedaron accidentalmente dentro del grupo:

`/api/recetas/ventas`

Esto fue detectado mediante:

`php artisan route:list --path=ventas`

y posteriormente corregido, dejando las rutas oficialmente bajo:

`/api/ventas`

---

## 8. Servicios Frontend (Paso 7)

Se creó:

`frontend/src/services/ventaService.js`

### Funciones implementadas

- `listarVentas`
- `obtenerVenta`
- `obtenerCatalogosVenta`
- `crearVenta`
- `actualizarVenta`
- `anularVenta`

Las operaciones de escritura utilizan:

- Sanctum
- CSRF
- `XSRF-TOKEN`
- `credentials: 'include'`

---

## 9. Interfaz Frontend — React + Tailwind (Paso 8)

Se crearon:

- `VentasPage.jsx`
- `VentaModal.jsx`

### `VentasPage.jsx`

Incluye:

- Tabla de ventas.
- Número de venta.
- Cliente.
- Productos vendidos.
- Cantidades.
- Subtotales.
- Total.
- Fecha.
- Estado.
- Usuario que registró la venta.
- Motivo de anulación.
- Acciones disponibles.

También incluye:

- Buscador.
- Filtro por estado.
- Botón `Nueva Venta`.
- Botón `Editar`.
- Botón `Anular`.

Una venta anulada aparece sin acciones de edición.

---

### `VentaModal.jsx`

Se desarrolló un modal reutilizable para:

- Crear venta.
- Editar venta.

Permite elegir entre:

- Cliente registrado.
- Cliente ocasional.

Para clientes registrados se carga un catálogo de clientes activos.

Para clientes ocasionales se solicita el nombre manualmente.

### Gestión dinámica de productos

El modal permite:

- Agregar múltiples productos.
- Seleccionar Producto + Presentación.
- Visualizar precio.
- Definir cantidad.
- Agregar costo de personalización.
- Agregar detalle de personalización.
- Eliminar líneas.
- Evitar repetir Producto-Presentación.
- Calcular subtotal estimado.
- Calcular total estimado.

El total mostrado en frontend es únicamente informativo.

El backend vuelve a calcular todos los importes antes de registrar o modificar la venta.

---

### Modal de Anulación

Se implementó una ventana específica para anular ventas.

Solicita:

- Motivo obligatorio.

También informa que:

- una venta anulada no puede editarse,
- no puede reactivarse.

Al confirmar, se registra la auditoría correspondiente en el backend.

---

## 10. Routing y Sidebar

Se actualizó:

`App.jsx`

con la ruta:

`/ventas`

protegida mediante:

`ventas.gestionar_venta`

El Sidebar ya contenía la opción:

`Ventas`

dentro de:

`Ventas y Comercial`

con el mismo permiso.

Por lo tanto, únicamente los usuarios autorizados pueden visualizar y acceder al módulo.

---

## 11. Pruebas Realizadas

Se realizaron pruebas reales desde PowerShell, PostgreSQL y posteriormente desde la interfaz React.

### Creación de venta

Se registró una venta real con:

- Cliente registrado.
- Dos Producto-Presentación.
- Cantidades diferentes.
- Personalización.
- Observaciones.

Resultado:

`Total = Bs 525.00`

Se verificaron:

- venta,
- detalles,
- precios,
- cantidades,
- subtotales,
- total,
- relaciones.

### Cálculo validado

Detalle 1:

`2 × Bs 150 + Bs 25 = Bs 325`

Detalle 2:

`1 × Bs 200 = Bs 200`

Total:

`Bs 525`

---

### Edición de venta

La misma venta fue modificada para:

- Cliente ocasional.
- Productos diferentes.
- Nuevas cantidades.
- Nueva personalización.

Resultado:

`Total = Bs 620.00`

Se confirmó que los detalles anteriores fueron reemplazados correctamente dentro de una transacción.

---

### Anulación

La venta fue anulada registrando:

- usuario de anulación,
- motivo,
- fecha.

Se verificó:

`estado = ANULADA`

Posteriormente se intentó editar nuevamente la venta.

Resultado esperado:

`409 Conflict`

con bloqueo de modificación.

---

### Frontend

Desde React se verificó correctamente:

- Listar ventas.
- Buscar.
- Filtrar por estado.
- Crear nueva venta.
- Cliente registrado.
- Cliente ocasional.
- Agregar productos.
- Agregar cantidades.
- Personalización.
- Total estimado.
- Editar venta.
- Anular venta.
- Motivo de anulación.
- Visualización de estado.

Todas las operaciones funcionaron correctamente.

---

## 12. Problemas Detectados y Corregidos

Durante CU10 se identificaron varios puntos importantes.

### Rutas anidadas incorrectamente

Inicialmente las rutas aparecieron como:

`/api/recetas/ventas`

debido a que el bloque de CU10 había quedado dentro del grupo de CU9.

Se corrigió la ubicación en:

`routes/api.php`

dejándolas como:

`/api/ventas`

---

### JSON desde PowerShell

Durante las pruebas manuales, PowerShell inicialmente envió el contenido JSON de una forma que Laravel no interpretó correctamente.

Esto provocó errores `422` indicando que no existían:

- cliente,
- items.

Para las pruebas manuales se solucionó convirtiendo el body a UTF-8:

`[System.Text.Encoding]::UTF8.GetBytes(...)`

El problema correspondía a la prueba desde PowerShell y no al frontend React.

---

### Auditoría de ventas anuladas

Antes de finalizar CU10 se incorporaron campos adicionales para conservar:

- usuario de anulación,
- motivo,
- fecha.

Esto evita perder trazabilidad y permite mantener las ventas anuladas como registros históricos.

---

## 13. Integración Pendiente con Inventario

Actualmente CU10 no valida ni descuenta existencias porque el módulo de Inventario todavía no ha sido desarrollado.

La integración se realizará cuando estén implementados:

- CU18 Gestionar Almacenes y Existencias.
- CU19 Gestionar Ingreso de Inventario.
- CU20 Gestionar Egreso de Inventario.
- CU21 Gestionar Ajuste de Inventario.

En ese momento el flujo deberá ser:

`Venta`
→ consultar almacén Mostrador
→ bloquear existencia
→ verificar cantidad disponible
→ impedir stock negativo
→ registrar venta
→ generar egreso
→ actualizar existencias

Todo deberá ejecutarse dentro de una transacción para asegurar consistencia.

No se creó ninguna tabla ni mecanismo provisional de stock durante CU10.

---

## Conclusión

Se completaron las fases principales del Caso de Uso 10 — Gestionar Venta.

El sistema permite actualmente:

- registrar ventas,
- utilizar clientes registrados u ocasionales,
- registrar uno o varios productos,
- manejar cantidades,
- registrar personalizaciones,
- conservar precios históricos,
- calcular subtotales,
- calcular totales desde el backend,
- consultar ventas,
- buscar y filtrar ventas,
- editar ventas registradas,
- anular ventas,
- registrar auditoría de anulación,
- impedir modificaciones posteriores a una anulación.

La base de datos, modelos Eloquent, seguridad, Form Requests, controlador REST, rutas API, servicios frontend y componentes React fueron implementados y probados de forma integrada.

**CU10 — Gestionar Venta queda completado funcionalmente.** ✅

La única integración pendiente corresponde al control de stock del almacén Mostrador, que será incorporado cuando se desarrolle el módulo oficial de Inventario (CU18–CU21).