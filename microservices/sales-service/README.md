# Sales Service — Dulce Bocado

Servicio Laravel independiente para la venta base del Sprint 2. T214–T215 cubren PostgreSQL propio, API de borradores, autorización distribuida y consultas REST a Customer/Catalog. T216 reutiliza la vista React de Ventas y T217 publica la API mediante Gateway. El cierre de pruebas y evidencias corresponde a T218; pagos y descuento de inventario quedan fuera de este incremento.

## Preparación local

Desde la raíz del repositorio, para preparar **solo Sales**:

```powershell
if (-not (Test-Path microservices/sales-service/.env)) { Copy-Item microservices/sales-service/.env.example microservices/sales-service/.env }
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml up -d --build sales-db sales-service
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec sales-service php artisan key:generate
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec sales-service php artisan migrate --force
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml ps sales-db sales-service
```

Conservar `.env` fuera de Git. En un clon nuevo, generar `APP_KEY` **antes de usar rutas que dependan de ella**. El valor predeterminado de `SALES_DB_PASSWORD` en Compose es solo para desarrollo local; configurar una clave propia para otros entornos. Sales no publica un puerto directo al host: Gateway enruta `/api/ventas` y `/api/ventas/{id}` al servicio. `/up` se comprueba mediante `docker compose exec sales-service` o el healthcheck.

Para probar el flujo completo React → Gateway → Sales se necesitan también Security, Customer y Catalog, cada uno con su `.env`, clave interna y migraciones. Usar la composición conjunta y las instrucciones vigentes de `Docs/SPRINT_2_AVANCE_Y_PRUEBAS.md`; levantar únicamente Sales no habilita el registro de ventas con esas dependencias ausentes. Aplicar migraciones con `migrate --force`, sin borrar volúmenes ni usar `migrate:fresh` sobre las bases de desarrollo.

## Comunicación con Security

Configurar `SECURITY_SERVICE_URL=http://security-service:8000` en el `.env` local de Sales. Generar una credencial interna aleatoria y poner **el mismo valor** en `INTERNAL_SERVICE_KEY` de los `.env` locales de Security y Sales; no incluirla en Git ni mostrarla en logs. Reiniciar ambos servicios tras cambiarla. Las cinco rutas de Ventas aplican `AutorizarPermisoVentas` con el permiso correspondiente. El contrato y las pruebas están en el roadmap, secciones «Evidencia paso 1» y «Evidencia paso 5».

## Comunicación con Customer

El adaptador `ClienteService` consulta `CUSTOMER_SERVICE_URL` por HTTP solo para un cliente registrado. `CUSTOMER_SERVICE_KEY` de Sales debe coincidir con `CUSTOMER_INTERNAL_KEY` de Customer; si falta o la respuesta no cumple el contrato, Sales falla cerrado con `503`. La venta ocasional no consulta Customer. `POST` y `PUT /api/ventas` usan este adaptador; el rechazo de un cliente inactivo se verificó por Gateway en PS2-02.

## Comunicación con Catalog

`CatalogoService` consulta `CATALOGO_SERVICE_URL` para una presentación vendible. `CATALOGO_SERVICE_KEY` de Sales debe coincidir con `CATALOG_INTERNAL_KEY` de Catalog. Obtiene nombre/precio para el snapshot y verifica disponibilidad **comercial**; no consulta inventario. `POST` y `PUT /api/ventas` lo usan para calcular el total. La integración real se validó a través del Gateway; las pruebas aisladas también usan respuestas HTTP simuladas. Una caída o respuesta inválida de Catalog produce un error controlado, sin venta parcial. La personalización permanece prohibida hasta contar con un contrato y costo acordados.

## Gateway y React

La vista de Ventas usa `frontend/src/services/ventaService.js`, `clienteService.js` y `catalogoVentasService.js` con Bearer y `VITE_API_URL` (por defecto `http://localhost:8080`). Nginx envía `/api/ventas` a Sales y no publica `/api/internal/introspect`. El proxy `/api` de `frontend/vite.config.js` permanece dirigido al monolito para vistas legadas con rutas relativas y CSRF; no participa en las solicitudes migradas de Ventas. Algunas rutas, como `/api/productos`, existen en ambos sistemas: cambiar ese proxy global sin migrar sus consumidores rompería flujos legados.

## API T215

| Ruta | Permiso | Resultado |
|---|---|---|
| `GET /api/ventas?estado=BORRADOR&per_page=15` | `ventas.ver` | Lista paginada; máximo 100 por página. |
| `GET /api/ventas/{id}` | `ventas.ver` | Venta y detalles históricos. |
| `POST /api/ventas` | `ventas.crear` | Crea borrador (`201`). |
| `PUT /api/ventas/{id}` | `ventas.modificar` | Reemplaza contenido de borrador (`200`). |
| `POST /api/ventas/{id}/anular` | `ventas.anular` | Cancela borrador con auditoría (`200`). |

Todas exigen `Authorization: Bearer <token_usuario>`. Las tres escrituras exigen además `Idempotency-Key` de 16–128 caracteres alfanuméricos, `_` o `-`; usar una clave nueva por operación lógica y conservarla para reintentos del mismo payload. Un reintento idéntico devuelve el resultado previo; reutilizar la clave con otro payload o actor devuelve `409`.

Ejemplo de creación sin personalización:

```json
{
  "id_cliente": 42,
  "items": [{"presentacion_id": 15, "cantidad": 2}],
  "observaciones": "Mostrador"
}
```

También puede enviarse `nombre_cliente_ocasional` en vez de `id_cliente`. El cliente no envía `id_usuario`, precio, subtotal, total ni estado. La personalización se rechaza hasta acordar su costo y contrato. La anulación recibe `{"motivo":"Motivo de al menos tres caracteres"}`. Los errores de reglas de negocio usan `{"error":{"code":"...","message":"...","details":{}}}`; los errores de validación usan el formato JSON estándar de Laravel (`message`, `errors`). Solo `BORRADOR` se puede editar o cancelar.

Para ejecutar las pruebas automatizadas sin tocar `dulce_sales`, usar SQLite en memoria:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec -T sales-service php artisan test --compact
```

`phpunit.xml` y `tests/TestCase.php` fijan SQLite en memoria, y `VentaApiTest` exige esa conexión antes de migrar y pasa `--database=sqlite` a `migrate:fresh`. No ejecutar una copia antigua de la suite dentro del contenedor de desarrollo: sus variables de Docker apuntan a PostgreSQL. Antes de modificar el esquema o recuperar datos, guardar una copia de `dulce_sales` y verificarla con `pg_restore -l`. El estado y la auditoría del incidente local están en `Docs/SPRINT_2_AVANCE_Y_PRUEBAS.md`.

## Propiedad de datos

Sales usa exclusivamente `dulce_sales`. `id_cliente`, `id_usuario` y `presentacion_id` son referencias externas sin claves foráneas. La única FK de negocio local une `detalle_venta.id_venta` con `venta.id_venta`. Los precios y nombres históricos se almacenan en `detalle_venta`; no se recalculan a partir del catálogo actual.

Antes de continuar un cambio de Sprint 2 o después de una recuperación, ejecutar la auditoría local de solo lectura:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec -T sales-service php artisan ventas:auditar
```

La orden devuelve código distinto de cero si encuentra detalles huérfanos, subtotales o totales discordantes o claves idempotentes que apuntan a ventas ausentes. No exige que el precio actual de Catalog coincida con el snapshot histórico. Las referencias externas deben verificarse por las API de Customer y Catalog cuando se restaure una copia; no establecer FK ni consultas SQL entre servicios.

No usar `migrate:fresh` ni borrar el volumen para actualizar el esquema. Todo cambio posterior requiere una migración nueva. Consultar `Docs/ROADMAP_SPRINT_2_SALES_SERVICE.md` antes de avanzar.
