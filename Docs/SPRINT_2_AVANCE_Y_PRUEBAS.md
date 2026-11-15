# Sprint 2 — Avance y pruebas de cierre

Este es el registro único de avances y pruebas del Sprint 2. Actualizar este archivo con cada cambio, sin crear un informe nuevo por tarea. La validación integrada del 13-11-2026 cubrió Ventas, Pedidos, Gateway y persistencia. El estado vigente y la evidencia disponible se distinguen de las verificaciones adicionales.

## Estado vigente para el equipo — 15-11-2026

Estado consolidado después de integrar el commit `5bb44d9` de `dev-jp` y las verificaciones locales del 15-11-2026. Cada bloque de evidencia conserva su fecha; no atribuir las pruebas de un servicio a otro.

- **Ventas T214–T216:** implementación y flujo principal de React cerrados funcionalmente. Sales conserva solo sus datos de ventas; Pedidos permanece en `order-service`.
- **Gateway T217:** cerrado; el frontend accede a las API migradas mediante Gateway. El 15-11-2026 se corrigió el arranque dependiente de servicios ausentes mediante resolución DNS en cada solicitud y se verificaron Ventas, Pedidos y Clientes por sus rutas.
- **T218:** continúa abierta, aunque PS2-02 ya pasó con dependencias reales tanto en Sales como en Orders. PS2-15 tiene prueba por API y PS2-19 está comprobada para Sales. Vincular resultados detallados de las pruebas reportadas aprobadas que solo aparecen en el resumen. Confirmar si el criterio exige evidencia visual de PS2-15/T213 o persistencia de Customer y Order.
- **Pruebas ya registradas:** PS2-08, PS2-09, PS2-10, PS2-16, PS2-17, PS2-18 y PS2-20 tienen evidencia integrada en la sección final. Conservarla sin repetir pruebas destructivas.
- **Siguiente trabajo verificable:** sustituir las pruebas copiadas de Sales dentro de `order-service/tests` por casos propios de Pedidos y consolidar la evidencia restante de T218. La suite de Orders ya tiene una barrera que fuerza SQLite en memoria, pero todavía no representa correctamente sus rutas y tablas. No añadir lógica de Pedidos a Sales.

- **Dónde tomar el avance:** esta integración está en la rama local `devFabian`. Después de publicarla en `origin/devFabian`, el otro desarrollador podrá hacer `git fetch origin devFabian` e integrarla según el flujo del equipo. Esta guía concentra el estado vigente; `microservices/sales-service/README.md` y `Docs/ROADMAP_SPRINT_2_SALES_SERVICE.md` contienen planificación histórica.

- **Alcance implementado:** Sales posee únicamente `dulce_sales`, `venta`, `detalle_venta` y `venta_idempotencia`. T214–T215 cubren API de borradores, total decimal calculado por Sales, snapshots de Catalog, cliente registrado validado por Customer u ocasional, permisos de Security, transacción local e idempotencia. T216 reutiliza la vista React del monolito para listar, consultar, crear, editar y anular mediante Gateway. La parte de Ventas de T217 enruta `/api/ventas` y `/api/ventas/{id}` al servicio; `/api/internal/introspect` no es pública. Pagos, stock, confirmación y Pedidos no pertenecen a este incremento de Sales.

- **Rutas y permisos:** `GET /api/ventas` y `GET /api/ventas/{id}` requieren `ventas.ver`; `POST /api/ventas`, `PUT /api/ventas/{id}` y `POST /api/ventas/{id}/anular` requieren respectivamente `ventas.crear`, `ventas.modificar` y `ventas.anular`. Las escrituras exigen `Idempotency-Key` de 16–128 caracteres. El estado editable es `BORRADOR`; la anulación produce `CANCELADA` y exige motivo de 3–500 caracteres. IDs de venta mal formados o fuera de rango devuelven `404`. React entra por `/ventas`, usa Bearer y `VITE_API_URL` o `http://localhost:8080` como Gateway.

- **Archivos de trabajo:** `microservices/sales-service/app/Services/Ventas/VentaService.php`, `app/Http/Controllers/VentaController.php`, `routes/api.php`, `tests/Feature/VentaApiTest.php`; `frontend/src/pages/ventas/VentasPage.jsx`, `VentaModal.jsx` y `frontend/src/services/ventaService.js`. Los adaptadores de Customer y Catalog de Sales están en `app/Services/Clientes` y `app/Services/Catalogo`. No consultar sus bases desde Sales ni añadir FK entre servicios.

- **Arranque conjunto:** configurar los `.env` locales ignorados por Git y las `APP_KEY` antes de iniciar; desde la raíz, validar con `docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.customer.yml -f docker-compose.sprint2.catalog.yml -f docker-compose.sprint2.order.yml -f docker-compose.sprint2.sales.yml config --services`, luego usar esos mismos `-f` con `up -d --build`. Aplicar `php artisan migrate --force` en cada servicio con su propia base, sin `migrate:fresh` sobre datos existentes. La misma credencial interna de Security debe estar en `INTERNAL_SERVICE_KEY` de Security y Sales, y en `SECURITY_SERVICE_KEY` de Customer/Catalog; `CUSTOMER_SERVICE_KEY` de Sales debe coincidir con `CUSTOMER_INTERNAL_KEY` de Customer, y `CATALOGO_SERVICE_KEY` de Sales con `CATALOG_INTERNAL_KEY` de Catalog. No copiar valores al repositorio.

- **Permisos en Security:** en una instalación nueva, después de las migraciones ejecutar `php artisan db:seed` con `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` configurados. `DatabaseSeeder` crea los permisos de Clientes, Catálogo, Ventas y Pedidos antes de `AdministradorInicialSeeder`, que asigna al administrador configurado sus permisos. El seeder de Pedidos también busca `ADMIN_USERNAME` cuando se ejecuta por separado en una instalación existente. No ejecutar `db:seed` completo sobre una instalación existente sin revisar las variables del administrador: `AdministradorInicialSeeder` actualiza sus datos y contraseña. Para agregar solo permisos de Pedidos, ejecutar `php artisan db:seed --class=PedidosPermisosSeeder` con `ADMIN_USERNAME` configurado. Verificar después los permisos efectivos del usuario.

- **Entorno local de Orders:** se creó `microservices/order-service/.env` a partir de la plantilla, con `APP_KEY` nueva y claves internas alineadas con Security, Customer y Catalog; está ignorado por Git y no se publica. Se construyó Orders, se aplicó su migración inicial con `migrate --force` y se ejecutó solo `PedidosPermisosSeeder`. La base `dulce_orders` es nueva en este equipo y conserva `0` pedidos y `0` detalles después de PS2-02. Cada desarrollador debe preparar su propio `.env`.

- **Evidencia vigente:** suite aislada de Sales **51 pruebas/167 aserciones** en SQLite en memoria; último build React: 118 módulos. En la base local de este equipo, `ventas:auditar` devolvió cuatro ceros y los conteos antes/después de la suite fueron 3 ventas, 3 detalles y 5 registros de idempotencia. Se comprobó persistencia tras reiniciar Sales y PostgreSQL. Son datos ficticios locales y no viajan con Git. El respaldo `local-backups/sprint2_ventas_baseline_20261113.zip` está ignorado por Git, precede a las ventas de prueba #7 y #8 y **no** estará disponible tras hacer pull; cada entorno debe crear su propia copia verificada antes de cambios de esquema o restauraciones. Al preparar esta entrega, el proyecto Compose estaba detenido; estos resultados son de la última ejecución verificada y una auditoría nueva requiere levantar el stack.

## Estado del desarrollo

Esta tabla resume el estado funcional reportado el 13-11-2026. Una prueba PS2 aprobada no implica que todas las verificaciones adicionales de interfaz del listado posterior estén ejecutadas.

| Tareas | Estado registrado | Evidencia y cierre pendiente |
|---|---|---|
| T201–T203 · Clientes | Implementación integrada; PS2-01 y PS2-02 aprobadas | PS2-02 se verificó por API con Sales y Orders; las verificaciones adicionales de UI siguen identificadas abajo. |
| T204–T208 · Catálogo y recetas | Implementación integrada; PS2-03–06 y PS2-20 reportadas aprobadas | Conservar evidencia de API y persistencia; las verificaciones adicionales de UI siguen identificadas abajo. |
| T209–T213 · Pedidos | Flujos de API y React implementados; PS2-07–13 reportadas aprobadas | Registrar prueba manual de T213 si se exige como criterio de cierre. Pedidos pertenece a `order-service`. |
| T214–T215 · Sales | Cerradas funcionalmente; PS2-14, PS2-16 y PS2-18 aprobadas | Suite aislada: 51 pruebas/167 aserciones. PS2-15 tiene evidencia por API y PS2-19 para Sales. |
| T216 · React Ventas | Cerrada funcionalmente | Alta, consulta, edición, anulación, filtros y manejo básico de dependencias probados en React. Casos adicionales de UI listados abajo. |
| T217 · Gateway | Cerrada; PS2-17 aprobada | Servicios migrados accesibles por Gateway, sin puertos internos en frontend. |
| T218 · Integración y documentación | Abierta | PS2-02 completada por API; vincular resultados detallados que faltan en esta guía, reemplazar la suite copiada de Orders y decidir la evidencia complementaria requerida para PS2-15, PS2-19 y T213. |

## Contratos que deben coincidir

- Customer: `GET /api/clientes?estado=1` y operaciones CRUD por Gateway con Bearer. Permisos `clientes.ver`, `clientes.crear`, `clientes.modificar`, `clientes.cambiar_estado`.

- Catalog para la vista de Ventas: `GET /api/presentaciones` debe devolver `{ "presentaciones": [...] }` con `presentacion_id` entero, `nombre`, `precio` decimal, `moneda: "BOB"`, `disponible` y `permite_personalizacion` booleanos. El contrato interno `GET /api/presentaciones/{id}` debe devolver `{ "presentacion": {...} }` con esos mismos campos, protegido por clave interna y actor validado.

- Catalog usa `catalogo.ver` para lectura y `catalogo.gestionar` para escritura. `CATALOG_INTERNAL_KEY` debe coincidir con la clave configurada por Sales para consultar el detalle interno. El `DatabaseSeeder` actualizado incluye los permisos de Catalog y Clientes para instalaciones nuevas.

- Sales: `POST /api/ventas` y `PUT /api/ventas/{id}` reciben cliente, observaciones e `items: [{ presentacion_id, cantidad }]`; Sales calcula total, precio y snapshot. No enviar costo, precio ni personalización desde React.

- La vista de Ventas valida el formato decimal de Catalog como lo exige Sales, muestra el nombre de producto junto a la presentación y vuelve a consultar el listado antes de abrir el formulario. Si Catalog falla o no hay presentaciones disponibles, el alta y la edición siguen cerradas y se ofrece reintentar. Una venta antigua con cliente o presentación desactivados exige elegir una opción vigente antes de guardar. Si Customer falla al listar clientes, se informa y queda disponible la venta ocasional; Sales mantiene su validación del cliente registrado en el servidor.

- La clave `Idempotency-Key` se conserva en el formulario mientras se reintenta exactamente el mismo contenido; un cambio de contenido genera una clave nueva. La anulación aplica la misma regla mientras su diálogo permanezca abierto y muestra los errores dentro del diálogo. Esto evita duplicar una operación cuando se pierde la respuesta y el usuario reintenta sin cerrar el diálogo.

- La vista de catálogo monolítica modela presentaciones globales que se vinculan a productos. El nuevo esquema hace que cada presentación pertenezca a un producto. T206 debe adaptar la interacción existente a esa relación, sin copiar las rutas de vinculación del monolito.

- Inventario sigue consumiendo `productoService.js` legado hasta su migración posterior; la vista nueva de Catálogo usa `catalogoProductoService.js` para no cambiar ese flujo fuera del Sprint 2.

- Recetas usan `presentacion_id` directamente, sin la tabla puente `producto_presentacion` del monolito. `GET /api/presentaciones/{id}/receta` expone la receta por API; los ingredientes se guardan en una transacción local con cantidades positivas y materias primas activas. Las vistas existentes reciben una adaptación de nombres para conservar su presentación visual.

- Producción e Inventario conservan `recetaService.js` y `materiaPrimaService.js` legados. Las vistas de Sprint 2 usan `catalogoRecetaService.js` y `catalogoMateriaPrimaService.js` hasta la migración de esos módulos.

## Verificaciones complementarias y pendientes de cierre

**Criterio de lectura al 15-11-2026:** esta lista reúne verificaciones funcionales y complementarias, además de las pruebas PS2. Las casillas abiertas indican que no hay evidencia específica de ese escenario en esta guía; no revocan las pruebas PS2 aprobadas en la validación integrada posterior del 13-11-2026. Las caídas reales de Customer, Catalog y Security, el `403` de Sales y el flujo principal de React ya se ejecutaron. La selección inactiva, los reintentos tras respuesta perdida y la interacción rápida de filtros permanecen como verificaciones de interfaz. No se realizaron pruebas nuevas al corregir este documento.

### Entorno y compilación

- [x] Ejecutar `npm run build` del frontend con las dependencias instaladas.

- [x] Preparar los `.env` locales sin registrar secretos; generar `APP_KEY` de Customer y Catalog.

- [x] Validar Compose conjunto con Security, Customer, Catalog y Sales; levantar contenedores y comprobar salud.

- [x] Aplicar migraciones sin borrar datos y verificar persistencia tras reinicio en los servicios ya probados; Sales y Catalog conservaron datos tras reiniciar sus bases.

### Clientes — T201–T203 / PS2-01–02

- [ ] Listar, buscar y filtrar activos/inactivos desde React → Gateway → Customer.

- [ ] Crear, consultar, editar, desactivar y reactivar cliente; comprobar errores `422` y duplicados.

- [ ] Verificar `401` sin token, `403` sin permiso y controles de UI por permiso.

- [x] Rechazar por API el cliente inactivo en un alta de Sales por Gateway; restaurar el estado del cliente y comprobar que no se creó venta.

- [x] Rechazar por API el cliente inactivo en un alta de Orders por Gateway; comprobar que no se creó pedido y restaurar el estado del cliente.

### Catálogo y recetas — T204–T208 / PS2-03–06, PS2-20

- [ ] Categorías, productos y presentaciones: alta, consulta, edición, desactivación y persistencia MySQL.

- [ ] Rechazar precio negativo; exigir producto válido para cada presentación y comprobar disponibilidad comercial.

- [ ] Confirmar contrato de listado y detalle de presentación por Gateway e internamente desde Sales.

- [ ] Registrar receta válida; rechazar insumo faltante, duplicado o cantidad no positiva; verificar vínculo único con presentación.

- [ ] Consultar y editar receta sin cambiar su presentación; activar/desactivar receta y materia prima.

- [ ] Verificar `GET /api/presentaciones/{id}/receta` por contrato interno y rechazar actor o clave inválidos.

- [ ] Migrar las vistas de Catálogo y Recetas del monolito a Gateway/Bearer sin rutas ni cookies legadas.

### Pedidos — T209–T213 / PS2-07–13

- [x] Rechazar un alta de pedido con cliente inactivo por Gateway sin persistir pedido ni detalle (parte de PS2-02).

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

- [x] Comprobar por API el total y snapshot histórico tras cambiar el precio en Catalog (PS2-15).

- [ ] Repetir PS2-15 desde React solo si se exige evidencia visual.

- [x] Probar venta con cliente registrado activo y ocasional.

- [x] Registrar evidencia integrada de rechazo de cliente inactivo en Sales (parte de PS2-02).

- [x] Simular caída real de Customer/Catalog/Security y confirmar `503` controlado sin venta parcial; el total de ventas permaneció sin cambios.

- [x] Verificar `401`, `403` e idempotencia en la suite aislada de Sales; conservar datos locales al ejecutarla.

- [x] Reintentar con la misma clave tras una caída simulada de Catalog; conservar el borrador cuando Customer rechaza una edición y completarla al reactivarlo.

- [x] Reiniciar PostgreSQL y Sales sin borrar el volumen; conservar ventas, detalles, precios históricos y claves idempotentes.

- [x] Verificar autorización real con usuario activo sin `ventas.ver`: Gateway → Sales respondió `403 PERMISO_DENEGADO`; se eliminó el token temporal de prueba.

- [ ] Probar manualmente el cambio rápido de filtro; la lógica de concurrencia/paginación está implementada y auditada en código.

- [ ] Probar manualmente el cambio de filtro desde una página posterior; el filtro `CANCELADA` ya fue probado.

- [x] Anular un borrador desde la interfaz con motivo válido y comprobar la regla mínima de 3 caracteres; 2 caracteres quedan bloqueados y el motivo válido deja la venta `CANCELADA`.

- [x] Confirmar en los servicios React de Ventas, Clientes y Catálogo que usan `VITE_API_URL` o `localhost:8080`, Bearer y ninguna ruta interna ni CSRF/cookie del monolito.

## Historial de validación de Ventas — 13-11-2026

En la validación original se usó `docker compose` con los archivos base, Sprint 1, Sprint 2 Sales, Customer y Catalog. Se prepararon `.env` ignorados por Git para Customer y Catalog y se alinearon las claves internas de Sales, Customer, Catalog y Security sin registrar sus valores. Las migraciones de Customer y Catalog se aplicaron sin borrar datos. En ese momento se ejecutaron explícitamente `CatalogoPermisosSeeder`, `ClientesPermisosSeeder` y `AdministradorInicialSeeder`; desde el 15-11-2026 el seeder principal también incluye esos permisos.

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

- Se añadieron dos casos a `VentaApiTest` sin crear otro archivo: tras una caída simulada de Catalog, un reintento con la misma clave crea una sola venta; con Customer inactivo, una edición rechazada conserva el total y detalles previos y la misma clave sirve después de reactivar el cliente. La suite de Sales pasó con **50 pruebas y 159 aserciones** sobre SQLite en memoria. En PostgreSQL local, antes y después siguieron `3` ventas, `3` detalles y `5` respuestas idempotentes; `ventas:auditar` volvió a informar cuatro contadores en cero. Son pruebas de contrato con dependencias simuladas, no sustituyen la caída real entre contenedores ni la comprobación de la vista.

- Se alineó la longitud mínima del motivo de anulación en la vista de Ventas con `AnularVentaRequest`: 3 caracteres. El botón y la validación local usan la misma constante. React compiló 118 módulos y `oxlint` informó cero errores; persisten dos advertencias ya registradas sobre las cargas iniciales en efectos. La comprobación interactiva de 2 y 3 caracteres queda para el cierre del sprint.

- El formulario existente comunica si guardó un alta o una edición. Después de un alta, la página vuelve al listado general en la primera página para mostrar la nueva venta; una edición conserva la ubicación. Si una anulación deja la página actual fuera del rango disponible, el listado consulta la última página válida. El build compiló 118 módulos y `oxlint` informó cero errores; las tres advertencias en los dos archivos corresponden a efectos de carga existentes. La interacción se comprobará al cierre del sprint sin adelantar pruebas de navegador.

- Observación resuelta en Sales: las rutas con `{venta}` exigen un identificador numérico y el controlador rechaza valores fuera del rango entero antes de consultar PostgreSQL. Se verificaron `GET`, `PUT` y anulación con ID no numérico o superior al límite: `404`, sin ventas ni claves nuevas. La suite aislada pasó con **51 pruebas y 167 aserciones**; los conteos locales siguieron en `3/3/5` y `ventas:auditar` informó cuatro ceros. Las pruebas integradas ejecutadas después se registran en la siguiente sección.

## Validación integrada adicional — 13-11-2026

Durante la misma jornada se completaron pruebas reales adicionales que actualizan el estado anterior de este documento:

| Prueba / tarea | Evidencia observada | Estado |
|---|---|---|
| **T216 — flujo funcional React de Ventas** | Alta con cliente registrado y ocasional, edición de `BORRADOR`, detalle, anulación con regla de 3 caracteres y filtros funcionando. | **Cerrada funcionalmente** |
| **PS2-16 — dependencias caídas** | Se detuvieron por separado `catalog-service`, `customer-service` y `security-service`. Sales devolvió error controlado (`503`) y no se creó ninguna venta parcial; el total antes/después permaneció igual. | **Aprobado** |
| **PS2-18 — autorización** | Usuario activo ID 2 sin `ventas.ver` recibió `403 PERMISO_DENEGADO` a través del Gateway. Se utilizó y eliminó un token temporal de prueba. | **Aprobado** |
| **T217 / PS2-17 — Gateway** | El frontend no contiene URLs a puertos internos; `authService`, Customer, Catalog, Orders y Sales usan `VITE_API_URL` o `http://localhost:8080`. Nginx enruta `/api/clientes`, `/api/categorias|productos|presentaciones|recetas|materias-primas`, `/api/pedidos` y `/api/ventas` a sus servicios. Build Vite: 118 módulos. | **Aprobado / Cerrado** |
| **PS2-20 — persistencia MySQL** | Se reinició `catalog-db`; la presentación #1 mantuvo ID `1`, nombre `Presentacion Integracion 192254` y precio `120.00`. | **Aprobado** |
| **PS2-10 — precio histórico de pedido** | Pedido #1 conserva `precio_unitario_snapshot = 130.00` mientras el precio actual de Catalog para la presentación #1 es `120.00`. | **Aprobado** |
| **PS2-08 — cliente inexistente** | Crear pedido con `id_cliente = 999999` devolvió `404`; consulta directa en Order confirmó `0` pedidos persistidos con esa prueba. | **Aprobado** |
| **PS2-09 — presentación inexistente** | Crear pedido con `id_producto_presentacion = 999999` devolvió `404`; consulta directa en Order confirmó `0` pedidos persistidos con esa observación. | **Aprobado** |
| **PS2-19 — persistencia PostgreSQL (Sales)** | `sales-db` estuvo detenido y luego fue recuperado; Sales volvió a `200` y la venta #1 permaneció intacta. La persistencia de Sales ya estaba además documentada con reinicios previos. | **Aprobado para Sales** |

### Estado de cierre PS2 al terminar esta sesión

- **Reportadas aprobadas en la sesión del 13-11-2026:** PS2-01, PS2-03, PS2-04, PS2-05, PS2-06, PS2-07, PS2-08, PS2-09, PS2-10, PS2-11, PS2-12, PS2-13, PS2-14, PS2-16, PS2-17, PS2-18 y PS2-20. Esta guía contiene pasos/resultados concretos de PS2-08, PS2-09, PS2-10, PS2-14, PS2-16, PS2-17, PS2-18 y PS2-20. Para el cierre formal de T218, vincular o agregar la evidencia de las demás sin asumir que el resumen sustituye los resultados detallados.
- **PS2-02 aprobada por API el 15-11-2026:** Sales y Orders rechazaron por Gateway al mismo cliente realmente desactivado con `409 CLIENTE_INACTIVO`; no se crearon ventas ni pedidos y el cliente recuperó su estado activo.
- **PS2-15:** el snapshot histórico de Venta ya fue comprobado por API anteriormente; repetir desde React solo si el criterio de cierre exige evidencia visual.
- **PS2-19:** persistencia PostgreSQL está comprobada en Sales; si la revisión docente exige cubrir explícitamente también Customer y Order, ejecutar reinicio y verificación de esos servicios.
- **T213:** backend de estados/entrega está validado; la implementación React está hecha. Solo queda registrar una prueba manual de UI si el equipo la considera obligatoria.

No volver a ejecutar `migrate:fresh` ni eliminar volúmenes para estas pruebas. Las caídas de servicios usadas en PS2-16 fueron restauradas al finalizar cada escenario.

## Validación PS2-02 en Sales — 15-11-2026

Se usaron Customer, Catalog, Security y Sales reales a través del Gateway, sin navegador. Para que Nginx pudiera arrancar su ruta de respaldo, se inició también el backend legado; no se usó para la operación de Ventas. La única cuenta de cliente activa (#1) se desactivó temporalmente y se reactivó dentro del mismo procedimiento. El token de prueba se cerró al finalizar.

| Comprobación | Resultado |
|---|---|
| Customer `GET /api/clientes?estado=1` | El cliente #1 dejó de aparecer mientras estaba inactivo; `GET /api/clientes/1` confirmó `estado=false`. |
| Sales `POST /api/ventas` con cliente #1 y presentación vigente | `409 CLIENTE_INACTIVO` por Gateway. El total de ventas permaneció en 3 antes y después. |
| Restauración de Customer | `PATCH /api/clientes/1/estado` devolvió el cliente a `estado=true`, confirmado por consulta posterior. |
| Consistencia de Sales | `venta/detalle_venta/venta_idempotencia = 3/3/5`; `php artisan ventas:auditar` informó cero detalles huérfanos, subtotales o totales incorrectos y reintentos sin venta. |

**Alcance de esta sesión:** se aprobó la parte de Sales. La sesión siguiente del mismo día completó Orders, como se detalla abajo. No se añadió funcionalidad de Pedidos a Sales.

## Validación PS2-02 en Orders y Gateway — 15-11-2026

Se preparó el `.env` local ignorado por Git de Orders, con `APP_KEY` nueva y claves internas coincidentes; se construyó el servicio, se aplicó su migración inicial sin borrar datos y se ejecutó `PedidosPermisosSeeder` de forma aislada. La primera consulta a `/api/pedidos` cayó en el backend legado porque la imagen de Gateway aún contenía la configuración antigua. Tras reconstruir Gateway, Orders respondió `200` con lista vacía. Después se corrigió la dependencia estática de Nginx respecto a backend y Sales; `nginx -t` pasó y Gateway inició con solo Security, Customer y Orders.

| Comprobación | Resultado |
|---|---|
| Customer por Gateway | El cliente #1 pasó temporalmente a `estado=false` y desapareció del listado activo. |
| Orders `POST /api/pedidos` con cliente #1 | `409 CLIENTE_INACTIVO` por Gateway; listado de pedidos `0 → 0` y conteo SQL `pedido/detalle_pedido = 0/0`. |
| Restauración de Customer | `PATCH /api/clientes/1/estado` devolvió `estado=true`, confirmado mediante `GET`. Se cerró el token temporal. |
| Enrutamiento tras el ajuste de Gateway | `GET /api/ventas` devolvió `200` y 3 ventas; `GET /api/pedidos` devolvió `200` y 0 pedidos; `GET /api/clientes?estado=1` devolvió `200` y 1 cliente. El backend legado estaba detenido. |

**Observaciones:** Docker Desktop se detuvo antes del primer intento de PS2-02 en Orders; no se había desactivado el cliente. Se reinició y se ejecutó la prueba completa con un grupo reducido de servicios. El `README.md` de Orders contenía instrucciones de Sales copiadas; se actualizó para describir Orders. La suite bajo `microservices/order-service/tests` aún incluye casos de Sales. Se añadió una barrera en `tests/TestCase.php` y en el único archivo que usa `RefreshDatabase` para forzar SQLite en memoria antes de cualquier migración; no se ejecutó la suite copiada porque no verifica Orders y su migración tiene sentencias propias de PostgreSQL incompatibles con SQLite.

## Límites actuales

T216 quedó cerrado funcionalmente en React y T217 quedó cerrado para el enrutamiento del Sprint 2. Las caídas reales de Customer, Catalog y Security, el `403` con usuario sin permiso y PS2-02 en Sales y Orders ya fueron verificados. Permanecen como verificaciones complementarias de interfaz la selección inactiva, el reintento tras perder deliberadamente una respuesta y el cambio muy rápido de filtros. T218 requiere dar trazabilidad a los resultados PS2 reportados sin detalle en esta guía y reemplazar la suite copiada de Orders antes de ejecutarla; PS2-15/T213 necesitan evidencia visual solo si ese es el criterio de cierre. La venta de Sprint 2 continúa siendo un borrador: no incorpora pagos, inventario ni Pedidos. No ampliar el alcance hacia Sprint 3.
