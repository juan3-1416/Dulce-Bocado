# Handoff técnico — Sprint 2 — Dulce Bocado

**Proyecto:** Dulce Bocado  
**Sprint:** Sprint 2 — Microservicios de Clientes, Catálogo, Ventas y Pedidos  
**Estado general:** ~70% completado  
**Última tarea cerrada:** T210 — Registrar/editar pedidos + snapshots  
**Siguiente tarea recomendada:** T212 — Estados y entrega del pedido

---

## 1. Resumen ejecutivo

El Sprint 2 ya tiene operativos los microservicios principales de **Customer**, **Catalog**, **Sales** y **Order** a nivel backend, con bases de datos separadas y comunicación REST entre servicios.

Ya se validó en ejecución real:

- Autenticación y permisos mediante `security-service`.
- Customer con PostgreSQL.
- Catalog con MySQL.
- Sales con PostgreSQL y consumo REST de Customer + Catalog.
- Order con PostgreSQL y consumo REST de Customer + Catalog.
- Creación y edición de pedidos con snapshots históricos.
- Rechazo de dependencias inválidas sin escrituras parciales.
- Persistencia por microservicio sin Foreign Keys entre bases externas.

Lo que falta se concentra principalmente en:

- Estados y entrega de pedidos.
- Frontend de Pedidos.
- Acciones React para estados/entrega.
- Validación funcional final del frontend de Ventas.
- Enrutamiento final del Gateway.
- Pruebas integrales y documentación final.

---

# 2. Estado del Sprint 2

## Tareas completadas

| Tarea | Estado | Resultado |
|---|---|---|
| T201 | COMPLETADA | Crear `customer-service` base |
| T202 | COMPLETADA | API de clientes |
| T203 | COMPLETADA | Frontend React de clientes |
| T204 | COMPLETADA | Crear `catalog-service` + MySQL |
| T205 | COMPLETADA | Categorías, productos y presentaciones |
| T206 | COMPLETADA | Frontend React de catálogo |
| T207 | COMPLETADA | Materias primas y recetas |
| T208 | COMPLETADA | Frontend de recetas |
| T209 | COMPLETADA | Crear `order-service` + PostgreSQL |
| T210 | COMPLETADA | Registrar/editar pedidos + snapshots |
| T214 | COMPLETADA | Crear `sales-service` + PostgreSQL |
| T215 | COMPLETADA | Venta, detalle y total |

## Tareas pendientes/parciales

| Tarea | Estado | Pendiente |
|---|---|---|
| T211 | PENDIENTE | React de Pedidos contra el nuevo `order-service` |
| T212 | PENDIENTE | Estados del pedido y entrega |
| T213 | PENDIENTE | Acciones React para estados/entrega/cancelación |
| T216 | PENDIENTE DE VALIDACIÓN | Validación funcional final del frontend de Ventas |
| T217 | PARCIAL | Completar Gateway e integración REST del Sprint 2 |
| T218 | PENDIENTE | Pruebas integrales + regresión + documentación |

### Progreso aproximado

- 12 tareas completadas.
- 1 tarea parcial.
- 5 tareas pendientes.
- Avance global aproximado: **70%**.

---

# 3. Arquitectura actual

Microservicios activos:

```text
microservices/
├── security-service
├── customer-service
├── catalog-service
├── sales-service
└── order-service
```

Compose de Sprint 2:

```text
docker-compose.sprint2.customer.yml
docker-compose.sprint2.catalog.yml
docker-compose.sprint2.sales.yml
docker-compose.sprint2.order.yml
```

Red Docker:

```text
dulce_bocado_net
```

## Bases de datos

| Servicio | Base | Motor |
|---|---|---|
| security-service | dulce_security | PostgreSQL |
| customer-service | dulce_customers | PostgreSQL |
| catalog-service | dulce_catalog | MySQL |
| sales-service | dulce_sales | PostgreSQL |
| order-service | dulce_orders | PostgreSQL |

### Regla arquitectónica importante

Cada servicio es dueño de su propia información.

NO se deben crear:

- Foreign Keys hacia tablas de otros microservicios.
- Consultas SQL directas entre Customer, Catalog, Sales, Order o Security.

Las referencias externas se guardan como IDs y se validan por REST.

---

# 4. Seguridad

`security-service` ya expone autenticación con Bearer Token.

Endpoints usados:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/internal/introspect
```

Los microservicios usan introspección interna para validar:

- Token.
- Usuario activo.
- Permiso.
- Identidad real del actor.

No se confía en `id_usuario` enviado desde frontend.

## Permiso Order ya agregado

```text
pedidos.gestionar_pedido
```

El usuario administrador ID `1` ya tiene ese permiso.

Todavía NO se habilitó:

```text
pedidos.gestionar_estado_entrega
```

Ese permiso debería incorporarse al trabajar T212.

---

# 5. Customer — estado actual

T201, T202 y T203 están completadas.

Customer activo utilizado para integración:

```text
id_cliente: 1
nombre: Cliente Prueba T202 Modificado
apellido: Temporal
ci_nit: T202-001
telefono: 70000002
correo: cliente.t202@prueba.local
estado: activo
```

Endpoint interno consumido por Sales y Order:

```text
GET /api/clientes/{id}
```

Headers internos:

```text
X-Internal-Service-Key
X-Actor-User-Id
```

Casos ya validados:

- Cliente registrado activo: OK.
- Cliente ocasional: no consulta Customer.
- Cliente inactivo: rechazado.
- Cliente inexistente: rechazado.

---

# 6. Catalog — estado actual

T204 a T208 completadas.

Catalog usa MySQL.

Presentación de integración utilizada:

```text
presentacion_id: 1
producto: Producto Integracion 192254
presentacion: Presentacion Integracion 192254
precio actual restaurado: 120.00 BOB
permite_personalizacion: false
disponible: true
```

Endpoint interno consumido por Sales y Order:

```text
GET /api/presentaciones/{presentacion}
```

El payload incluye:

```text
presentacion_id
id_producto
nombre
precio
moneda
disponible
permite_personalizacion
producto
categoria
```

La disponibilidad efectiva depende de:

```text
presentación disponible
AND producto activo
AND categoría activa
```

---

# 7. Sales — estado actual

T214 y T215 backend completadas.

`Sales`:

- Tiene PostgreSQL propio.
- Consulta Customer por REST.
- Consulta Catalog por REST.
- Usa Security por introspección.
- Calcula totales en backend.
- Guarda snapshots históricos.
- Tiene idempotencia.
- No usa FKs externas.

Permisos implementados:

```text
ventas.ver
ventas.crear
ventas.modificar
ventas.anular
```

Pruebas realizadas anteriormente incluyen:

- Creación real.
- Cliente registrado.
- Cliente ocasional.
- Cliente inactivo.
- Presentación no disponible.
- Snapshots de precio.
- Edición.
- Cancelación.
- Idempotencia.
- Atomicidad.

## Pendiente T216

Falta cerrar la validación funcional completa del frontend React de Ventas.

No declarar T216 completada hasta verificar:

- Listado.
- Crear venta.
- Editar.
- Cancelar/anular.
- Errores.
- Bearer token.
- Rutas a través del Gateway.

---

# 8. Order — T209 completada

`order-service` está creado con PostgreSQL.

Servicios Compose:

```text
order-service
order-db
```

Base:

```text
dulce_orders
```

La persistencia sobrevivió reinicio de la base durante T209.

## Tablas principales

### pedido

Campos principales:

```text
id_pedido
id_cliente
nombre_cliente_snapshot
nombre_cliente_ocasional
id_usuario
fecha_pedido
fecha_entrega
hora_entrega
total
moneda
estado
observaciones
id_usuario_entrega
fecha_entrega_efectiva
id_usuario_cancelacion
motivo_cancelacion
fecha_cancelacion
fecha_creacion
fecha_actualizacion
```

### detalle_pedido

```text
id_detalle_pedido
id_pedido
presentacion_id
nombre_producto_snapshot
nombre_presentacion_snapshot
precio_unitario_snapshot
cantidad
detalle_personalizacion
costo_personalizacion
subtotal
fecha_creacion
fecha_actualizacion
```

Única FK local:

```text
detalle_pedido.id_pedido -> pedido.id_pedido
```

No existen FKs hacia Customer o Catalog.

---

# 9. Order — T210 completada

## Archivos principales implementados

Dentro de:

```text
microservices/order-service/
```

### Configuración

```text
config/services.php
```

Dependencias:

```text
SECURITY_SERVICE_URL
INTERNAL_SERVICE_KEY

CUSTOMER_SERVICE_URL
CUSTOMER_SERVICE_KEY

CATALOGO_SERVICE_URL
CATALOGO_SERVICE_KEY
```

### Middleware

```text
app/Http/Middleware/AutorizarPermisoPedidos.php
```

Hace introspección contra Security.

Permiso actual:

```text
pedidos.gestionar_pedido
```

### Customer adapter

```text
app/Services/Clientes/ClienteService.php
app/Services/Clientes/ClienteServiceException.php
```

Método principal:

```php
validarParaPedido(
    string $tipoCliente,
    ?int $idCliente,
    ?string $nombreOcasional,
    int $actorId
)
```

Cliente REGISTRADO:

- Consulta Customer.
- Verifica existencia.
- Verifica activo.
- Congela nombre del cliente.

Cliente OCASIONAL:

- No consulta Customer.
- Guarda `nombre_cliente_ocasional`.

### Catalog adapter

```text
app/Services/Catalogo/CatalogoService.php
app/Services/Catalogo/CatalogoServiceException.php
```

Método:

```php
obtenerPresentacionParaPedido(
    int $presentacionId,
    int $actorId
)
```

Valida:

- Presentación existe.
- Disponible.
- Precio.
- Moneda BOB.
- Personalización.
- Producto relacionado.

Devuelve snapshot.

### Modelos

```text
app/Models/Pedido.php
app/Models/DetallePedido.php
```

Timestamps personalizados:

```text
fecha_creacion
fecha_actualizacion
```

### Request

```text
app/Http/Requests/GuardarPedidoRequest.php
```

Payload esperado:

```json
{
  "tipo_cliente": "REGISTRADO",
  "id_cliente": 1,
  "fecha_entrega": "2026-11-14",
  "hora_entrega": "16:00",
  "observaciones": "Pedido",
  "detalles": [
    {
      "id_producto_presentacion": 1,
      "cantidad": 2,
      "detalle_personalizacion": null,
      "costo_personalizacion": 0
    }
  ]
}
```

### Servicio de dominio

```text
app/Services/Pedidos/PedidoService.php
app/Services/Pedidos/PedidoException.php
```

Funciones:

```text
crear
actualizar
prepararDetalles
```

Reglas:

- Customer y Catalog se validan antes de la transacción local.
- El total lo calcula Order.
- No se acepta el precio desde frontend.
- Se almacenan snapshots.
- Update solo permitido en estado PROGRAMADO.
- En update se eliminan/recrean detalles.
- Al editar se consulta nuevamente Catalog y se congela el precio vigente.

### Controller

```text
app/Http/Controllers/PedidoController.php
```

### Rutas implementadas

```text
GET  /api/pedidos
POST /api/pedidos
GET  /api/pedidos/{pedido}
PUT  /api/pedidos/{pedido}
```

---

# 10. Pruebas reales de T210

## Customer REST

Cliente registrado:

```text
id_cliente: 1
nombre_cliente_snapshot:
Cliente Prueba T202 Modificado Temporal
```

Cliente ocasional:

```text
id_cliente: null
nombre_cliente_snapshot: null
nombre_cliente_ocasional:
Cliente Ocasional T210
```

Ambos OK.

## Catalog REST

Presentación:

```text
presentacion_id: 1
nombre_producto_snapshot:
Producto Integracion 192254

nombre_presentacion_snapshot:
Presentacion Integracion 192254

precio_unitario_snapshot:
120.00

moneda:
BOB

permite_personalizacion:
false
```

OK.

---

# 11. Primer pedido real creado

Resultado:

```text
HTTP/1.1 201 Created
```

Pedido:

```text
id_pedido: 1
id_cliente: 1
id_usuario: 1
estado: PROGRAMADO
fecha_entrega: 2026-11-14
hora_entrega: 16:00
total: 240.00
moneda: BOB
```

Snapshot cliente:

```text
Cliente Prueba T202 Modificado Temporal
```

Detalle:

```text
presentacion_id: 1
producto snapshot:
Producto Integracion 192254

presentación snapshot:
Presentacion Integracion 192254

precio snapshot:
120.00

cantidad:
2

subtotal:
240.00
```

Esto confirmó el flujo:

```text
Security
  ↓
Order
  ├── Customer REST
  ├── Catalog REST
  └── PostgreSQL dulce_orders
```

---

# 12. Prueba histórica de snapshots

Se modificó temporalmente Catalog:

```text
precio:
120.00 -> 130.00
```

El pedido existente mantuvo el snapshot histórico original.

Luego se editó explícitamente el pedido.

Resultado del PUT:

```text
HTTP/1.1 200 OK
```

Pedido actualizado:

```text
id_pedido: 1
estado: PROGRAMADO
fecha_entrega: 2026-11-15
hora_entrega: 17:00
total: 390.00
```

Detalle nuevo:

```text
precio_unitario_snapshot: 130.00
cantidad: 3
subtotal: 390.00
```

Se confirmó:

```text
3 × 130 = 390
```

La edición vuelve a consultar Catalog y congela el nuevo precio.

Finalmente Catalog fue restaurado a:

```text
120.00 BOB
```

---

# 13. Prueba de atomicidad T210

Antes del fallo:

```text
Pedido::count() = 1
```

Se intentó registrar un pedido con:

```text
presentacion_id = 999999
```

Catalog rechazó la referencia.

Después:

```text
Pedido::count() = 1
```

No se creó un pedido parcial.

T210 queda validada.

---

# 14. Problema resuelto durante T210 — DB_PASSWORD

Durante el primer POST real Order respondió:

```text
500 Internal Server Error
fe_sendauth: no password supplied
```

Se comprobó:

```text
getenv(DB_PASSWORD) length = 23
Laravel config password length = 23
```

CLI conectaba correctamente a:

```text
dulce_orders
```

Pero el proceso HTTP de `php artisan serve` estaba leyendo una configuración distinta.

Se corrigió:

```text
microservices/order-service/.env
```

Después se recreó únicamente:

```text
order-service
```

Con:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.sprint1.yml `
  -f docker-compose.sprint2.sales.yml `
  -f docker-compose.sprint2.customer.yml `
  -f docker-compose.sprint2.catalog.yml `
  -f docker-compose.sprint2.order.yml `
  up -d --force-recreate --no-deps order-service
```

Luego el POST devolvió:

```text
201 Created
```

IMPORTANTE:

No usar:

```text
docker compose restart
```

cuando se cambien variables `.env`.

Usar:

```text
up -d --force-recreate --no-deps SERVICIO
```

---

# 15. Archivos temporales usados para pruebas T210

En:

```text
microservices/order-service/
```

Se crearon temporalmente:

```text
tmp_t210_http.php
tmp_t210_payload.json
tmp_t210_edit.json
tmp_t210_fallo.json
```

Se pueden eliminar después de terminar validaciones si no se quieren versionar.

No deberían formar parte del código final del microservicio.

---

# 16. Próxima tarea recomendada — T212

Aunque numéricamente T211 viene antes, es mejor implementar primero T212.

Motivo:

El frontend de Pedidos debe construirse contra el comportamiento final del backend.

## T212 debe implementar

Estados:

```text
PROGRAMADO
EN_PROCESO
ENTREGADO
CANCELADO
```

Transiciones esperadas:

```text
PROGRAMADO
├── EN_PROCESO
├── ENTREGADO
└── CANCELADO

EN_PROCESO
├── ENTREGADO
└── CANCELADO
```

Estados terminales:

```text
ENTREGADO
CANCELADO
```

No deben permitir nuevas transiciones.

## Auditoría de entrega

Usar:

```text
id_usuario_entrega
fecha_entrega_efectiva
```

## Auditoría de cancelación

Usar:

```text
id_usuario_cancelacion
motivo_cancelacion
fecha_cancelacion
```

## Permiso requerido

Crear/asignar:

```text
pedidos.gestionar_estado_entrega
```

No reutilizar necesariamente `pedidos.gestionar_pedido`.

---

# 17. Tema crítico antes de T212 — pagos y entrega

En el monolito anterior existía una regla:

```text
un pedido no podía pasar a ENTREGADO si tenía saldo pendiente
```

Pero en la arquitectura nueva:

```text
payment-service
```

es propietario de pagos y corresponde al Sprint 3.

Por lo tanto NO se debe consultar directamente una tabla de pagos desde Order.

Antes de implementar la transición a `ENTREGADO` se debe revisar el documento Scrum oficial y definir el contrato.

No eliminar silenciosamente la regla del saldo.

---

# 18. T211 — React Pedidos

El frontend legado tiene:

```text
PedidosPage.jsx
PedidoModal.jsx
PedidoDetalleModal.jsx
CancelarPedidoModal.jsx
pedidoService.js
```

Actualmente `pedidoService.js` está basado en el backend monolítico.

Utiliza:

```text
/api/pedidos
cookies
XSRF
credentials: include
```

Debe migrarse a:

```text
Bearer Token
Gateway
order-service
```

## Funciones existentes del frontend

```text
listarPedidos
obtenerPedido
obtenerCatalogosPedido
crearPedido
actualizarPedido
cambiarEstadoPedido
```

### Problema pendiente

El frontend legado llama:

```text
GET /api/pedidos/catalogos
```

Ese endpoint NO existe actualmente en `order-service`.

Hay dos posibilidades:

### Opción A — Aggregator en Order

Crear:

```text
GET /api/pedidos/catalogos
```

y que Order consulte Customer + Catalog internamente.

Ventaja:

El usuario de Pedidos solo necesita permisos de Pedidos.

### Opción B — React consulta Customer y Catalog

React llama directamente:

```text
/api/clientes
/api/presentaciones
```

por Gateway.

Problema:

El usuario necesitaría permisos adicionales de Customer/Catalog.

Antes de T211 decidir cuál enfoque mantener.

Probablemente el aggregator de Order sea más compatible con la interfaz legado.

---

# 19. T213 — acciones React de pedido

Después de T212:

Agregar en React:

```text
Iniciar preparación
Marcar entregado
Cancelar pedido
```

Mostrar acciones según estado.

Ejemplo:

```text
PROGRAMADO:
- editar
- iniciar
- entregar
- cancelar

EN_PROCESO:
- entregar
- cancelar

ENTREGADO:
- solo ver

CANCELADO:
- solo ver
```

El frontend no debe decidir reglas de dominio.

El backend debe volver a validar toda transición.

---

# 20. T217 — Gateway

Actualmente T217 está parcialmente hecho.

Hay que asegurar que las rutas del Sprint 2 NO caigan en el backend legado.

El Gateway debe enrutar explícitamente:

```text
/api/clientes
    -> customer-service

/api/categorias
/api/productos
/api/presentaciones
/api/recetas
/api/materias-primas
    -> catalog-service

/api/ventas
    -> sales-service

/api/pedidos
    -> order-service
```

Las rutas deben tener precedencia sobre:

```text
location /api/
```

que todavía puede apuntar al backend legado.

También preservar:

```text
Authorization
Content-Type
method
body
query params
```

La ruta interna:

```text
/api/internal/introspect
```

NO debe quedar públicamente accesible desde Gateway.

---

# 21. T218 — integración final

Antes de cerrar Sprint 2 ejecutar pruebas extremo a extremo.

## Seguridad

Probar:

```text
sin token -> 401
token inválido -> 401
sin permiso -> 403
Security caída -> servicio falla cerrado
```

## Customer

```text
listar
crear
editar
activar/desactivar
```

## Catalog

```text
categorías
productos
presentaciones
materias primas
recetas
```

## Sales

```text
listar
crear
editar
cancelar
snapshots
cliente inactivo
presentación no disponible
```

## Orders

```text
listar
crear
editar
cliente registrado
cliente ocasional
snapshots
estado
entrega
cancelación
```

## Fallos de dependencias

Probar caída de:

```text
Customer
Catalog
Security
```

y confirmar:

```text
no hay escrituras parciales
```

## Persistencia

Reiniciar servicios/DB sin borrar volúmenes y confirmar datos.

NO usar:

```text
migrate:fresh
docker compose down -v
```

sobre las bases actuales.

---

# 22. Comando Compose base usado en Sprint 2

Para trabajar con todos los servicios actuales:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.sprint1.yml `
  -f docker-compose.sprint2.sales.yml `
  -f docker-compose.sprint2.customer.yml `
  -f docker-compose.sprint2.catalog.yml `
  -f docker-compose.sprint2.order.yml `
  ps
```

Para ejecutar comandos dentro de Order:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.sprint1.yml `
  -f docker-compose.sprint2.sales.yml `
  -f docker-compose.sprint2.customer.yml `
  -f docker-compose.sprint2.catalog.yml `
  -f docker-compose.sprint2.order.yml `
  exec -T order-service COMANDO
```

---

# 23. Reglas de trabajo importantes

1. No usar `migrate:fresh` sobre bases con datos.
2. No borrar volúmenes Docker para "arreglar" una migración.
3. No crear FK entre bases de microservicios.
4. No consultar tablas externas directamente.
5. No aceptar `id_usuario` del frontend como identidad.
6. No aceptar precios/totales calculados por React.
7. Las dependencias externas se validan por REST.
8. Las transacciones son locales al microservicio.
9. Validar Customer/Catalog antes de iniciar la transacción DB cuando sea posible.
10. Si falla una dependencia, no dejar registros parciales.
11. `.env` modificado -> recrear contenedor, no solo reiniciarlo.
12. No exponer claves internas ni contraseñas en logs/documentación.
13. No declarar una tarea completada sin prueba funcional real.

---

# 24. Estado recomendado al retomar

El siguiente desarrollador debería empezar por:

```text
1. Revisar git status.
2. Levantar todos los Compose.
3. Confirmar /up de los microservicios.
4. Confirmar login admin.
5. Revisar T212.
6. Resolver la regla de pagos antes de implementar ENTREGADO.
7. Implementar estados/auditoría.
8. Probar T212.
9. Migrar React Pedidos T211.
10. Implementar acciones T213.
11. Cerrar T216.
12. Completar Gateway T217.
13. Ejecutar integración/regresión T218.
```

---

# 25. Estado final de este handoff

Último resultado confirmado:

```text
T210 COMPLETADA
```

Pedido real de integración:

```text
id_pedido = 1
estado = PROGRAMADO
cliente = 1
precio snapshot actual después de edición = 130.00
cantidad = 3
total = 390.00
```

El precio de Catalog fue restaurado posteriormente a:

```text
120.00 BOB
```

La prueba de atomicidad confirmó:

```text
Pedido::count() antes = 1
Pedido::count() después del fallo = 1
```

No hubo escritura parcial.

---

## Punto de continuación

**Continuar con T212 — Estados y entrega del pedido.**

Antes de programar `ENTREGADO`, revisar específicamente el contrato entre `order-service` y `payment-service` para conservar correctamente la regla de saldo pagado sin violar la separación de microservicios.
