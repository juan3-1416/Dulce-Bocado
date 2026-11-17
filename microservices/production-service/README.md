# Production Service — Sprint 3

Production conserva solicitudes y resultados de elaboración en su propia base PostgreSQL `dulce_production`. La receta y las materias primas pertenecen a Catalog; los saldos y movimientos pertenecen a Inventory. Este servicio no escribe en esas bases.

## Estado actual

T302 preparó el servicio, el modelo, la migración y su contenedor. T308 agregó el adaptador que consulta y valida la receta real de Catalog. T310 incorporó rutas públicas, autorización y coordinación idempotente con Inventory, verificadas con respuestas simuladas. La integración real con Inventory, Gateway y los permisos de Security sigue pendiente; no se debe presentar una producción de desarrollo como completada hasta comprobar ese circuito.

## Entorno local

Copiar `.env.example` a `.env` y configurar una `APP_KEY` distinta para este entorno. `INTERNAL_SERVICE_KEY` debe coincidir con la clave aceptada por Security, `CATALOGO_SERVICE_KEY` con `CATALOG_INTERNAL_KEY` de Catalog y, cuando Inventory esté disponible, `INVENTORY_SERVICE_KEY` con su clave interna. Los valores se mantienen fuera de Git. El overlay `docker-compose.sprint3.production.yml` configura la base local sin publicar el puerto de Production ni de PostgreSQL.

Con el archivo Compose base y el overlay, iniciar `production-db` y `production-service`. Ejecutar `php artisan migrate --force` dentro de `production-service` para aplicar migraciones pendientes; en la base nueva creó `produccion` y `produccion_idempotencia`. No usar `migrate:fresh` sobre la base de desarrollo. La suite actual se limita a SQLite en memoria mediante `phpunit.xml` y `tests/TestCase.php`; los comportamientos específicos de PostgreSQL se comprobarán además en la integración real.

## Datos y contratos previstos

`produccion` guarda `operacion_id` único, referencia externa a presentación y receta, cantidad entera positiva, estado `EN_PROCESO|COMPLETADA|RECHAZADA`, snapshot JSON de insumos, actor y fechas de resultado. `produccion_idempotencia` vincula una clave y huella de solicitud con una producción y conserva la respuesta definitiva. No hay claves foráneas entre servicios. La base exige cantidad y referencias positivas y un estado permitido. Los nombres de campos y códigos propuestos constan en `Docs/SPRINT_3_PLAN_DESARROLLO_Y_PRUEBAS.md`; deben cotejarse con Inventory antes de cerrar T310.

El adaptador T308 usa `GET /api/presentaciones/{id}/receta` dentro de la red de servicios, con `X-Internal-Service-Key` y `X-Actor-User-Id`. Rechaza recetas y productos inactivos, ingredientes repetidos/inactivos, unidades desconocidas y cantidades fuera de la precisión de Catalog. Devuelve `cantidad_por_unidad` como decimal de tres posiciones, sin convertirlo a `float`; T310 multiplica ese valor por unidades elaboradas con aritmética decimal exacta. Una presentación terminada se mide en `unidad` en este sprint, pendiente de revisión conjunta con Inventory.

## API y conciliación en curso

`GET /api/producciones` y `GET /api/producciones/{id}` requieren `produccion.ver`. `POST /api/producciones` requiere `produccion.crear`, `Idempotency-Key` de 16–128 caracteres y `{presentacion_id, cantidad, observaciones?}`. Security valida el token y el permiso. Production obtiene el consumo desde Catalog y guarda una solicitud `EN_PROCESO` con un `operacion_id` estable y snapshot antes de llamar a Inventory. No acepta ingredientes calculados por el cliente.

Production envía a Inventory `POST /internal/producciones/aplicar` con el mismo `operacion_id`, las cantidades calculadas con BCMath y tipos de almacén, sin IDs locales fijos. `APLICADA` confirma `COMPLETADA`; `STOCK_INSUFICIENTE` deja `RECHAZADA`; una respuesta perdida provoca consulta a `GET /internal/producciones/{operacion_id}`. Si tampoco puede confirmarse, la API devuelve `202 EN_PROCESO`; un reintento público con la misma clave consulta y usa el mismo ID. La misma clave con otro contenido devuelve `409`. El contrato exacto requiere cotejo con Inventory antes de integrarlo.

Toda respuesta definitiva de Inventory, incluso un rechazo `409` o `422`, debe traer el `operacion_id` solicitado. Una respuesta sin ID coincidente se mantiene incierta. `php artisan produccion:conciliar` revisa las solicitudes `EN_PROCESO` con ese mismo ID y puede ejecutarse sin el navegador. Está registrado cada minuto en `schedule:list`; el overlay de Production incluye `production-scheduler` con `php artisan schedule:work` y comparte el volumen de cache para el bloqueo de ejecución. El endpoint interno y sus respuestas siguen pendientes de cotejo con Inventory.

`php artisan test --compact` usa SQLite en memoria y la barrera de `beforeRefreshingDatabase()` impide migraciones de la base de desarrollo. Las pruebas de contrato simuladas no sustituyen las pruebas reales de stock, concurrencia y persistencia PostgreSQL del cierre del sprint.
