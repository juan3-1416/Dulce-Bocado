# Production Service — Sprint 3

Production conserva solicitudes y resultados de elaboración en su propia base PostgreSQL `dulce_production`. La receta y las materias primas pertenecen a Catalog; los saldos y movimientos pertenecen a Inventory. Este servicio no escribe en esas bases.

## Estado actual

T302 preparó el servicio, el modelo, la migración y su contenedor. T308 agregó el adaptador que consulta y valida la receta real de Catalog. Las rutas públicas, autorización, coordinación con Inventory e interfaz se incorporarán en T310–T311. Por ahora `/up` es la única ruta operativa de salud; no se debe considerar este servicio funcional para producir.

## Entorno local

Copiar `.env.example` a `.env` y configurar una `APP_KEY` distinta para este entorno. `INTERNAL_SERVICE_KEY` debe coincidir con la clave aceptada por Security, `CATALOGO_SERVICE_KEY` con `CATALOG_INTERNAL_KEY` de Catalog y, cuando Inventory esté disponible, `INVENTORY_SERVICE_KEY` con su clave interna. Los valores se mantienen fuera de Git. El overlay `docker-compose.sprint3.production.yml` configura la base local sin publicar el puerto de Production ni de PostgreSQL.

Con el archivo Compose base y el overlay, iniciar `production-db` y `production-service`. Ejecutar `php artisan migrate --force` dentro de `production-service` para aplicar migraciones pendientes; en la base nueva creó `produccion` y `produccion_idempotencia`. No usar `migrate:fresh` sobre la base de desarrollo. La suite actual se limita a SQLite en memoria mediante `phpunit.xml` y `tests/TestCase.php`; los comportamientos específicos de PostgreSQL se comprobarán además en la integración real.

## Datos y contratos previstos

`produccion` guarda `operacion_id` único, referencia externa a presentación y receta, cantidad entera positiva, estado `EN_PROCESO|COMPLETADA|RECHAZADA`, snapshot JSON de insumos, actor y fechas de resultado. `produccion_idempotencia` vincula una clave y huella de solicitud con una producción y reserva campos para la respuesta definitiva. No hay claves foráneas entre servicios. La base exige cantidad y referencias positivas y un estado permitido. Los nombres de campos de las rutas HTTP y los códigos finales se consolidan en `Docs/SPRINT_3_PLAN_DESARROLLO_Y_PRUEBAS.md` antes de T310.

El adaptador T308 usa `GET /api/presentaciones/{id}/receta` dentro de la red de servicios, con `X-Internal-Service-Key` y `X-Actor-User-Id`. Rechaza recetas y productos inactivos, ingredientes repetidos/inactivos, unidades desconocidas y cantidades fuera de la precisión de Catalog. Devuelve `cantidad_por_unidad` como decimal de tres posiciones, sin convertirlo a `float`; T310 multiplicará ese valor por unidades elaboradas con aritmética decimal exacta. Una presentación terminada se mide en `unidad` en este sprint, pendiente de revisión conjunta con Inventory.
