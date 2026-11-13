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
| T214–T215 | Integración API validada parcialmente | Sales operó con Customer, Catalog y Security reales por Gateway: alta, consulta, edición, anulación, cálculo e idempotencia. Suite aislada: 48 pruebas/138 aserciones. Persistencia comprobada tras reiniciar Sales y PostgreSQL. | Completar casos negativos entre contenedores. |
| T216 | Flujo principal y fallos parciales validados | Formulario existente de Ventas adaptado a `sales-service`; usa presentaciones de Catalog, distingue producto y presentación y conserva claves idempotentes para reintentos. Desde React se comprobó listado, alta, detalle, edición, anulación, filtro `CANCELADA`, recuperación de Catalog y venta ocasional sin Customer por Gateway. Se corrigió una carrera entre consultas al cambiar filtros y página. | Probar reintentos idempotentes ante respuesta perdida, clientes/presentaciones inactivos, permisos por rol y cambios rápidos de filtro desde la interfaz al cierre. |

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

- [x] Crear, listar, consultar, editar borrador y anular venta desde React → Gateway → Sales con dependencias reales.
- [x] Reintentar carga de Catalog tras una caída y abrir el formulario con presentaciones vigentes; mostrar producto y presentación sin ambigüedad.
- [ ] Abrir un borrador con cliente o presentación ahora inactivos y exigir una opción vigente antes de guardar.
- [ ] Reintentar el mismo alta/edición/anulación tras perder la respuesta: verificar que la clave idempotente y el registro no cambien; cambiar el contenido y comprobar que se usa otra clave.
- [x] Registrar una venta ocasional cuando el listado de Customer no responda.
- [ ] Comprobar en la interfaz que el registro con cliente registrado sin datos válidos queda bloqueado.
- [x] Comprobar por API el total y snapshot histórico tras cambiar el precio en Catalog; repetir también desde React al cierre.
- [ ] Probar venta con cliente registrado activo y ocasional; rechazar inactivo.
- [ ] Simular caída de Customer/Catalog/Security y confirmar error controlado sin venta parcial.
- [x] Verificar `401`, `403` e idempotencia en la suite aislada de Sales; conservar datos locales al ejecutarla.
- [x] Reiniciar PostgreSQL y Sales sin borrar el volumen; conservar ventas, detalles, precios históricos y claves idempotentes.
- [ ] Verificar los controles de la interfaz con un usuario sin permisos de Ventas.
- [ ] Cambiar rápidamente el filtro de estado desde una página posterior; confirmar que solo se muestran el listado y la paginación de la consulta más reciente.
- [x] Confirmar en los servicios React de Ventas, Clientes y Catálogo que usan `VITE_API_URL` o `localhost:8080`, Bearer y ninguna ruta interna ni CSRF/cookie del monolito.

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
| Compilación e interfaz | Vite compiló 118 módulos. El 13-11-2026 se recorrió el flujo principal de Ventas desde React; ver evidencia T216 abajo. | Aprobado en flujo principal |
| Repetición segura de la suite y persistencia | Antes y después de `php artisan test --compact`: 3 ventas, 3 detalles y 5 registros de idempotencia en PostgreSQL. Suite: 48 aprobadas, 138 aserciones. Tras reiniciar `sales-db` y `sales-service`, se conservaron los mismos conteos, estados, totales y precios históricos; ambos contenedores quedaron saludables. `ventas:auditar` informó cuatro contadores en cero. | Aprobado sin navegador |

**Incidente de datos local:** las primeras ejecuciones de PHPUnit se conectaron a `dulce_sales` de desarrollo a pesar de declarar SQLite en `phpunit.xml`; `RefreshDatabase` vació la tabla `venta`. Se observó que la venta ficticia previa dejó de existir. No hay un respaldo de esos registros en este trabajo y no se afirma que se hayan recuperado. El aislamiento quedó corregido en `tests/TestCase.php`, `tests/Feature/VentaApiTest.php` y `phpunit.xml`, y se comprobó con una venta ficticia persistente antes y después de la suite. No ejecutar copias antiguas de la suite dentro del contenedor con `DB_CONNECTION=pgsql`.

### Contención y consistencia tras el incidente

- El equipo confirmó que los registros eliminados eran solo datos de desarrollo. El repositorio contiene únicamente `backup_antes_demo_20260924.sql` del monolito, anterior a `sales-service`; no es una copia de `dulce_sales`. Solo existe un volumen Docker de Sales y `archive_mode` de PostgreSQL está `off`. Sin una copia externa no se pueden recuperar con certeza los registros eliminados. No importar el respaldo monolítico en Sales: sus tablas, identificadores y relaciones pertenecen a otra arquitectura.
- Estado observado al tomar el respaldo: una venta ficticia de desarrollo (#6), un detalle y una clave idempotente. La venta está en `BORRADOR`, total `25.00 BOB`. Auditoría SQL: cero detalles huérfanos, cero subtotales o totales discordantes y cero respuestas idempotentes que apunten a ventas inexistentes. Por las API de Customer y Catalog, el cliente #1 y la presentación #1 existen y están activos. El precio histórico `12.50` difiere correctamente del precio vigente `13.50`.
- Copia lógica del estado actual en `local-backups/sprint2_ventas_baseline_20261113.zip`, ignorada por Git. Incluye `dulce_sales` y `dulce_customers` en formato `pg_dump -Fc`, más `dulce_catalog` en SQL. Se comprobaron los dos catálogos de `pg_restore`, la presencia de tablas en MySQL y la coincidencia SHA-256 de cada archivo dentro del ZIP. SHA-256 del ZIP: `3911F26C9B0B0876036F8903B8EF832A137B2B5C52D217C2D6459E4F420E19C9`. Es una base de recuperación **desde el estado actual**; no contiene las ventas perdidas ni la base de Security. Las tres copias se tomaron consecutivamente, sin transacción distribuida.
- La ejecución reproducible de las 48 pruebas ahora usa SQLite en memoria; `VentaApiTest` fija `--database=sqlite` antes de cualquier `migrate:fresh`. Se repitió la suite completa y se comprobó por SQL que la venta #6 seguía en PostgreSQL (`count=1`). El README de Sales ya no recomienda forzar PostgreSQL para esa suite.
- `php artisan ventas:auditar` es una orden de solo lectura en Sales. Se ejecutó contra PostgreSQL y devolvió código `0` con cuatro contadores en `0` (detalles huérfanos, subtotales, totales y respuestas idempotentes sin venta). Repetirla antes de seguir el desarrollo y después de restaurar datos; comprobar aparte las referencias externas por las API de sus dueños.

### Evidencia T216 en React — 13-11-2026

- Con el administrador de Security se abrió `/ventas`. La vista mostró la venta ficticia #6 y habilitó “Nueva Venta” tras cargar la presentación vigente de Catalog y el cliente activo de Customer.
- Se creó la venta ficticia #7 con cliente registrado #1, presentación #1, dos unidades y observación de prueba. React mostró “Venta registrada correctamente” y total `27.00 BOB`; el detalle presentó cantidad `2`, precio `13.50` y subtotal `27.00`.
- Se editó el borrador #7 a cliente ocasional “Cliente T216 UI” y tres unidades. React mostró “Venta actualizada correctamente” y total `40.50 BOB`. La anulación con motivo válido mostró confirmación y estado `CANCELADA`.
- El filtro “Anulada” enviaba antes `ANULADA`, rechazado por Sales con `422`. La vista ahora envía `CANCELADA`: la API devuelve `200` y el filtro en React muestra únicamente la venta #7 cancelada, total `1`. Se limpió la paginación anterior durante la carga para evitar un total transitorio obsoleto.
- Los tres servicios React involucrados usan la URL del Gateway (`VITE_API_URL` o `localhost:8080`) y Bearer; la inspección de código no encontró puertos internos, CSRF ni cookies del monolito en este flujo. Tras las operaciones, `ventas:auditar` devolvió cuatro contadores en `0`; PostgreSQL conserva #6 `BORRADOR` por `25.00` y #7 `CANCELADA` por `40.50`.
- La copia `local-backups/sprint2_ventas_baseline_20261113.zip` se tomó **antes** de crear #7 y no contiene esa venta de prueba. El frontend de desarrollo necesitó reiniciarse para invalidar el módulo antiguo de Vite; la compilación final pasó con 118 módulos.
- Con Catalog detenido, la pantalla ya abierta bloqueó alta y edición, mantuvo la consulta histórica de #7 y ofreció “Reintentar Catálogo”. Tras restaurar Catalog, el botón volvió a cargar la presentación vigente y habilitó el formulario. La recarga completa del navegador durante la caída no se pudo verificar de forma concluyente; queda pendiente si se necesita cubrir ese caso.
- Con Customer detenido, “Nueva Venta” mostró “No se pudo conectar con Clientes” y permitió elegir cliente ocasional. Se registró la venta ficticia #8 con “Cliente ocasional T216 sin Customer”, una unidad a `13.50 BOB`; la pantalla mostró `BORRADOR` y total `13.50`. La validación de cliente registrado sin opción vigente permanece en el código del formulario; su rechazo interactivo no se volvió a ejecutar durante esta prueba. Customer fue restaurado y quedó saludable.
- Los servicios React de Catalog, Customer y Sales convierten fallos de conexión en mensajes de error en español. Si falla el listado de Sales, la vista deja de indicar falsamente que no hay ventas y ofrece “Reintentar ventas”. El build de React compiló 118 módulos en el contenedor. Tras registrar #8, `ventas:auditar` devolvió cero detalles huérfanos, subtotales incorrectos, totales incorrectos y reintentos sin venta.

### Verificación sin navegador — 13-11-2026

- Los archivos de pruebas de Sales permanecen en `microservices/sales-service/tests`. La suite usa `sqlite` en memoria y `VentaApiTest` impide migraciones sobre otra conexión. Se contaron los registros de `dulce_sales` antes y después de ejecutarla: `venta=3`, `detalle_venta=3`, `venta_idempotencia=5` en ambos momentos. Pasaron 48 pruebas y 138 aserciones. Esto verifica que la suite actual no volvió a vaciar la base local; no recupera los datos de desarrollo perdidos antes de la corrección.
- Se reiniciaron `sales-db` y `sales-service` sin borrar el volumen. Ambos quedaron saludables. Antes y después se observaron #6 `BORRADOR` por `25.00`, #7 `CANCELADA` por `40.50` y #8 `BORRADOR` por `13.50`; detalles con snapshots `12.50`, `13.50` y `13.50` respectivamente. Los conteos siguieron en `3/3/5`. `ventas:auditar` devolvió cuatro contadores en cero.
- Permanecen pendientes los casos que dependen del comportamiento de la interfaz, como permisos de usuario sin rol, selecciones inactivas y reintento tras perder una respuesta. No se ejecutó navegador para esta verificación.
- La vista reutilizada de Ventas ahora invalida respuestas antiguas del listado y reinicia la página en el mismo cambio de filtro. Se evita que una consulta tardía sobrescriba la lista o paginación más reciente. `npm run build` compiló 118 módulos; `oxlint` del archivo informó cero errores y dos advertencias existentes por cargas iniciales en efectos. La interacción rápida queda pendiente de la validación final de interfaz; no se usó navegador para este ajuste.

## Límites actuales

T216 tiene aprobado el flujo principal en React, la recuperación de Catalog desde la pantalla abierta y la venta ocasional sin Customer. La suite aislada y la persistencia tras reiniciar PostgreSQL/Sales también quedaron verificadas sin navegador. Aún faltan permisos sin rol en contenedores reales, caída de Security, cliente/presentación inactivos en la pantalla, reintentos idempotentes tras perder respuesta y la interacción rápida de filtros después del ajuste de concurrencia. La venta de Sprint 2 continúa siendo un borrador: no incorpora pagos, inventario ni Pedidos. El Gateway usa resolución DNS dinámica para arrancar sin Catalog, pero las solicitudes de Catalog requieren su contenedor. Las rutas anidadas del monolito siguen en su fallback.
