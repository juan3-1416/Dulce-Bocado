# Sprint 2 — Avance y pruebas de cierre

Este es el registro único de avances y de pruebas pendientes del Sprint 2. Actualizar este archivo con cada cambio, sin crear un informe nuevo por tarea. Las pruebas funcionales e integrales se ejecutarán al terminar el sprint; ninguna tarea se marca como validada antes de observar el resultado.

## Estado del desarrollo

| Tarea | Estado | Avance | Pendiente |
|---|---|---|---|
| T201–T202 | Código aportado por `dev-jp` | `customer-service`, PostgreSQL, API y autorización de Clientes. | Validación conjunta al cierre. |
| T203 | Código implementado | Vista del monolito conectada a Customer por Gateway/Bearer; permisos y filtro de estado ajustados. | Compilación y flujo funcional. |
| T204 | En desarrollo | Base independiente de `catalog-service` con MySQL, Compose, Laravel, modelos y migración inicial de categorías, productos y presentaciones. | Configurar entorno local, migrar, completar API y autorización. |
| T205 | En desarrollo | API protegida de categorías, productos y presentaciones; validaciones de datos y detalle interno de presentación para Sales. El esquema separa producto y presentación, con precio y disponibilidad comercial. Gateway enruta solo rutas exactas de Catalog. | Registrar permisos en Security, configurar entorno y comprobar contratos al cierre. |
| T206 | En desarrollo | Vista de productos, categorías y presentaciones del monolito adaptada al contrato de Catalog; servicios React usan Gateway/Bearer y permisos `catalogo.ver`/`catalogo.gestionar`. La presentación ahora pertenece directamente al producto. | Registrar permisos, compilar y comprobar el flujo al cierre. |
| T207 | En desarrollo | Catalog posee tablas de materias primas, recetas y detalles; API para listado, alta, edición y cambio de estado, con validación de ingredientes y cantidades. | Registrar permisos `recetas.ver`/`recetas.gestionar`, aplicar migración y comprobar el contrato al cierre. |
| T208 | En desarrollo | Vistas existentes de Recetas y Materias Primas usan adaptadores Bearer hacia Catalog. Producción e Inventario conservan sus servicios legados. | Compilar, comprobar flujos completos y permisos al cierre. |
| T209 | En desarrollo | Base independiente de `order-service` con PostgreSQL `dulce_orders`, Compose, modelos y migración de pedido/detalle. | Configurar entorno, aplicar migración y comprobar salud al cierre. |
| T210 | En desarrollo | API de listado, consulta, registro y edición de pedidos `REGISTRADO`; valida cliente y presentación por REST, fecha posterior al registro, cantidad positiva y total calculado con snapshots. | Registrar permisos en Security, conectar la vista y comprobar contratos al cierre. |
| T214–T215 | Código aportado por `devFabian` | Base/API de Sales y conexión real con Customer. | Integración con Catalog y pruebas conjuntas. |
| T216 | En desarrollo | Formulario existente de Ventas adaptado a `sales-service`; envía cliente, `presentacion_id` y cantidad. Alta/edición cerradas hasta obtener presentaciones compatibles. | Confirmar lista de Catalog y probar alta/edición completa. |

## Contratos que deben coincidir

- Customer: `GET /api/clientes?estado=1` y operaciones CRUD por Gateway con Bearer. Permisos `clientes.ver`, `clientes.crear`, `clientes.modificar`, `clientes.cambiar_estado`.
- Catalog para la vista de Ventas: `GET /api/presentaciones` debe devolver `{ "presentaciones": [...] }` con `presentacion_id` entero, `nombre`, `precio` decimal, `moneda: "BOB"`, `disponible` y `permite_personalizacion` booleanos. El contrato interno `GET /api/presentaciones/{id}` debe devolver `{ "presentacion": {...} }` con esos mismos campos, protegido por clave interna y actor validado.
- Catalog usa `catalogo.ver` para lectura y `catalogo.gestionar` para escritura. Esos permisos aún deben darse de alta en Security. `CATALOG_INTERNAL_KEY` debe coincidir con la clave configurada por Sales para consultar el detalle interno.
- Sales: `POST /api/ventas` y `PUT /api/ventas/{id}` reciben cliente, observaciones e `items: [{ presentacion_id, cantidad }]`; Sales calcula total, precio y snapshot. No enviar costo, precio ni personalización desde React.
- La vista de catálogo monolítica modela presentaciones globales que se vinculan a productos. El nuevo esquema hace que cada presentación pertenezca a un producto. T206 debe adaptar la interacción existente a esa relación, sin copiar las rutas de vinculación del monolito.
- Inventario sigue consumiendo `productoService.js` legado hasta su migración posterior; la vista nueva de Catálogo usa `catalogoProductoService.js` para no cambiar ese flujo fuera del Sprint 2.
- Recetas usan `presentacion_id` directamente, sin la tabla puente `producto_presentacion` del monolito. `GET /api/presentaciones/{id}/receta` expone la receta por API; los ingredientes se guardan en una transacción local con cantidades positivas y materias primas activas. Las vistas existentes reciben una adaptación de nombres para conservar su presentación visual.
- Producción e Inventario conservan `recetaService.js` y `materiaPrimaService.js` legados. Las vistas de Sprint 2 usan `catalogoRecetaService.js` y `catalogoMateriaPrimaService.js` hasta la migración de esos módulos.
- Orders: `GET/POST /api/pedidos`, `GET/PUT /api/pedidos/{id}`. Alta y edición reciben `id_cliente`, `fecha_entrega` (`YYYY-MM-DD`), `hora_entrega` (`HH:mm`), observaciones opcionales y `detalles: [{ presentacion_id, cantidad, detalle_personalizacion? }]`. Orders toma el precio de Catalog y guarda nombre, precio unitario y subtotal como snapshot; no recibe precios ni costos de personalización del navegador. Solo se edita `REGISTRADO`.
- Orders usa `pedidos.ver`, `pedidos.crear` y `pedidos.modificar`; faltan en Security. Las claves internas de Customer y Catalog deben coincidir con las del servicio Orders. Las rutas de Pedidos aún no se publican en Gateway porque la vista del monolito conserva cookies, nombres y estados antiguos; T211/T212/T213 deben migrarla antes de desviar tráfico.

## Pruebas a ejecutar al cierre del Sprint 2

### Entorno y compilación

- [ ] Instalar dependencias del frontend y ejecutar `npm run build`.
- [ ] Preparar los `.env` locales sin registrar secretos; generar `APP_KEY` de cada servicio.
- [ ] Validar Compose conjunto con Security, Customer, Catalog, Orders y Sales; levantar contenedores y comprobar salud.
- [ ] Aplicar migraciones sin borrar datos y verificar persistencia tras reinicio.

### Clientes — T201–T203 / PS2-01–02

- [ ] Listar, buscar y filtrar activos/inactivos desde React → Gateway → Customer.
- [ ] Crear, consultar, editar, desactivar y reactivar cliente; comprobar errores `422` y duplicados.
- [ ] Verificar `401` sin token, `403` sin permiso y controles de UI por permiso.
- [ ] Rechazar cliente inactivo en nuevos flujos de Sales/Orders; admitir cliente ocasional en Sales.

### Catálogo y recetas — T204–T208 / PS2-03–06, PS2-20

- [ ] Categorías, productos y presentaciones: alta, consulta, edición, desactivación y persistencia MySQL.
- [ ] Rechazar precio negativo; exigir producto válido para cada presentación y comprobar disponibilidad comercial.
- [ ] Confirmar contrato de listado y detalle de presentación por Gateway e internamente desde Sales.
- [ ] Registrar receta válida; rechazar insumo faltante, duplicado o cantidad no positiva; verificar vínculo único con presentación.
- [ ] Consultar y editar receta sin cambiar su presentación; activar/desactivar receta y materia prima.
- [ ] Verificar `GET /api/presentaciones/{id}/receta` por contrato interno y rechazar actor o clave inválidos.
- [ ] Migrar las vistas de Catálogo y Recetas del monolito a Gateway/Bearer sin rutas ni cookies legadas.

### Pedidos — T209–T213 / PS2-07–13

- [ ] Registrar y editar pedido con Customer/Catalog por REST y snapshot de precio.
- [ ] Comprobar fecha/hora futura, cantidades positivas, personalización permitida, total calculado en servidor y edición solo en `REGISTRADO`.
- [ ] Rechazar cliente o presentación inexistente, transiciones inválidas y dependencias caídas.
- [ ] Cambiar estado, registrar entrega y conservar el histórico de precio.
- [ ] Registrar permisos `pedidos.ver`, `pedidos.crear`, `pedidos.modificar` y los de estado/entrega; verificar `401` y `403`.
- [ ] Migrar la vista existente de Pedidos a Gateway/Bearer, sin cookies/CSRF ni pagos legados, y verificar sus acciones al cerrar el sprint.

### Ventas — T214–T216 / PS2-14–19

- [ ] Crear, listar, consultar, editar borrador y anular venta desde React → Gateway → Sales.
- [ ] Comprobar total y snapshot histórico tras cambiar el precio en Catalog.
- [ ] Probar venta con cliente registrado activo y ocasional; rechazar inactivo.
- [ ] Simular caída de Customer/Catalog/Security y confirmar error controlado sin venta parcial.
- [ ] Verificar `401`, `403`, idempotencia, permisos de UI y persistencia PostgreSQL.
- [ ] Confirmar que React no usa puertos internos ni CSRF/cookies del monolito para estos flujos.

## Límites actuales

No se ejecutan aún las pruebas funcionales por decisión del equipo. Los pasos T203, T205–T210 y T216 conservan ese estado pendiente. Catalog ya define API de negocio, rutas específicas de Gateway y vistas React migradas en código; faltan los permisos `catalogo.ver`, `catalogo.gestionar`, `recetas.ver` y `recetas.gestionar` en Security y la configuración local de los servicios. Orders tiene API de registro/edición y base propia, pero aún faltan T212 (estados y entrega), T211/T213 (vista existente), permisos y su ruta de Gateway. La entrega requiere el contrato de saldo de Payment y existencias de Inventory, previstos para Sprint 3; no se debe habilitar antes de tener esas verificaciones. El Gateway usa resolución DNS dinámica para poder iniciar aunque el archivo Compose de Catalog no esté incluido; las solicitudes a Catalog requieren ese contenedor. Las rutas anidadas del monolito siguen en su fallback. La interfaz de Ventas mantiene alta/edición deshabilitadas mientras Catalog no devuelva un listado compatible.
