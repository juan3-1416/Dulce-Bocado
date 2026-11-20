# Guía de Pruebas y Consolidación Integral de Microservicios — Sprint 4

**Proyecto:** Dulce Bocado — Sistema de Información Web para Gestión de Ventas, Pedidos, Producción e Inventario  
**Propósito:** Manual técnico y guía de ejecución paso a paso estructurada en **Tareas de Prueba (TP)** para consolidar, verificar y validar el ecosistema completo de microservicios de cara al cierre de Sprint 4 y paso a producción.  
**Microservicios Involucrados:**
- `gateway` (Nginx Proxy Inverso, Puerto 8080)
- `security-service` (Autenticación y Permisos Sanctum, PostgreSQL: `dulce_security`)
- `catalog-service` (Catálogo de Productos, Presentaciones y Recetas, MySQL: `dulce_catalog`)
- `inventory-service` (Almacenes, Existencias y Movimientos, PostgreSQL: `dulce_inventory`)
- `production-service` (Órdenes de Producción y Consumos, PostgreSQL: `dulce_production`)
- `sales-service` (Ventas y Confirmación con Egreso de Stock, PostgreSQL: `dulce_sales`)
- `order-service` (Gestión de Pedidos y Entregas, PostgreSQL: `dulce_orders`)
- `payment-service` (Pagos en Efectivo, Pasarela QR Libélula y Recibos, PostgreSQL: `dulce_payment`)
- `frontend` (Single Page Application React + Vite, Puerto 5173)

---

## Índice de Tareas de Prueba

1. [TP-01: Despliegue de Infraestructura y Verificación de Salud (Health Checks)](#tp-01-despliegue-de-infraestructura-y-verificación-de-salud-health-checks)
2. [TP-02: Autenticación, Roles y Permisos Sanctum (Security Service)](#tp-02-autenticación-roles-y-permisos-sanctum-security-service)
3. [TP-03: Catálogo, Recetas y Existencias en Almacén Mostrador (Catalog + Inventory)](#tp-03-catálogo-recetas-y-existencias-en-almacén-mostrador-catalog--inventory)
4. [TP-04: Confirmación Idempotente de Venta y Descuento de Stock (Sales + Inventory)](#tp-04-confirmación-idempotente-de-venta-y-descuento-de-stock-sales--inventory)
5. [TP-05: Pagos en Efectivo, Cálculo de Saldo y Control de Sobrepago (Payment Service)](#tp-05-pagos-en-efectivo-cálculo-de-saldo-y-control-de-sobrepago-payment-service)
6. [TP-06: Cobro QR con Pasarela Oficial Libélula y Callback GET (Payment Service + Pasarela)](#tp-06-cobro-qr-con-pasarela-oficial-libélula-y-callback-get-payment-service--pasarela)
7. [TP-07: Emisión, Descarga de PDF y Anulación de Recibos Internos (Payment Service)](#tp-07-emisión-descarga-de-pdf-y-anulación-de-recibos-internos-payment-service)
8. [TP-08: Asociación de Anticipos y Saldos a Pedidos (Order Service + Payment Service)](#tp-08-asociación-de-anticipos-y-saldos-a-pedidos-order-service--payment-service)
9. [TP-09: Seguridad, Control de Accesos y Aislamiento de Rutas Internas](#tp-09-seguridad-control-de-accesos-y-aislamiento-de-rutas-internas)
10. [TP-10: Resiliencia y Persistencia de Datos tras Reinicio](#tp-10-resiliencia-y-persistencia-de-datos-tras-reinicio)
11. [Checklist Final de Consolidación para el Equipo](#checklist-final-de-consolidación-para-el-equipo)

---

### TP-01: Despliegue de Infraestructura y Verificación de Salud (Health Checks)

- **Objetivo:** Garantizar que todos los contenedores de los microservicios, sus bases de datos y el API Gateway arranquen de manera saludable y respondan en sus endpoints públicos.
- **Precondiciones:**
  - Docker Desktop iniciado y operativo en el entorno anfitrión.
  - Archivos `.env` configurados en cada microservicio con sus respectivas credenciales de base de datos.
- **Paso a Paso de Ejecución:**

1. Levantar el stack completo de microservicios desde la raíz del proyecto:
   ```bash
   docker compose up -d --build
   ```
2. Verificar el estado de los contenedores (todos deben figurar en estado `Up` o `healthy`):
   ```bash
   docker compose ps
   ```
3. Ejecutar los health checks de cada microservicio a través del API Gateway (puerto 8080):
   ```bash
   # Gateway general
   curl -i http://localhost:8080/up

   # Security Service
   curl -i http://localhost:8080/api/auth/up

   # Sales Service
   curl -i http://localhost:8080/api/ventas/up

   # Payment Service
   curl -i http://localhost:8080/api/pagos/up

   # Inventory Service
   curl -i http://localhost:8080/api/inventario/up

   # Catalog Service
   curl -i http://localhost:8080/api/catalogo/up

   # Order Service
   curl -i http://localhost:8080/api/pedidos/up
   ```
- **Resultado Esperado:** Todos los endpoints responden con código HTTP `200 OK`.
- **Criterio de Aceptación:** Ningún contenedor reinicia de forma cíclica (`CrashLoopBackOff`) y el Gateway enruta el tráfico sin errores `502 Bad Gateway`.

---

### TP-02: Autenticación, Roles y Permisos Sanctum (Security Service)

- **Objetivo:** Autenticar usuarios con credenciales válidas, obtener tokens Bearer y validar que los permisos requeridos para el Sprint 4 (`ventas.confirmar`, `pagos.crear`, `pagos.ver`, `recibos.crear`, `recibos.ver`, `recibos.anular`) sean emitidos correctamente.
- **Paso a Paso de Ejecución:**

1. Iniciar sesión como Cajero / Vendedor:
   ```bash
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "vendedor@dulcebocado.com",
       "password": "password123"
     }'
   ```
2. **Respuesta Esperada (HTTP 200 OK):**
   ```json
   {
     "token": "1|sanctum_token_vendedor_alfanumerico...",
     "usuario": {
       "id_usuario": 2,
       "nombre": "Cajero Mostrador",
       "email": "vendedor@dulcebocado.com",
       "permisos": [
         "ventas.ver",
         "ventas.crear",
         "ventas.confirmar",
         "pagos.ver",
         "pagos.crear",
         "recibos.ver",
         "recibos.crear"
       ]
     }
   }
   ```
3. Guardar el token devuelto en una variable de entorno para las siguientes pruebas:
   ```bash
   TOKEN="Bearer 1|sanctum_token_vendedor_alfanumerico..."
   ```

---

### TP-03: Catálogo, Recetas y Existencias en Almacén Mostrador (Catalog + Inventory)

- **Objetivo:** Comprobar que los productos a vender existen en `catalog-service` y verificar sus existencias disponibles en el almacén `MOSTRADOR` en `inventory-service`.
- **Paso a Paso de Ejecución:**

1. Consultar el listado de presentaciones activas en Catálogo:
   ```bash
   curl -X GET http://localhost:8080/api/catalogo/presentaciones \
     -H "Authorization: $TOKEN"
   ```
2. Consultar las existencias disponibles de una presentación específica (ej: ID 1 - Torta Chocolate Pequeña) en el almacén de mostrador:
   ```bash
   curl -X GET "http://localhost:8080/api/inventario/existencias?almacen=MOSTRADOR&presentacion_id=1" \
     -H "Authorization: $TOKEN"
   ```
3. **Respuesta Esperada (HTTP 200 OK):**
   ```json
   {
     "almacen": "MOSTRADOR",
     "presentacion_id": 1,
     "stock_disponible": 10.00,
     "unidad": "unidad"
   }
   ```
- **Criterio de Aceptación:** Si `stock_disponible` es menor a la cantidad requerida para la venta, registrar un ingreso o traslado previo antes de proceder con TP-04.

---

### TP-04: Confirmación Idempotente de Venta y Descuento de Stock (Sales + Inventory)

- **Objetivo:** Verificar que una venta en borrador se confirme únicamente si existe stock en mostrador, descontando inventario de forma atómica e impidiendo duplicaciones mediante idempotencia.
- **Paso a Paso de Ejecución:**

#### Escenario A: Rechazo por Stock Insuficiente
1. Crear un borrador de venta en `sales-service` solicitando una cantidad mayor al stock disponible (ej: 999 unidades):
   ```bash
   curl -X POST http://localhost:8080/api/ventas \
     -H "Authorization: $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tipo_comprobante": "RECIBO",
       "detalles": [
         { "id_producto_presentacion": 1, "cantidad": 999, "precio_unitario": 50.00 }
       ]
     }'
   ```
   *(Suponga que devuelve `"id_venta": 50` en estado `BORRADOR`)*.

2. Intentar confirmar la venta con stock insuficiente:
   ```bash
   curl -X POST http://localhost:8080/api/ventas/50/confirmar \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: confirm-test-fail-0001"
   ```
3. **Respuesta Esperada (HTTP 409 Conflict):**
   ```json
   {
     "error": {
       "code": "STOCK_INSUFICIENTE",
       "message": "No existe stock suficiente en mostrador para una o más presentaciones de la venta.",
       "detalles": { "id_producto_presentacion": 1, "disponible": 10.00, "solicitado": 999 }
     }
   }
   ```
4. **Verificación en BD:** Comprobar que en `dulce_sales.venta` el registro #50 permanece en estado `BORRADOR`.

#### Escenario B: Confirmación Exitosa con Stock Suficiente
1. Crear un borrador con cantidad válida (ej: 2 unidades):
   ```bash
   curl -X POST http://localhost:8080/api/ventas \
     -H "Authorization: $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tipo_comprobante": "RECIBO",
       "detalles": [
         { "id_producto_presentacion": 1, "cantidad": 2, "precio_unitario": 50.00 }
       ]
     }'
   ```
   *(Devuelve `"id_venta": 51`, `"total": "100.00"`)*.

2. Confirmar la venta exitosamente:
   ```bash
   curl -X POST http://localhost:8080/api/ventas/51/confirmar \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: confirm-test-success-0001"
   ```
3. **Respuesta Esperada (HTTP 200 OK):**
   ```json
   {
     "mensaje": "Venta confirmada exitosamente y stock descontado de mostrador.",
     "venta": {
       "id_venta": 51,
       "estado": "CONFIRMADA",
       "total": "100.00",
       "operacion_stock_id": "VENTA-51"
     }
   }
   ```
4. **Verificación de Idempotencia:** Reenviar exactamente la misma petición con la misma clave `Idempotency-Key: confirm-test-success-0001`.
   - **Resultado:** Retorna `HTTP 200 OK` idéntico.
5. **Verificación en Bases de Datos:**
   ```sql
   -- En dulce_sales:
   SELECT id_venta, estado, total FROM venta WHERE id_venta = 51;
   -- Esperado: estado = 'CONFIRMADA'

   -- En dulce_inventory:
   SELECT * FROM movimiento WHERE operacion_id = 'VENTA-51';
   -- Esperado: tipo_movimiento = 'EGRESO', almacen = 'MOSTRADOR', cantidad = 2.00
   ```

---

### TP-05: Pagos en Efectivo, Cálculo de Saldo y Control de Sobrepago (Payment Service)

- **Objetivo:** Validar pagos parciales y totales en efectivo sobre la venta confirmada #51 (Total: 100.00 BOB), verificando el rechazo de sobrepagos.
- **Paso a Paso de Ejecución:**

1. Consultar el saldo inicial de la venta #51 en `payment-service`:
   ```bash
   curl -X GET "http://localhost:8080/api/pagos?origen=VENTA&origen_id=51" \
     -H "Authorization: $TOKEN"
   ```
   **Respuesta:** `"total": "100.00"`, `"pagado": "0.00"`, `"saldo": "100.00"`.

2. Registrar un primer pago parcial de Bs 40.00 en efectivo:
   ```bash
   curl -X POST http://localhost:8080/api/pagos/efectivo \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: pago-efec-test-0001" \
     -H "Content-Type: application/json" \
     -d '{
       "origen_tipo": "VENTA",
       "origen_id": 51,
       "monto": 40.00,
       "moneda": "BOB"
     }'
   ```
   **Respuesta (HTTP 201 Created):**
   ```json
   {
     "mensaje": "Pago registrado correctamente.",
     "pago": { "id_pago": 1, "monto": "40.00", "medio": "EFECTIVO", "estado": "CONFIRMADO" },
     "resumen": { "total": "100.00", "pagado": "40.00", "saldo": "60.00" }
   }
   ```

3. Intentar registrar un sobrepago de Bs 70.00 (cuando el saldo disponible es solo 60.00):
   ```bash
   curl -X POST http://localhost:8080/api/pagos/efectivo \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: pago-efec-test-over-0001" \
     -H "Content-Type: application/json" \
     -d '{
       "origen_tipo": "VENTA",
       "origen_id": 51,
       "monto": 70.00
     }'
   ```
   **Respuesta Esperada (HTTP 409 Conflict):**
   ```json
   {
     "error": {
       "code": "SOBREPAGO",
       "message": "El monto del pago supera el saldo pendiente de la operación.",
       "details": { "saldo": "60.00", "monto_intentado": 70.00 }
     }
   }
   ```

4. Registrar el pago final de Bs 60.00:
   ```bash
   curl -X POST http://localhost:8080/api/pagos/efectivo \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: pago-efec-test-0002" \
     -H "Content-Type: application/json" \
     -d '{
       "origen_tipo": "VENTA",
       "origen_id": 51,
       "monto": 60.00
     }'
   ```
   **Respuesta (HTTP 201 Created):** `"saldo": "0.00"`.
5. **Verificación en BD:**
   ```sql
   SELECT id_pago, monto, medio, estado FROM pago WHERE origen_tipo = 'VENTA' AND origen_id = 51;
   -- Esperado: 2 filas (40.00 y 60.00, ambas con estado 'CONFIRMADO')
   ```

---

### TP-06: Cobro QR con Pasarela Oficial Libélula y Callback GET (Payment Service + Pasarela)

- **Objetivo:** Probar la integración real con la pasarela **Libélula**, verificando la generación del código QR con la AppKey oficial y la confirmación mediante el webhook GET.
- **Paso a Paso de Ejecución:**

1. Crear una nueva venta confirmada #52 por Bs 50.00 para la prueba de QR.
2. Iniciar el cobro QR desde el frontend o mediante API:
   ```bash
   curl -X POST http://localhost:8080/api/pagos/qr \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: qr-libelula-test-0001" \
     -H "Content-Type: application/json" \
     -d '{
       "origen_tipo": "VENTA",
       "origen_id": 52,
       "monto": 50.00
     }'
   ```
3. **Respuesta Esperada (HTTP 201 Created):**
   ```json
   {
     "intento_qr": {
       "id_intento_qr": 10,
       "origen_tipo": "VENTA",
       "origen_id": 52,
       "monto": "50.00",
       "estado": "PENDIENTE",
       "qr_url": "https://api.libelula.bo/qr/img/...",
       "pasarela_url": "https://pago.libelula.bo/checkout/...",
       "identificador": "DB-QR-VENTA-52-1732050000"
     }
   }
   ```
4. Consultar el estado del intento (simulando el polling del frontend):
   ```bash
   curl -X GET http://localhost:8080/api/pagos/qr/10 \
     -H "Authorization: $TOKEN"
   ```
   *(Estado devuelto: `PENDIENTE`)*.

5. Simular la llegada del callback oficial de Libélula por **GET** (o pagar el QR real de pruebas desde la pasarela):
   ```bash
   IDENTIFICADOR="DB-QR-VENTA-52-1732050000"

   curl -i "http://localhost:8080/api/pagos/qr/callback?transaction_id=$IDENTIFICADOR&error=0&message=Aprobado&cancel_order=0&idqr=LIB-999888&monto_total=50.00"
   ```
6. **Respuesta Esperada (HTTP 200 OK):** Retorna confirmación JSON o vista HTML aprobada.
7. **Verificación en BD:**
   ```sql
   -- Intento actualizado a CONFIRMADA:
   SELECT id_intento_qr, estado, referencia_proveedor FROM intento_qr WHERE id_intento_qr = 10;
   -- Esperado: estado = 'CONFIRMADA'

   -- Auditoría inmutable registrada:
   SELECT * FROM evento_qr WHERE id_intento_qr = 10;
   -- Esperado: estado_resultante = 'CONFIRMADA', payload contiene error=0 y transaction_id

   -- Pago confirmado generado:
   SELECT id_pago, origen_tipo, origen_id, monto, medio, estado FROM pago WHERE origen_id = 52;
   -- Esperado: monto = 50.00, medio = 'QR', estado = 'CONFIRMADO'
   ```

---

### TP-07: Emisión, Descarga de PDF y Anulación de Recibos Internos (Payment Service)

- **Objetivo:** Emitir un recibo interno con número correlativo a partir del pago confirmado, descargar el PDF estándar A4 generado nativamente y probar la anulación justificada.
- **Paso a Paso de Ejecución:**

1. Emitir recibo para el pago #1 (creado en TP-05):
   ```bash
   curl -X POST http://localhost:8080/api/recibos \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: recibo-gen-test-0001" \
     -H "Content-Type: application/json" \
     -d '{
       "id_pago": 1
     }'
   ```
2. **Respuesta Esperada (HTTP 201 Created):**
   ```json
   {
     "mensaje": "Recibo generado exitosamente.",
     "recibo": {
       "id_recibo": 1,
       "numero": "REC-000001",
       "id_pago": 1,
       "monto": "40.00",
       "estado": "EMITIDO"
     }
   }
   ```
3. Descargar el archivo binario PDF mediante el endpoint público del Gateway:
   ```bash
   curl -X GET http://localhost:8080/api/recibos/1/pdf \
     -H "Authorization: $TOKEN" \
     -o recibo_test_REC000001.pdf
   ```
4. **Verificación del Archivo PDF:**
   - Abrir `recibo_test_REC000001.pdf` en un visor.
   - Debe visualizarse con tipografía Helvetica nítida, formato de página A4, encabezado "DULCE BOCADO", número correlativo `REC-000001`, desglose de monto en Bs y pie de auditoría.
5. Anular el recibo con motivo obligatorio:
   ```bash
   curl -X POST http://localhost:8080/api/recibos/1/anular \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: recibo-anul-test-0001" \
     -H "Content-Type: application/json" \
     -d '{
       "motivo_anulacion": "Datos de cliente incorrectos solicitados por el comprador"
     }'
   ```
6. **Verificación en BD:**
   ```sql
   -- El recibo pasa a estado ANULADO:
   SELECT id_recibo, estado, motivo_anulacion FROM recibo WHERE id_recibo = 1;
   -- Esperado: estado = 'ANULADO', motivo registrado

   -- El pago NO se borra ni reembolsa:
   SELECT id_pago, estado FROM pago WHERE id_pago = 1;
   -- Esperado: estado = 'CONFIRMADO'
   ```

---

### TP-08: Asociación de Anticipos y Saldos a Pedidos (Order Service + Payment Service)

- **Objetivo:** Registrar un anticipo por QR o efectivo para un pedido programado en `order-service`, comprobando que el anticipo se asocie correctamente en `payment-service` sin mutar de forma descontrolada el estado de entrega del pedido.
- **Paso a Paso de Ejecución:**

1. Consultar un pedido activo en `order-service` (ej: Pedido #5 por Bs 200.00 en estado `PROGRAMADO`):
   ```bash
   curl -X GET http://localhost:8080/api/pedidos/5 \
     -H "Authorization: $TOKEN"
   ```
2. Registrar un cobro de anticipo de Bs 100.00 (50%) en efectivo para el pedido #5:
   ```bash
   curl -X POST http://localhost:8080/api/pagos/efectivo \
     -H "Authorization: $TOKEN" \
     -H "Idempotency-Key: pago-anticipo-ped-0001" \
     -H "Content-Type: application/json" \
     -d '{
       "origen_tipo": "PEDIDO",
       "origen_id": 5,
       "monto": 100.00
     }'
   ```
3. Consultar los saldos y pagos del pedido:
   ```bash
   curl -X GET "http://localhost:8080/api/pagos?origen=PEDIDO&origen_id=5" \
     -H "Authorization: $TOKEN"
   ```
   **Respuesta:** `"total": "200.00"`, `"pagado": "100.00"`, `"saldo": "100.00"`.
4. Verificar el estado del pedido en `order-service`:
   ```bash
   curl -X GET http://localhost:8080/api/pedidos/5 \
     -H "Authorization: $TOKEN"
   ```
- **Criterio de Aceptación Crítico:** El pedido **debe permanecer en estado `PROGRAMADO`**. El registro del anticipo económico no debe forzar el cambio automático a `ENTREGADO` o `EN_PROCESO` (la entrega la gestiona el personal de despacho en su flujo específico).

---

### TP-09: Seguridad, Control de Accesos y Aislamiento de Rutas Internas

- **Objetivo:** Demostrar que las rutas internas de comunicación inter-servicio están completamente inaccesibles desde el exterior y que las solicitudes no autenticadas son rechazadas.
- **Paso a Paso de Ejecución:**

1. Intentar acceder a un endpoint de cobro sin cabecera `Authorization`:
   ```bash
   curl -i -X POST http://localhost:8080/api/pagos/efectivo \
     -H "Content-Type: application/json" \
     -d '{ "origen_tipo": "VENTA", "origen_id": 1, "monto": 10.00 }'
   ```
   **Resultado Esperado:** Código HTTP `401 Unauthorized`.

2. Intentar invocar la ruta interna de descuento de stock de inventario desde el navegador / cliente público:
   ```bash
   curl -i -X POST http://localhost:8080/internal/ventas/descontar \
     -H "Authorization: $TOKEN"
   ```
   **Resultado Esperado:** Código HTTP `404 Not Found` (el API Gateway Nginx no publica rutas `/internal/*`).

3. Intentar acceder con un token de cliente sin permisos de cajero a la anulación de recibos:
   **Resultado Esperado:** Código HTTP `403 Forbidden` (`No tienes permiso para anular recibos`).

---

### TP-10: Resiliencia y Persistencia de Datos tras Reinicio

- **Objetivo:** Verificar que ante un reinicio abrupto de los contenedores Docker o de los motores de bases de datos, no se pierdan datos de ventas, pagos, movimientos de stock ni recibos.
- **Paso a Paso de Ejecución:**

1. Reiniciar todos los servicios del proyecto:
   ```bash
   docker compose restart
   ```
2. Esperar 15 segundos y consultar la venta #51, sus pagos y sus movimientos de inventario:
   ```bash
   curl -X GET http://localhost:8080/api/ventas/51 -H "Authorization: $TOKEN"
   curl -X GET "http://localhost:8080/api/pagos?origen=VENTA&origen_id=51" -H "Authorization: $TOKEN"
   curl -X GET http://localhost:8080/api/recibos/1 -H "Authorization: $TOKEN"
   ```
- **Resultado Esperado:** Todos los registros existen, conservan sus estados (`CONFIRMADA`, `PAGADO`, `ANULADO`) y los saldos son idénticos a los observados antes del reinicio.

---

## Checklist Final de Consolidación para el Equipo

Marque cada casilla tras comprobar la prueba en el entorno de desarrollo conjunto:

- [ ] **TP-01:** Todos los 8 contenedores y el API Gateway encienden con `docker compose up -d` y responden `200 OK` en `/up`.
- [ ] **TP-02:** Autenticación Sanctum emite tokens válidos con permisos para cajero y administrador.
- [ ] **TP-03:** Catálogo lista presentaciones e Inventario muestra existencias disponibles en `MOSTRADOR`.
- [ ] **TP-04:** Ventas rechaza confirmación con `409 STOCK_INSUFICIENTE` si falta stock, confirma si hay saldo y descuenta en `dulce_inventory.movimiento` con idempotencia.
- [ ] **TP-05:** Pagos en efectivo valida saldos, rechaza sobrepagos (`409 SOBREPAGO`) y registra pagos parciales acumulativos.
- [ ] **TP-06:** Cobros QR genera deuda en Libélula con AppKey oficial, procesa el callback por GET con `transaction_id = identificador`, inserta auditoría `evento_qr` y confirma el pago.
- [ ] **TP-07:** Recibos genera correlativo `REC-XXXXXX`, descarga PDF nativo 1.4 A4 limpio y permite anulación justificada sin borrar el pago.
- [ ] **TP-08:** Anticipos en Pedidos refleja saldos en `PedidoDetalleModal` sin alterar automáticamente el estado de entrega en `order-service`.
- [ ] **TP-09:** Rutas `/internal/*` están bloqueadas al exterior y endpoints protegidos exigen Bearer token (`401` / `403`).
- [ ] **TP-10:** Los datos permanecen íntegros y persistidos en PostgreSQL y MySQL tras `docker compose restart`.
- [ ] **Frontend:** Compilación de producción `npm run build` sin errores y `oxlint` con 0 errores de sintaxis.
