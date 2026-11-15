# Order Service — Dulce Bocado

Microservicio de Pedidos del Sprint 2 (T209–T213). Posee la base PostgreSQL `dulce_orders` y las tablas `pedido` y `detalle_pedido`. Ventas pertenece a `sales-service`.

## Preparación local

Crear `microservices/order-service/.env` desde `.env.example` y generar una `APP_KEY` propia. El archivo está ignorado por Git. Configurar:

| Variable de Orders | Debe coincidir con |
|---|---|
| `INTERNAL_SERVICE_KEY` | `INTERNAL_SERVICE_KEY` de Security |
| `CUSTOMER_SERVICE_KEY` | `CUSTOMER_INTERNAL_KEY` de Customer |
| `CATALOGO_SERVICE_KEY` | `CATALOG_INTERNAL_KEY` de Catalog |
| `DB_PASSWORD` | `ORDER_DB_PASSWORD` del Compose; si no se define, se usa el valor local por defecto |

Las URL internas de la plantilla apuntan a los nombres de servicio de Compose. No publicar claves en Git, logs ni documentación. Desde la raíz del proyecto, con los `.env` de los otros servicios también configurados:

```powershell
$composeFiles = @(
  '-f', 'docker-compose.yml',
  '-f', 'docker-compose.sprint1.yml',
  '-f', 'docker-compose.sprint2.customer.yml',
  '-f', 'docker-compose.sprint2.catalog.yml',
  '-f', 'docker-compose.sprint2.order.yml'
)
docker compose @composeFiles config --services
docker compose @composeFiles up -d --build security-service customer-service catalog-service order-service gateway
docker compose @composeFiles exec -T order-service php artisan migrate --force
docker compose @composeFiles exec -T security-service php artisan db:seed --class=PedidosPermisosSeeder --force
```

En una instalación nueva, generar la `APP_KEY` con Laravel antes de usar la API y reiniciar `order-service` tras cambiar el `.env`. El seeder específico de Pedidos es idempotente y no restablece la contraseña del administrador; el seeder completo de Security sí actualiza sus datos. No ejecutar `migrate:fresh` sobre una base con datos.

## API por Gateway

Todas las rutas usan `Authorization: Bearer <token>`.

| Ruta | Permiso | Función |
|---|---|---|
| `GET /api/pedidos` | `pedidos.gestionar_pedido` | Lista pedidos y detalles; admite filtros de estado, fecha y búsqueda. |
| `POST /api/pedidos` | `pedidos.gestionar_pedido` | Crea un pedido `PROGRAMADO`. |
| `GET /api/pedidos/{id}` | `pedidos.gestionar_pedido` | Consulta el pedido y sus snapshots. |
| `PUT /api/pedidos/{id}` | `pedidos.gestionar_pedido` | Modifica un pedido `PROGRAMADO`. |
| `PATCH /api/pedidos/{id}/estado` | `pedidos.gestionar_estado_entrega` | Aplica una transición válida de estado o registra entrega/cancelación. |

Para un cliente registrado, enviar `tipo_cliente: "REGISTRADO"` e `id_cliente`; para uno ocasional, `tipo_cliente: "OCASIONAL"` y `nombre_cliente_ocasional`. Alta y edición reciben `fecha_entrega`, `hora_entrega` y `detalles: [{id_producto_presentacion, cantidad}]`. Orders obtiene nombre y precio vigentes de Catalog y conserva snapshots. Rechaza un cliente desactivado con `409 CLIENTE_INACTIVO` antes de persistir el pedido.

## Propiedad de datos y evidencia

`id_cliente`, `id_usuario` y `presentacion_id` son referencias externas consultadas por REST, sin claves foráneas entre servicios. La clave foránea local une `detalle_pedido` con `pedido`. No consultar directamente las bases de Customer, Catalog ni Security desde Orders.

La evidencia integrada, los pendientes y el alcance del Sprint 2 se mantienen en [la guía única](../../Docs/SPRINT_2_AVANCE_Y_PRUEBAS.md). Las pruebas automatizadas de este servicio aún contienen casos copiados de Sales y deben sustituirse por casos de Orders. `tests/TestCase.php` fuerza SQLite en memoria para impedir que `RefreshDatabase` borre `dulce_orders` de desarrollo; la migración actual contiene restricciones SQL propias de PostgreSQL, por lo que la suite pendiente necesita una adaptación antes de ejecutarse.
