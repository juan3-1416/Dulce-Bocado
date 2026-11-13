# Sprint 2 — Avance y pruebas de cierre

Este es el registro único de avances y pruebas del Sprint 2. Actualizar este archivo con cada cambio, sin crear un informe nuevo por tarea. El 13-11-2026 se inició una validación parcial de Ventas con servicios reales; las pruebas restantes siguen abiertas hasta el cierre del sprint.

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
| T214–T215 | Integración API validada parcialmente | Sales operó con Customer, Catalog y Security reales por Gateway: alta, consulta, edición, anulación, cálculo e idempotencia. Suite aislada: 48 pruebas/138 aserciones. | Completar casos negativos entre contenedores y persistencia tras reinicio. |
| T216 | En desarrollo | Formulario existente de Ventas adaptado a `sales-service`; usa el listado de presentaciones de Catalog por Gateway, distingue producto y presentación, permite reintentar la consulta y refresca precios al abrir. El formulario conserva la clave idempotente al reintentar el mismo envío; la venta ocasional no depende del listado de Customer. Build React aprobado y API real comprobada; la pantalla solo se abrió hasta el inicio de sesión. | Recorrer listado, alta, edición, detalle, anulación, errores y permisos desde la interfaz React. |

## Contratos que deben coincidir

- Customer: `GET /api/clientes?estado=1` y operaciones CRUD por Gateway con Bearer. Permisos `clientes.ver`, `clientes.crear`, `clientes.modificar`, `clientes.cambiar_estado`.
- Catalog para la vista de Ventas: `GET /api/presentaciones` debe devolver `{ "presentaciones": [...] }` con `presentacion_id` entero, `nombre`, `precio` decimal, `moneda: "BOB"`, `disponible` y `permite_personalizacion` booleanos. El contrato interno `GET /api/presentaciones/{id}` debe devolver `{ "presentacion": {...} }` con esos mismos campos, protegido por clave interna y actor validado.
- Catalog usa `catalogo.ver` para lectura y `catalogo.gestionar` para escritura. `CATALOG_INTERNAL_KEY` debe coincidir con la clave configurada por Sales para consultar el detalle interno. En la validación local los permisos de Catalog y Clientes se sembraron explícitamente en Security; comprobar que la preparación de un entorno nuevo los incluya.
- Sales: `POST /api/ventas` y `PUT /api/ventas/{id}` reciben cliente, observaciones e `items: [{ presentacion_id, cantidad }]`; Sales calcula total, precio y snapshot. No enviar costo, precio ni personalización desde React.
- La vista de Ventas valida el formato decimal de Catalog como lo exige Sales, muestra el nombre de producto junto a la presentación y vuelve a consultar el listado antes de abrir el formulario. Si Catalog falla o no hay presentaciones disponibles, el alta y la edición siguen cerradas y se ofrece reintentar. Una venta antigua con cliente o presentación desactivados exige elegir una opción vigente antes de guardar. Si Customer falla al listar clientes, se informa y queda disponible la venta ocasional; Sales mantiene su validación del cliente registrado en el servidor.
- La clave `Idempotency-Key` se conserva en el formulario mientras se reintenta exactamente el mismo contenido; un cambio de contenido genera una clave nueva. La anulación aplica la misma regla mientras su diálogo permanezca abierto y muestra los errores dentro del diálogo. Esto evita duplicar una operación cuando se pierde la respuesta y el usuario reintenta sin cerrar el diálogo.
- La vista de catálogo monolítica modela presentaciones globales que se vinculan a productos. El nuevo esquema hace que cada presentación pertenezca a un producto. T206 debe adaptar la interacción existente a esa relación, sin copiar las rutas de vinculación del monolito.
- Inventario sigue consumiendo `productoService.js` legado hasta su migración posterior; la vista nueva de Catálogo usa `catalogoProductoService.js` para no cambiar ese flujo fuera del Sprint 2.
- Recetas usan `presentacion_id` directamente, sin la tabla puente `producto_presentacion` del monolito. `GET /api/presentaciones/{id}/receta` expone la receta por API; los ingredientes se guardan en una transacción local con cantidades positivas y materias primas activas. Las vistas existentes reciben una adaptación de nombres para conservar su presentación visual.
- Producción e Inventario conservan `recetaService.js` y `materiaPrimaService.js` legados. Las vistas de Sprint 2 usan `catalogoRecetaService.js` y `catalogoMateriaPrimaService.js` hasta la migración de esos módulos.

## Pruebas a ejecutar al cierre del Sprint 2

### Entorno y compilación

- [x] Ejecutar `npm run build` del frontend con las dependencias instaladas.
- [x] Preparar los `.env` locales sin registrar secretos; generar `APP_KEY` de Customer y Catalog.
- [x] Validar Compose conjunto con Security, Customer, Catalog y Sales; levantar contenedores y comprobar salud.
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
- [ ] Rechazar cliente o presentación inexistente, transiciones inválidas y dependencias caídas.
- [ ] Cambiar estado, registrar entrega y conservar el histórico de precio.

### Ventas — T214–T216 / PS2-14–19

- [ ] Crear, listar, consultar, editar borrador y anular venta desde React → Gateway → Sales.
- [ ] Reintentar carga de Catalog tras una caída y abrir el formulario con presentaciones vigentes; mostrar producto y presentación sin ambigüedad.
- [ ] Abrir un borrador con cliente o presentación ahora inactivos y exigir una opción vigente antes de guardar.
- [ ] Reintentar el mismo alta/edición/anulación tras perder la respuesta: verificar que la clave idempotente y el registro no cambien; cambiar el contenido y comprobar que se usa otra clave.
- [ ] Registrar una venta ocasional cuando el listado de Customer no responda; mantener bloqueado el registro con cliente registrado sin datos válidos.
- [x] Comprobar por API el total y snapshot histórico tras cambiar el precio en Catalog; repetir también desde React al cierre.
- [ ] Probar venta con cliente registrado activo y ocasional; rechazar inactivo.
- [ ] Simular caída de Customer/Catalog/Security y confirmar error controlado sin venta parcial.
- [ ] Verificar `401`, `403`, idempotencia, permisos de UI y persistencia PostgreSQL.
- [ ] Confirmar que React no usa puertos internos ni CSRF/cookies del monolito para estos flujos.

## Validación parcial de Ventas — 13-11-2026

Entorno local: `docker compose` con los archivos base, Sprint 1, Sprint 2 Sales, Customer y Catalog. Se prepararon `.env` ignorados por Git para Customer y Catalog y se alinearon las claves internas de Sales, Customer, Catalog y Security sin registrar sus valores. Las migraciones de Customer y Catalog se aplicaron sin borrar datos. En Security se ejecutaron explícitamente `CatalogoPermisosSeeder`, `ClientesPermisosSeeder` y `AdministradorInicialSeeder`; el seeder principal todavía no los reúne para una instalación nueva.

| Comprobación | Resultado observado | Estado |
|---|---|---|
| Gateway `/health`, frontend y rutas de Sales/Catalog sin token | Gateway y frontend `200`; `/api/ventas` y `/api/presentaciones` `401` sin Bearer. | Aprobado |
| Autenticación y permisos de administrador | Login y `/api/auth/me` `200`; permisos `ventas.crear`, `catalogo.ver` y `clientes.ver` presentes tras los seeders explícitos. | Aprobado localmente |
| Contrato Customer/Catalog/Sales real por Gateway | Cliente, categoría, producto y presentación ficticios creados con `201`; listado de presentaciones `200`; venta registrada con `201`, total `25.00` para 2 unidades a `12.50`. | Aprobado por API |
| Idempotencia, edición y anulación | Repetición exacta del POST con la misma clave devolvió el mismo ID; PUT cambió cantidad a 3 y total a `37.50`; GET conservó precio unitario `12.50`; anulación devolvió `CANCELADA`. | Aprobado por API |
| Snapshot tras cambio de precio | Presentación ficticia #1: PUT `200`, precio vigente `13.50`; venta ficticia #6 conservó precio `12.50` y total `25.00`. | Aprobado por API |
| Suite Sales y persistencia durante pruebas | `php artisan test --compact`: 48 aprobadas, 138 aserciones. Después de fijar `--database=sqlite` y la barrera de conexión, la venta ficticia #6 siguió en PostgreSQL (`count=1`). | Aprobado |
| Compilación e interfaz | Vite compiló 118 módulos; la página local de inicio de sesión cargó. No se recorrió el formulario de Ventas desde React. | Parcial |

**Incidente de datos local:** las primeras ejecuciones de PHPUnit se conectaron a `dulce_sales` de desarrollo a pesar de declarar SQLite en `phpunit.xml`; `RefreshDatabase` vació la tabla `venta`. Se observó que la venta ficticia previa dejó de existir. No hay un respaldo de esos registros en este trabajo y no se afirma que se hayan recuperado. El aislamiento quedó corregido en `tests/TestCase.php`, `tests/Feature/VentaApiTest.php` y `phpunit.xml`, y se comprobó con una venta ficticia persistente antes y después de la suite. No ejecutar copias antiguas de la suite dentro del contenedor con `DB_CONNECTION=pgsql`.

### Contención y consistencia tras el incidente

- El equipo confirmó que los registros eliminados eran solo datos de desarrollo. El repositorio contiene únicamente `backup_antes_demo_20260924.sql` del monolito, anterior a `sales-service`; no es una copia de `dulce_sales`. Solo existe un volumen Docker de Sales y `archive_mode` de PostgreSQL está `off`. Sin una copia externa no se pueden recuperar con certeza los registros eliminados. No importar el respaldo monolítico en Sales: sus tablas, identificadores y relaciones pertenecen a otra arquitectura.
- Estado observado de `dulce_sales`: una venta ficticia de desarrollo (#6), un detalle y una clave idempotente. La venta está en `BORRADOR`, total `25.00 BOB`. Auditoría SQL: cero detalles huérfanos, cero subtotales o totales discordantes y cero respuestas idempotentes que apunten a ventas inexistentes. Por las API de Customer y Catalog, el cliente #1 y la presentación #1 existen y están activos. El precio histórico `12.50` difiere correctamente del precio vigente `13.50`.
- Copia lógica del estado actual en `local-backups/sprint2_ventas_baseline_20261113.zip`, ignorada por Git. Incluye `dulce_sales` y `dulce_customers` en formato `pg_dump -Fc`, más `dulce_catalog` en SQL. Se comprobaron los dos catálogos de `pg_restore`, la presencia de tablas en MySQL y la coincidencia SHA-256 de cada archivo dentro del ZIP. SHA-256 del ZIP: `3911F26C9B0B0876036F8903B8EF832A137B2B5C52D217C2D6459E4F420E19C9`. Es una base de recuperación **desde el estado actual**; no contiene las ventas perdidas ni la base de Security. Las tres copias se tomaron consecutivamente, sin transacción distribuida.
- La ejecución reproducible de las 48 pruebas ahora usa SQLite en memoria; `VentaApiTest` fija `--database=sqlite` antes de cualquier `migrate:fresh`. Se repitió la suite completa y se comprobó por SQL que la venta #6 seguía en PostgreSQL (`count=1`). El README de Sales ya no recomienda forzar PostgreSQL para esa suite.
- `php artisan ventas:auditar` es una orden de solo lectura en Sales. Se ejecutó contra PostgreSQL y devolvió código `0` con cuatro contadores en `0` (detalles huérfanos, subtotales, totales y respuestas idempotentes sin venta). Repetirla antes de seguir el desarrollo y después de restaurar datos; comprobar aparte las referencias externas por las API de sus dueños.

## Límites actuales

T216 sigue pendiente de validación funcional completa en React. Faltan los casos de permisos sin rol en contenedores reales, caídas de dependencias, cliente/presentación inactivos en la pantalla y persistencia tras reiniciar PostgreSQL/Sales. La venta de Sprint 2 continúa siendo un borrador: no incorpora pagos, inventario ni Pedidos. El Gateway usa resolución DNS dinámica para arrancar sin Catalog, pero las solicitudes de Catalog requieren su contenedor. Las rutas anidadas del monolito siguen en su fallback.
