# Sprint 4 — Avance recibido de dev-jp

> Registro histórico de la entrega recibida. Después de esta revisión se completaron técnicamente T402 y T403; consultar [SPRINT_4_PRUEBAS_PAYMENT.md](SPRINT_4_PRUEBAS_PAYMENT.md) y el backlog actualizado en [sprint4.md](sprint4.md). Los estados siguientes describen el corte original, no el estado actual.

**Fecha de revisión:** 2026-11-19.  
**Fuente:** comparación `803bd0d..f0daadf` de `origin/dev-jp`, integrada en `devFabian` mediante `1d6dc70`.  
**Método:** inspección de commits, rutas, servicios, migraciones, configuración y pruebas versionadas. No se ejecutaron servicios, migraciones ni pruebas funcionales durante esta revisión.  
**Guía y backlog:** [sprint4.md](sprint4.md).

## 1. Documentación recibida y alcance de este informe

El único documento nuevo de planificación del Sprint 4 en el rango revisado es `Docs/sprint4.md`. Se recibió con todas las tareas «Por hacer» y la matriz PS4 sin resultados. El README de Payment conserva la plantilla de Laravel. `Docs/realizado/micro/avancejp.md` es un handoff del Sprint 2, no evidencia del Sprint 4. No se encontró un resumen del avance ejecutado del Sprint 4 en los Markdown incorporados.

Este informe reconstruye el avance a partir del repositorio; no atribuye horas reales, reuniones, pruebas exitosas ni aceptación a Juan Pablo. Los responsables se toman del backlog acordado. La presencia de código permite registrar implementación para revisión, pero no declarar historias terminadas.

## 2. Cambios recibidos

Los cinco commits son `b417994`, `89e8f78`, `4089576`, `04bd24c` y `f0daadf`. En conjunto incorporan 73 archivos modificados o nuevos, principalmente la base Laravel de Payment.

| Evidencia | Implementación observada | Límite de la evidencia |
| --- | --- | --- |
| `microservices/payment-service/`, `docker-compose.sprint4.payment.yml` | Servicio Laravel, imagen PHP 8.4 con BCMath y PostgreSQL, base `dulce_payment`, volúmenes y healthchecks. | Falta acreditar construcción, arranque, migración y persistencia. |
| `database/migrations/2026_11_19_000001_create_payment_tables.php` de Payment | Tablas `pago`, `intento_qr`, `evento_qr`, `pago_idempotencia` y `recibo`, índices únicos y restricciones. | Tener tablas QR y recibo no equivale a disponer de sus API. |
| `routes/api.php`, `PagoController.php` de Payment | `POST /api/pagos/efectivo` y `GET /api/pagos?origen=&origen_id=`; validación de Idempotency-Key. | No hay rutas QR, callback ni recibos en este archivo. |
| `PagoEfectivoService.php` | Cálculo decimal, pago confirmado, saldo, rechazo de sobrepago, snapshot de respuesta, huella por actor/contenido y bloqueo transaccional PostgreSQL por origen. | Concurrencia e idempotencia requieren pruebas reales de PostgreSQL. |
| `OrigenPagoService.php` | Consulta Sales/Orders con Bearer, valida identidad, total, moneda y estado; exige venta `CONFIRMADA`; controla indisponibilidad y acceso. | Falta verificar contratos con las respuestas reales de ambos servicios. |
| `AutorizarPermisoPagos.php` | Introspección en Security con clave interna, usuario activo y permisos `pagos.crear`/`pagos.ver`. | No acredita permisos provisionados ni integración completa por Gateway. |
| `production-service/Dockerfile` | Arranque con servidor PHP directo en lugar de `artisan serve`; el commit `89e8f78` lo describe como corrección de variables de entorno. | No acredita flujo integrado de Producción/Inventario. |
| `security-service/database/seeders/ProductionPermisosSeeder.php` | Alta idempotente de `produccion.ver` y `produccion.crear`, asociaciones de roles y del usuario admin existente. | Son permisos de Producción, no los permisos pendientes de Pagos/Recibos. |

## 3. Estado del Sprint Backlog reconstruido

| Tarea | Responsable | Estado | Evidencia y condición para avanzar |
| --- | --- | --- | --- |
| T401 | Juan Pablo | En curso | Ajustes de arranque y permisos apoyan la preparación. Falta ejecutar el flujo PS3 con bases reales y registrar resultados. |
| T402 | Juan Pablo | En revisión | Base de Payment, esquema y Compose incorporados; validar arranque, migraciones incrementales y persistencia; completar README operativo. |
| T403 | Juan Pablo | En revisión | API de efectivo, saldo e idempotencia implementada; faltan pruebas de negocio, seguridad, concurrencia y contratos. |
| T404 | Juan Pablo | Por hacer | El rango no incorpora confirmación de Sales ni egreso idempotente de Inventory. Bloquea el cobro real de ventas en borrador. |
| T405 | Juan Pablo | Por hacer | Sin implementación de callback QR y conciliación en las rutas de Payment. |
| T406 | Juan Pablo | En curso | Existe middleware de Payment y configuración de conexiones. Completar Gateway, permisos de pagos/recibos y validar claves internas. |
| T407 | Juan Pablo | Por hacer | Sin evidencia de revisión y pruebas de cierre. Este informe no sustituye esa aceptación. |
| T408–T414 | Fabián | Por hacer | No se recibió implementación de estas tareas en el rango: adaptador QR, interfaces, recibos, anticipo QR y pruebas integradas. |

Ninguna tarea se marca Terminada en esta revisión. No se calcula porcentaje ni horas cerradas a partir del volumen de código. Las 70 horas del backlog siguen siendo estimaciones.

## 4. Verificaciones pendientes y puntos concretos de revisión

- Payment solo incluye `tests/Feature/ExampleTest.php` y `tests/Unit/ExampleTest.php`: no hay suite de pagos versionada en esta entrega. `phpunit.xml` configura SQLite en memoria; el bloqueo `pg_advisory_xact_lock` exige cobertura adicional en PostgreSQL aislado.
- Validar PS4-06 a PS4-09: efectivo, parciales, sobrepago, claves repetidas/conflictivas y solicitudes concurrentes. Comprobar saldos directamente en la base de pruebas.
- Revisar precisión de entrada: `StorePagoEfectivoRequest` admite números positivos sin limitar decimales y el servicio normaliza con `bcadd(..., 2)`. Añadir casos como `0.001` y `1.999` y acordar rechazo de precisión excedente antes de aceptar T403.
- Validar PS4-16 y PS4-18: token ausente/inválido, permiso insuficiente, acceso al origen, Security/Sales/Orders indisponibles y respuestas inesperadas.
- Verificar que la consulta de saldo mantenga el total histórico acordado: actualmente consulta el total del origen y los pagos guardan su propio snapshot. Confirmar restricciones de edición del origen después del cobro.
- La entrega no modifica Gateway ni frontend. Comprobar el enrutamiento de Payment antes de conectar las nuevas pantallas. Las vistas legadas del monolito no acreditan integración con Payment.
- Ejecutar PS4-01, PS4-19 y PS4-20 para arranque conjunto, persistencia y aislamiento. No usar bases de desarrollo para pruebas destructivas.

## 5. Continuación recomendada

1. Completar T401 con evidencia del flujo Inventario/Producción; resolver configuración local y preparar datos ficticios.
2. Revisar T402: preparar entorno Payment, documentar variables y comandos, construir y migrar sin borrar datos. Registrar commit, ambiente y resultados.
3. Acordar contratos de origen, importes y errores; completar T404 y T406 para permitir cobro de ventas confirmadas por Gateway.
4. Validar T403 con pruebas aisladas y PostgreSQL de testing; documentar y corregir los fallos antes de marcarla Terminada.
5. Desarrollar T408 coordinada con T405; continuar interfaces, recibos y anticipo según las dependencias del backlog.
6. Ejecutar T407/T414 y completar la matriz PS4 de la guía. Cada cierre debe incluir commit, casos ejecutados, resultados, evidencia persistida y responsable; registrar horas y aceptación solo cuando existan.

## 6. Registro de esta revisión

Se inspeccionaron el diff de los cinco commits, los archivos anteriores y la matriz de planificación. Se actualizaron únicamente documentos. No se ejecutaron tests, migraciones, seeders ni operaciones de pago. El estado «En revisión» describe código pendiente de validación, no aceptación funcional ni seguridad certificada.
