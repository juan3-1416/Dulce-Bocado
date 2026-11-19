# Payment Service — Sprint 4

Laravel/PHP 8.4, PostgreSQL 16 y BCMath. Propietario de pagos, intenciones QR, eventos, idempotencia y recibos. Actualmente expone efectivo y consulta de saldo; QR y recibos tienen esquema, pero sus API siguen pendientes.

## Arranque local

Usar Docker desde la raíz del repositorio. Copiar `microservices/payment-service/.env.example` a `.env` si no existe; establecer `INTERNAL_SERVICE_KEY` con la clave autorizada de Security. Nunca versionar secretos. Incluir `docker-compose.sprint4.payment.yml` junto a los overlays existentes de Security, Sales y Orders y la red `dulce_bocado_net`.

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint4.payment.yml build payment-service
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint4.payment.yml up -d payment-db payment-service
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint4.payment.yml exec payment-service php artisan key:generate
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint4.payment.yml exec payment-service php artisan migrate --force
```

El arranque anterior prepara Payment; para cobrar se deben levantar también los propietarios del origen con sus overlays. Usar migraciones incrementales, nunca `migrate:fresh` sobre desarrollo. `GET /up` verifica salud HTTP. La base usa volumen persistente y el servicio no publica un puerto al host: se consume por Gateway.

Variables: `DB_*` (PostgreSQL propio), `APP_KEY`, `INTERNAL_SERVICE_KEY`, `SECURITY_SERVICE_URL`, `SALES_SERVICE_URL`, `ORDER_SERVICE_URL`, y tiempos máximos `SECURITY_TIMEOUT`, `SALES_TIMEOUT`, `ORDER_TIMEOUT` (3 segundos por defecto). Compose establece los hosts internos.

## Contratos actuales

- `POST /api/pagos/efectivo`: Bearer con `pagos.crear`, encabezado `Idempotency-Key` de 16–128 caracteres alfanuméricos, guion o guion bajo. JSON: `{"origen_tipo":"VENTA","origen_id":1,"monto":"40.00","moneda":"BOB"}`.
- `GET /api/pagos?origen=VENTA&origen_id=1`: Bearer con `pagos.ver`; responde total, pagado, saldo y lista de pagos.
- Origen `VENTA` exige estado `CONFIRMADA`; `PEDIDO` admite `PROGRAMADO`, `EN_PROCESO` o `ENTREGADO`. El servicio consulta al propietario con el Bearer del actor y no modifica el pedido.
- Importes positivos en BOB con máximo dos decimales; enviar cadenas decimales. Reintentar con la misma clave y contenido reproduce la respuesta sin otro cobro. Cambiar contenido o actor con la misma clave produce conflicto.
- Errores: 401 sin sesión, 403 sin acceso, 404 origen inexistente, 422 datos o clave inválidos, 409 sobrepago/origen no pagable/clave conflictiva, 503 dependencia indisponible.
- Security debe provisionar permisos; Gateway y la confirmación de ventas pertenecen a T406/T404. Las tablas QR y recibos no demuestran que T405/T408/T411 estén implementadas.

## Pruebas aisladas reproducibles

Desde la raíz:

```powershell
docker compose -p dulce-payment-check -f docker-compose.payment-test.yml build payment-test
docker compose -p dulce-payment-check -f docker-compose.payment-test.yml run --rm payment-test
docker compose -p dulce-payment-check -f docker-compose.payment-test.yml down
```

El stack crea su propia red y PostgreSQL `payment-test-db/dulce_payment_test`, sin publicar puertos ni montar bases de desarrollo. Las pruebas rechazan otro host/base antes de migrar o limpiar registros. Usan PostgreSQL real y HTTP simulado de Security/Sales/Orders: verifican negocio y contratos esperados, no acreditan aceptación integral de servicios reales.

Las pruebas concurrentes lanzan dos procesos independientes contra PostgreSQL. Cubren sobrepago y repetición simultánea de clave. La suite también valida parciales, saldo, precisión, permisos, actor, estado del origen, caída de dependencia y persistencia al reconectar.

No ejecutar la suite contra desarrollo ni adaptar la protección para permitirlo. El contenedor de pruebas usa credenciales ficticias exclusivas y descartables.
