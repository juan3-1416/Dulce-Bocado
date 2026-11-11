# Sales Service — Dulce Bocado

Servicio Laravel independiente para ventas de mostrador. T214 aporta PostgreSQL y modelos propios; T215 implementa la API de borradores, autorización distribuida y consultas a Customer/Catalog. Gateway y React corresponden a pasos posteriores del roadmap.

## Preparación local

Desde la raíz del repositorio:

```powershell
if (-not (Test-Path microservices/sales-service/.env)) { Copy-Item microservices/sales-service/.env.example microservices/sales-service/.env }
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml up -d --build sales-db sales-service
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec sales-service php artisan key:generate
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec sales-service php artisan migrate --force
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml ps sales-db sales-service
```

Conservar `.env` fuera de Git. En un clon nuevo, generar la clave **antes de usar rutas que dependan de ella**. El valor `SALES_DB_PASSWORD` del Compose es solo para desarrollo local; configurar un secreto propio para otros entornos. El servicio no publica un puerto al host ni está enrutado por Nginx todavía. `/up` se comprueba mediante `docker compose exec sales-service` o el healthcheck.

## Comunicación con Security

Configurar `SECURITY_SERVICE_URL=http://security-service:8000` en el `.env` local de Sales. Generar una credencial interna aleatoria y poner **el mismo valor** en `INTERNAL_SERVICE_KEY` de los `.env` locales de Security y Sales; no incluirla en Git ni mostrarla en logs. Reiniciar ambos servicios tras cambiarla. Las cinco rutas de Ventas aplican `AutorizarPermisoVentas` con el permiso correspondiente. El contrato y las pruebas están en el roadmap, secciones «Evidencia paso 1» y «Evidencia paso 5».

## Comunicación con Customer

El adaptador `ClienteService` consulta `CUSTOMER_SERVICE_URL` por HTTP solo para un cliente registrado. Requiere `CUSTOMER_SERVICE_KEY` acordada con el dueño de Customer; si falta, falla cerrado con `503`. La venta ocasional no usa Customer. El JSON y los headers propuestos están en el roadmap, sección «Evidencia paso 3», y deben confirmarse con el servicio propietario antes de una integración real. `POST` y `PUT /api/ventas` usan este adaptador.

## Comunicación con Catalog

`CatalogoService` consulta `CATALOGO_SERVICE_URL` para una presentación vendible y requiere `CATALOGO_SERVICE_KEY`. Obtiene nombre/precio para el snapshot y verifica disponibilidad **comercial**; no consulta inventario. `POST` y `PUT /api/ventas` lo usan para calcular el total. El contrato propuesto y la decisión pendiente sobre costo de personalización están en el roadmap, sección «Evidencia paso 4». Hasta que Catalog real lo confirme, los tests usan HTTP simulado y una venta real falla cerrado con `503`.

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

Para comprobar el código con PostgreSQL sin tocar datos de desarrollo, crear la base `dulce_sales_test` y ejecutar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec -T -e DB_CONNECTION=pgsql -e DB_DATABASE=dulce_sales_test sales-service php artisan test --compact
```

## Propiedad de datos

Sales usa exclusivamente `dulce_sales`. `id_cliente`, `id_usuario` y `presentacion_id` son referencias externas sin claves foráneas. La única FK de negocio local une `detalle_venta.id_venta` con `venta.id_venta`. Los precios y nombres históricos se almacenan en `detalle_venta`; no se recalculan a partir del catálogo actual.

No usar `migrate:fresh` ni borrar el volumen para actualizar el esquema. Todo cambio posterior requiere una migración nueva. Consultar `Docs/ROADMAP_SPRINT_2_SALES_SERVICE.md` antes de avanzar.
