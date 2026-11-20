# Sprint 4 — Guía de desarrollo y pruebas

**Proyecto:** Dulce Bocado  \
**Duración prevista:** una semana, cinco jornadas de ocho horas  \
**Equipo:** Fabián Cuellar Salvatierra (Product Owner y desarrollador) y Juan Pablo Montoya Salinas (Scrum Master y desarrollador)  \
**Estado:** desarrollo parcial recibido; backlog revisado el 2026-11-19 contra `dev-jp` en `f0daadf`. T402 y T403 completadas en alcance técnico el 2026-11-19; aceptación integral del Sprint pendiente. Evidencia en [SPRINT_4_PRUEBAS_PAYMENT.md](SPRINT_4_PRUEBAS_PAYMENT.md).  \
**Documento formal:** [documentación Scrum](Documentacion_Scrum_Dulce_Bocado_FINAL_REGENERADO.docx), apartados 3.5 a 3.5.2.  \
**Bases de referencia:** [avance del Sprint 2](SPRINT_2_AVANCE_Y_PRUEBAS.md) y [avance del Sprint 3](avancesprint3.md).

## 1. Objetivo y alcance acordado

El Sprint 4 completa el flujo de **venta presencial, cobro y recibo interno** sobre los servicios existentes. La venta debe comprobar y descontar una sola vez las existencias del mostrador; el servicio de Pagos debe registrar importes en efectivo o QR, calcular el saldo y evitar sobrepagos; el recibo debe reflejar una operación confirmada. El pago QR de un pedido se asocia como anticipo sin alterar por sí solo el estado de entrega. Antes de aceptar ese flujo se verifica la integración de Inventario y Producción desarrollada en el Sprint 3.

| Historia | Trabajo incluido | Requisito |
| --- | --- | --- |
| HU10 — Ventas de mostrador | Completar la confirmación de los borradores de Sales, con verificación y descuento idempotente del mostrador. | R10 |
| HU11 — Pagos | Registrar uno o varios pagos positivos, consultar saldo y rechazar importes que excedan el total. | R11 |
| HU12 — Pagos por internet | Crear intención QR, consultar el resultado y asociar el pago confirmado a venta o pedido. El simulador permite pruebas; la conexión con proveedor real se evalúa por separado. | R12 |
| HU13 — Recibos internos | Generar, consultar, visualizar, imprimir, reimprimir y anular recibos internos según las reglas del pago. | R13 |
| HU16–HU19 — validación heredada | Ejecutar el flujo completo de Producción e Inventario y comprobar sus datos reales antes de usar el stock para confirmar ventas. | R16–R19 |

HU20 Contador de visitas, HU21 Temas, HU22 Dashboard y HU23 Reportes permanecen en el Product Backlog. No se incorporan silenciosamente a la capacidad de esta semana ni se presentan como entregados. Si surge capacidad adicional, su selección requiere ajustar el Sprint Backlog y conservar el Sprint Goal.

**Sprint Goal:** completar una venta presencial con stock consistente, pagos parciales controlados y recibo interno, además de registrar el resultado del pago QR mediante un adaptador. El objetivo se comprueba con servicios reales y datos persistidos. Un QR generado por el simulador demuestra el contrato de la aplicación, **no** una transacción financiera real.

## 2. Estado inicial que debe respetarse

> Esta sección describe la base previa al Sprint 4. El avance recibido y sus límites se registran en [AVANCE_SPRINT_4_DEV_JP.md](AVANCE_SPRINT_4_DEV_JP.md), con corte en `f0daadf`. Payment ya dispone de esquema y API inicial de efectivo; QR, recibos y aceptación integrada continúan pendientes.

- Sales, desarrollado en el Sprint 2, posee `dulce_sales` y gestiona borradores `BORRADOR` y anulaciones `CANCELADA`, con precios históricos e idempotencia. No descuenta stock, confirma ventas ni registra pagos en el estado documentado. El frontend de Ventas entra por Gateway con Bearer. Las escrituras existentes utilizan `Idempotency-Key`.
- Orders conserva pedidos y precios fijados al registrarlos. Customer y Catalog son propietarios de sus datos. Catalog utiliza MySQL; Security, Customer, Orders y Sales utilizan PostgreSQL.
- Inventory y Production cuentan con código integrado y suites aisladas (Inventory: 51 pruebas/246 aserciones; Production: 13 pruebas/79 aserciones), según el avance del Sprint 3. No hay todavía evidencia de aceptación integral del flujo, persistencia tras reinicio ni competencia concurrente por el último insumo. La configuración local de Inventory debe completarse antes de ejecutar el conjunto.
- El repositorio puede conservar rutas relativas del monolito para vistas legadas. Las nuevas vistas de Ventas y Pagos usarán Gateway/Bearer y no redirigirán globalmente el proxy `/api` de Vite.
- Las suites aisladas de Sales/Orders emplean SQLite en memoria, pero la aceptación integrada se verifica contra PostgreSQL. Una ejecución previa de pruebas de Security vació su base de desarrollo; comprobar conexión de testing y aislamiento antes de repetir esa suite.

## 3. Límites y propiedad de datos

| Servicio | Propiedad durante Sprint 4 | Integración |
| --- | --- | --- |
| Sales / PostgreSQL propia | Venta, detalle, total histórico, estado de confirmación y clave de operación de stock. | Consulta Inventory por API; consulta estado de pagos mediante Payment cuando lo necesite. |
| Orders / PostgreSQL propia | Pedido, detalle, total histórico, estado y entrega. | Proporciona total e identidad del pedido para el anticipo. |
| Inventory / PostgreSQL propia | Existencias y movimientos de los almacenes. | Descuenta mostrador mediante operación interna atómica e idempotente. |
| Payment / PostgreSQL propia | Pagos, intentos QR, resultados idempotentes y recibos internos. | Consulta el total congelado de Sales/Orders por API; adapta la pasarela QR. |
| Catalog / MySQL propia | Presentaciones, materias primas y recetas. | Sales conserva sus snapshots y no duplica la propiedad de Catalog. |
| Security y Gateway | Autenticación, permisos y entrada pública. | Las rutas internas no se publican; el frontend utiliza Bearer. |

No se hacen `JOIN` ni claves foráneas entre bases de distintos servicios. Cada servicio valida las referencias externas mediante API. Las cantidades monetarias se representan con decimales exactos en BOB. Los IDs, estados y respuestas que no figuren en los contratos vigentes deben acordarse y versionarse antes de comenzar el desarrollo paralelo.

## 4. Reglas del flujo funcional

### 4.1 Confirmación de una venta

1. Un vendedor autorizado abre un borrador de Sales y conserva el total y los precios históricos calculados allí. El cliente no envía desde React un total que sustituya al del servidor.
2. `POST /api/ventas/{id}/confirmar` recibe `Idempotency-Key`. Sales verifica que la venta siga en `BORRADOR` y solicita a Inventory un egreso interno por cada presentación desde el almacén `MOSTRADOR`.
3. Inventory comprueba todos los saldos y aplica todos los egresos en una transacción local. Si falta stock, responde `409 STOCK_INSUFICIENTE` y Sales conserva el borrador sin confirmar.
4. La misma operación de venta usa un `operacion_id` estable. Si Inventory aplica el descuento y se pierde la respuesta, Sales consulta o reintenta con ese mismo ID; no genera un descuento nuevo. La venta solo pasa a `CONFIRMADA` tras comprobar el asiento.
5. Una venta confirmada conserva su total; una edición que altere cantidades o precios requiere una regla explícita y queda fuera de este Sprint. El saldo de pago puede continuar pendiente. La entrega presencial se realiza después del pago requerido por la operación.
6. La anulación de una venta confirmada o pagada no revierte automáticamente inventario o dinero. Debe bloquearse hasta que exista un flujo de reversión documentado; no se crea un ingreso manual para ocultar una anulación.

### 4.2 Pagos en efectivo y saldo

1. Payment recibe una referencia de origen (`VENTA` o `PEDIDO`), ID, importe y medio. Consulta al servicio propietario para obtener total y validez de la operación; no lee su base directamente.
2. El importe es mayor que cero. La suma de pagos `CONFIRMADOS` no supera el total congelado. El control de saldo y el alta del pago se realizan con transacción y bloqueo adecuado para impedir dos pagos concurrentes que excedan el total.
3. El efectivo se confirma por un usuario autorizado que registra la recepción física. Un reintento con la misma clave y contenido devuelve el mismo pago; la misma clave con contenido distinto produce conflicto.
4. Un pago rechazado o una intención QR no confirmada no reduce el saldo. El saldo visible procede de Payment y del total verificado en Sales/Orders, no de un cálculo aislado en React.

### 4.3 QR y anticipo de pedido

1. Payment crea una intención `INICIADA` con importe, origen y referencia única del proveedor. La interfaz muestra el QR y consulta el estado. Un cliente sin cuenta administrativa usa un enlace de pago de alcance limitado y expiración definida; ese enlace no permite consultar otras ventas o pedidos.
2. El adaptador de pasarela transforma respuestas del proveedor a estados internos `INICIADA`, `CONFIRMADA` o `RECHAZADA`. El callback se autentica mediante firma o mecanismo documentado por el proveedor; no se acepta una confirmación enviada por React.
3. El callback puede llegar repetido o fuera de orden. Una referencia externa y un ID de evento únicos impiden pagos duplicados. Un rechazo no se registra como pago exitoso; una respuesta incierta se consulta de nuevo.
4. En pedidos, el importe QR confirmado es un anticipo parcial o total asociado al ID de Orders. No cambia automáticamente el estado de producción, entrega o cancelación.
5. **Proveedor aún no seleccionado:** el simulador reproduce éxito, rechazo, timeout, callback duplicado y respuesta perdida para validar contratos y seguridad del sistema. HU12 no se declara aceptada como pago por internet real hasta ejecutar un flujo con una pasarela y credenciales de pruebas autorizadas.

### 4.4 Recibos internos

El recibo se genera a partir de un pago `CONFIRMADO` y conserva número único, origen, importe, medio, fecha y datos necesarios de la operación como snapshot. El PDF es un **recibo interno**, no una factura fiscal. La impresión y reimpresión muestran el mismo contenido histórico. La anulación exige motivo, permiso y trazabilidad; no elimina el pago ni constituye un reembolso. Si se requiere reversión monetaria, se diseña como una operación separada.

## 5. Contratos HTTP propuestos para acordar

Las rutas siguientes son el contrato objetivo del Sprint 4. Los nombres finales de campos y estados se confrontan con el código integrado de Sprint 2 y 3 antes de implementarlos. Las rutas de usuarios pasan por Gateway; las internas usan clave de servicio, actor validado e infraestructura de red interna. El callback QR se publica de forma limitada a través del Gateway y se autentica con la firma del proveedor, no con un token de usuario.

| Dueño | Método y ruta | Función | Acceso |
| --- | --- | --- | --- |
| Sales | `POST /api/ventas/{id}/confirmar` | Confirmar borrador con descuento de mostrador. | Vendedor o Administrador; `ventas.confirmar` |
| Inventory | `POST /internal/ventas/descontar` | Aplicar egresos atómicos por `operacion_id`. | Solo Sales autenticado internamente |
| Inventory | `GET /internal/ventas/{operacion_id}` | Conciliar resultado de descuento. | Solo Sales autenticado internamente |
| Payment | `POST /api/pagos/efectivo` | Registrar pago en efectivo. | Vendedor o Administrador; `pagos.crear` |
| Payment | `GET /api/pagos?origen=&origen_id=` | Consultar pagos y saldo de una operación. | `pagos.ver` y acceso al origen |
| Payment | `POST /api/pagos/qr` | Crear intención QR. | Usuario autorizado o enlace limitado al origen |
| Payment | `GET /api/pagos/qr/{id}` | Consultar estado QR. | Acceso al origen |
| Payment | `POST /api/pagos/qr/callback` | Recibir resultado del proveedor mediante una ruta pública limitada. | Firma del proveedor; nunca Bearer del navegador |
| Payment | `POST /api/recibos` | Generar recibo del pago confirmado. | `recibos.crear` |
| Payment | `GET /api/recibos/{id}` y `GET /api/recibos/{id}/pdf` | Consultar, imprimir o reimprimir. | `recibos.ver` |
| Payment | `POST /api/recibos/{id}/anular` | Anular con motivo y auditoría. | `recibos.anular` |

**Ejemplo normalizado de pago:** `{ "origen_tipo": "VENTA", "origen_id": 12, "monto": "25.00", "moneda": "BOB", "medio": "EFECTIVO" }`. Payment valida origen y monto en el servidor. El `Idempotency-Key` acompaña las escrituras y se conserva durante el reintento del mismo contenido.

**Respuestas previstas:** `401` sin autenticación, `403` sin permiso o firma válida, `404` para referencia inexistente, `422` por datos inválidos, `409` por stock insuficiente, sobrepago o clave conflictiva, y `503` ante dependencia indispensable indisponible. Las respuestas tienen código de error estable, mensaje comprensible y referencia de operación. Una incertidumbre de red no se convierte en éxito ni en un segundo cobro.

## 6. Datos, permisos y configuración

**Payment:** tablas o agregados para `pago`, `intento_qr`, `evento_qr`, `pago_idempotencia` y `recibo`. Cada pago almacena origen, importe decimal, moneda, medio, estado, fecha y actor. Los eventos QR conservan ID externo único, payload mínimo auditado y momento de recepción. No se almacenan datos sensibles que el proveedor no exija. Cada recibo conserva snapshot y motivo/actor de anulación.

**Sales e Inventory:** Sales añade estado de confirmación y referencia estable del egreso. Inventory registra la operación de venta y sus movimientos vinculados. La clave `operacion_id` es única. La comprobación y descuento de todos los detalles de una venta ocurren en una transacción local de Inventory.

**Security:** añadir permisos de confirmación, pagos y recibos con un seeder idempotente; asignarlos a Administrador y Vendedor según función. No ejecutar el seeder completo sobre una instalación existente sin revisar las variables del administrador. Las API verifican permisos en el servidor; ocultar un botón no sustituye la autorización.

**Entorno:** crear `payment-service` y su base PostgreSQL propia mediante Docker Compose; añadir configuración de Gateway y variables de conexión a Sales, Orders, Inventory, Security y al simulador/proveedor QR. Mantener `.env` fuera de Git, con claves internas coincidentes entre emisor y receptor. La URL del frontend apunta al Gateway; el proveedor QR utiliza una URL pública HTTPS para callbacks cuando exista entorno de pruebas externo.

## 7. Sprint Backlog y reparto

Capacidad semanal: **80 horas**; **70** estimadas para T401–T414, **35 por desarrollador**; **10** reservadas para eventos Scrum y ajustes. El Sprint Backlog es una previsión y se actualiza según lo aprendido, sin modificar el Sprint Goal.

| ID | HU | Tarea | Responsable | h | Estado |
| --- | --- | --- | --- | ---: | --- |
| T401 | HU16–HU19 | Verificar flujo integrado de Inventario y Producción con bases reales | Juan Pablo | 6 | En curso |
| T402 | HU11–HU12 | Preparar payment-service, esquema PostgreSQL y contenedores | Juan Pablo | 5 | Completado |
| T403 | HU11 | Implementar pagos en efectivo, saldo e idempotencia | Juan Pablo | 6 | Completado |
| T404 | HU10 | Confirmar venta con egreso idempotente de mostrador | Juan Pablo | 7 | En curso |
| T405 | HU12 | Validar callback QR y conciliar transacciones | Juan Pablo | 6 | Por hacer |
| T406 | HU10–HU13 | Configurar Gateway, permisos y credenciales internas | Juan Pablo | 3 | En curso |
| T407 | HU10–HU13 | Revisar contratos y pruebas de servicios para el cierre | Juan Pablo | 2 | Por hacer |
| T408 | HU12 | Integrar pasarela de pago QR oficial (pendiente entrega de API al cierre de sprint) | Fabián | 6 | Pendiente de API |
| T409 | HU11–HU12 | Construir interfaz de efectivo y saldo | Fabián | 5 | Completado |
| T410 | HU10 | Construir interfaz de confirmación y disponibilidad | Fabián | 4 | Completado |
| T411 | HU13 | Implementar API de recibos, PDF, consulta y anulación | Fabián | 6 | Completado |
| T412 | HU13 | Construir interfaz de impresión y reimpresión | Fabián | 4 | Por hacer |
| T413 | HU12 | Asociar anticipo QR a pedido y consultar resultado | Fabián | 4 | Por hacer |
| T414 | HU10–HU13 | Ejecutar pruebas integradas y documentar resultados | Fabián | 6 | Por hacer |

**Revisión del 2026-11-19:** estados sustentados en [el informe de avance recibido](AVANCE_SPRINT_4_DEV_JP.md). T401 refleja ajustes preparatorios de Producción; T406, middleware y conexiones parciales. T402/T403 pasan a revisión por código incorporado, con pruebas y aceptación pendientes. Las estimaciones no son horas ejecutadas y la matriz PS4 continúa sin resultados.

**Acuerdo sobre HU12 / T408 (2026-11-19):** A solicitud del Product Owner, se descarta el desarrollo de un simulador temporal de QR para evitar código descartable. La tarea T408 queda programada para integrar directamente la documentación y API de la pasarela de pagos oficial que se suministrará al finalizar el Sprint 4. Mientras tanto, en T409 se construye la interfaz completa de pagos en efectivo y consulta de saldo de operaciones contra `payment-service`.

**Secuencia crítica:** verificar Sprint 3 → acordar contratos → crear Payment y operación de stock → confirmar ventas → pagos en efectivo → intención/callback QR → recibos → interfaces → pruebas de extremo a extremo. El trabajo paralelo comienza con contratos compartidos y respuestas de prueba; la aceptación usa servicios reales. Una tarea cambia de `Por hacer` a `En curso`, `En revisión` y `Terminada` con commit y evidencia, sin confundir código escrito con historia aceptada.

| Jornada | Enfoque previsto | Resultado verificable previsto |
| --- | --- | --- |
| J1 | T401; revisar Sales/Orders/Inventory y contratos; iniciar T402 y T408. | Resultado de validación PS3, esquema Payment y contrato QR versionado. |
| J2 | T403, T404 y T410; preparar rutas internas de stock. | Venta confirmada una vez y efectivo con saldo correcto por API. |
| J3 | T405, T408, T409 y T413. | QR simulado confirmado/rechazado sin duplicación; anticipo asociado a pedido. |
| J4 | T411, T412, T406 y contratos de interfaz. | Recibo interno y pantallas conectadas por Gateway. |
| J5 | T407, T414; persistencia, fallos y revisión. | Registro PS4, demostración y decisión basada en la Definición de Terminado. |

La distribución diaria es una guía de coordinación, **no** un registro de Daily Scrum ni horas ejecutadas. En cada Daily Scrum se revisa avance hacia el Sprint Goal, trabajo siguiente e impedimentos, y se adapta el Sprint Backlog.

**Avance T404 (2026-11-19):** contrato interno de descuento/consulta de ventas implementado en Inventory, con transacción e idempotencia. Sales y pruebas concurrentes PostgreSQL pendientes; ver [registro de confirmación](SPRINT_4_CONFIRMACION_VENTAS.md).

### 7.1 Registro incremental de desarrollo

Cada subtarea se marca **Completado** con su evidencia; la tarea principal solo cambia a **Completado** cuando satisface todo su alcance y las verificaciones aplicables. Las estimaciones no se contabilizan como horas reales.

| Fecha | Tarea / subtarea | Estado | Evidencia y límite |
| --- | --- | --- | --- |
| 2026-11-19 | T406 — Rutas de Gateway para consulta de pagos y efectivo | Completado | `gateway/nginx.conf`: rutas exactas `/api/pagos` y `/api/pagos/efectivo` dirigidas a Payment, preservan Bearer e Idempotency-Key y eliminan encabezados internos del cliente. `nginx:alpine nginx -t` exitoso. Pendiente aceptación con Payment real; no cierra T406. |
| 2026-11-19 | T410 — Interfaz de confirmación y disponibilidad de ventas | Completado | Frontend adaptado a microservicios: `ConfirmarVentaModal` con verificación de existencias en Mostrador (`inventarioConsultaService.consultarStockMostrador`), confirmación idempotente vía `POST /api/ventas/{id}/confirmar` (`ventaService.confirmarVenta`) con `Idempotency-Key` y Bearer Sanctum, soporte de estado `CONFIRMADA` en filtros y modal de detalle en `VentasPage`, bloqueo de edición/anulación para confirmadas, advertencia visual preventiva de stock insuficiente y captura de respuestas 409 (`STOCK_INSUFICIENTE`), 422 y 503 (`INVENTORY_NO_DISPONIBLE`, `CONFIRMACION_INCIERTA`). Build y lint limpios. |
| 2026-11-19 | T408 — Adaptador QR y conexión con pasarela | Pendiente de API oficial | Acuerdo con el Product Owner: no se desarrollará un simulador QR temporal de prueba. La integración se realizará al cierre del Sprint 4 directamente con la API y documentación oficial de la pasarela provista por el PO. |
| 2026-11-19 | T409 — Interfaz de efectivo y saldo de operaciones | Completado | Adaptación de vistas de pago a microservicios: `pagoService.js` actualizado con `registrarPagoEfectivo` (`POST /api/pagos/efectivo`), `consultarPagosOrigen` (`GET /api/pagos?origen=&origen_id=`), Bearer Sanctum e `Idempotency-Key` (16-128 chars). Eliminada dependencia de cookies/CSRF del monolito. `PagosPage.jsx` renovado con panel de consulta en tiempo real de saldos por Venta/Pedido (`resumenOperacion`), historial de pagos registrados en Payment Service, y cobro directo de saldo pendiente. `PagoModal.jsx` y `usePagoFormulario.js` admiten pagos parciales sin restricción de 100% en ventas, con advertencia informativa de QR oficial diferido al cierre del sprint. Build y lint limpios. |
| 2026-11-19 | T411 — API de recibos, PDF, consulta y anulación | Completado | `microservices/payment-service/`: `Recibo` model y tabla `recibo`, `ReciboService`, `ReciboController`, `ReciboPdfService` (generación nativa PDF 1.4 A4 sin dependencias externas), `StoreReciboRequest` y `AnularReciboRequest`. Endpoints implementados bajo `AutorizarPermisoPagos`: `POST /api/recibos` (`recibos.crear`), `GET /api/recibos` (`recibos.ver`), `GET /api/recibos/catalogos` (`recibos.crear`), `GET /api/recibos/{id}` (`recibos.ver`), `GET /api/recibos/{id}/pdf` (`recibos.ver`), `POST/PATCH /api/recibos/{id}/anular` (`recibos.anular`, no reembolsa ni altera pago), `POST/PATCH /api/recibos/{id}/imprimir` (`recibos.ver`). Soporte de idempotencia con `operacion = 'GENERAR_RECIBO'` y `'ANULAR_RECIBO'`. Gateway actualizado en `gateway/nginx.conf` enrutando `/api/recibos` y `/api/recibos/` a `payment-service` con Bearer e Idempotency-Key. `frontend/src/services/reciboService.js` actualizado a microservicios con Bearer token y descarga de PDF. Build y lint limpios. |

**Actualización de desarrollo 2026-11-19:** T402 y T403 completadas en alcance técnico con 18 pruebas y 93 aserciones, migración, salud HTTP y persistencia comprobadas. Ver [evidencia y límites](SPRINT_4_PRUEBAS_PAYMENT.md). La aceptación de HU11 continúa pendiente de servicios reales; los estados anteriores de revisión se conservan como historial.

**Siguiente paso de integración:** completar permisos de Pagos y validar llamadas reales por Gateway (T406), además de confirmar ventas con egreso de stock (T404). T401 y T404 siguen siendo requisitos para aceptar cobros de ventas confirmadas. El entorno Docker está disponible; los contenedores del proyecto estaban detenidos al comenzar esta intervención.

## 8. Preparación y ejecución segura

1. Integrar la rama que contiene el avance más reciente de los Sprints 2 y 3. Confirmar el commit y el estado del árbol antes de desarrollar; no asumir que una rama citada en informes anteriores sigue siendo la principal.
2. Completar los `.env` locales de Inventory y Production. Validar `docker compose ... config --services` con los overlays que existan en el repositorio; levantar exactamente esa combinación. Aplicar migraciones incrementales por servicio, sin reinicializar bases de desarrollo.
3. Preparar datos ficticios con presentación activa, receta, materias primas, stock en `PRODUCCION` y `MOSTRADOR`, una venta `BORRADOR` con total fijo y un pedido con total fijo. Registrar IDs y saldos antes de las pruebas.
4. Obtener y verificar respaldo de las bases de desarrollo antes de migraciones o pruebas que escriban. No ejecutar `migrate:fresh` ni `RefreshDatabase` sobre PostgreSQL/MySQL de desarrollo. Las suites aisladas deben forzar una base de pruebas independiente y comprobar la conexión antes de migrar.
5. Crear claves de servicio y del simulador sin publicarlas. Para un proveedor QR real, validar firma, reintentos y entorno de pruebas con documentación y credenciales autorizadas; nunca inventar respuestas como evidencia de un pago real.
6. Registrar en cada servicio README de variables, rutas, permisos, migraciones, contratos, errores y comandos de prueba. No copiar secretos ni datos personales a logs, evidencias o Git.

## 9. Matriz de pruebas PS4

Cada escenario registra fecha, ambiente, commit, datos ficticios, solicitud, respuesta, consultas de base y responsable. Una prueba aislada con HTTP simulado no acredita por sí sola la integración REST ni el comportamiento concurrente en PostgreSQL.

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| PS4-01 | Arranque conjunto de Gateway, Security, Sales, Orders, Catalog, Inventory, Production y Payment. | Servicios saludables y bases propias migradas; rutas públicas accesibles. |
| PS4-02 | Completar PS3-01–PS3-19 aplicables, incluido flujo de producción, persistencia y concurrencia. | Stock y movimientos coherentes; HU16–HU19 evaluadas con datos reales. |
| PS4-03 | Confirmar venta con stock suficiente en mostrador. | Sales pasa a `CONFIRMADA` y Inventory descuenta exactamente una vez. |
| PS4-04 | Confirmar con stock insuficiente o detalle inválido. | `409`/`422`; venta sigue en borrador y ningún artículo se descuenta parcialmente. |
| PS4-05 | Dos confirmaciones concurrentes o reintento tras pérdida de respuesta. | Una sola confirmación y un solo conjunto de egresos por `operacion_id`. |
| PS4-06 | Registrar pago en efectivo positivo y consultar saldo. | Pago `CONFIRMADO`; saldo = total congelado − pagos confirmados. |
| PS4-07 | Dos pagos parciales válidos. | Se acumulan sin superar el total y conservan referencias distintas. |
| PS4-08 | Pago cero, negativo, mayor al saldo o dos pagos concurrentes que excederían el total. | Rechazo controlado; total pagado nunca supera el total. |
| PS4-09 | Repetir pago con misma clave y contenido; reutilizar la clave con contenido diferente. | Mismo resultado sin duplicado; conflicto para contenido distinto. |
| PS4-10 | Crear QR en el simulador y recibir resultado confirmado. | Intención y pago vinculados al origen una sola vez. |
| PS4-11 | QR rechazado, vencido, con timeout o respuesta perdida. | No se registra pago exitoso; estado consultable y conciliable. |
| PS4-12 | Callback duplicado, falso o sin firma válida. | El duplicado no suma dinero; el falso se rechaza. |
| PS4-13 | Pagar anticipo QR de un pedido. | Payment conserva vínculo a Orders y saldo; la entrega no cambia automáticamente. |
| PS4-14 | Generar recibo de pago confirmado, consultar y descargar PDF. | Número y snapshot correctos; PDF coincide con el pago. |
| PS4-15 | Imprimir/reimprimir y anular recibo con motivo. | Mismo contenido histórico; anulación trazable sin borrar ni reembolsar el pago. |
| PS4-16 | Acceder sin token, sin permiso y por ruta interna publicada accidentalmente. | `401`, `403` o `404` según contrato; rutas internas no expuestas. |
| PS4-17 | Recorrer venta, efectivo/QR y recibo desde React. | Solicitudes por Gateway con Bearer o enlace limitado; saldos y estados coinciden con API. |
| PS4-18 | Detener Catalog, Inventory, Security, Sales/Orders o simulador durante el flujo. | Error/estado controlado; sin venta confirmada ni pago confirmado falsos. |
| PS4-19 | Reiniciar servicios y bases sin borrar volúmenes. | Ventas, saldos, pagos, recibos e idempotencia persistentes. |
| PS4-20 | Ejecutar suites aisladas y comparar conteos de desarrollo antes/después. | Ninguna suite migra, vacía o altera las bases de desarrollo. |
| PS4-21 | Integración con pasarela QR real en sandbox, si se dispone de proveedor y credenciales. | Firma y resultado auténticos; evidencia separada de la simulación. |

**Auditoría final:** por cada venta confirmada existe un descuento de mostrador con igual referencia; ningún saldo de Inventory es negativo; para cada origen la suma de pagos confirmados no supera el total; no hay eventos QR duplicados contabilizados; cada recibo apunta a un pago confirmado; los estados inciertos son consultables y conciliables.

| Fecha/hora | Caso | Commit y ambiente | Datos y acción | Respuesta y evidencia de base | Resultado | Responsable |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | Sin ejecutar | — |

## 10. Criterio de cierre y documentación Scrum

Una historia está terminada cuando cumple sus criterios de aceptación, la Definición de Terminado del producto, las pruebas aisladas e integradas pertinentes, la autorización y la persistencia; el código está revisado y existe evidencia reproducible. HU12 requiere distinguir explícitamente simulación de pasarela real. La falta de proveedor no se convierte en una aceptación ficticia.

El registro de desarrollo alimentará los apartados posteriores del Word: **3.5.3 Diagramas de clase e interfaces**, **3.5.4 Daily Meeting**, **3.5.5 Scrumboard**, **3.5.6 Product Increment**, **3.5.7 Burndown y burnup**, **3.5.8 Sprint Review** y **3.5.9 Sprint Retrospective**. Las capturas de interfaz se insertan una por una. Las curvas de avance se calculan con horas cerradas por jornada; no se generan a partir de estimaciones como si fueran mediciones.

En la Sprint Review se inspeccionan los resultados y el Product Backlog con interesados; en la retrospectiva se registran hechos, mejoras, responsables y verificación. Los campos de horas reales, reuniones, aceptación del Product Owner y resultados PS4 se completan solo después de observarlos.

| Fecha | Decisión o cambio de contrato | Motivo | Tareas y pruebas afectadas | Acordado por |
| --- | --- | --- | --- | --- |
| 2026-11-19 | Diferir simulación QR en favor de integración directa con pasarela oficial al cierre del Sprint 4 | El PO proporcionará la API y documentación oficial de la pasarela de pagos al finalizar el sprint, evitando la creación de simuladores o código descartable | T408, T405, T409, T413 | Fabián Cuellar (PO) y equipo |
