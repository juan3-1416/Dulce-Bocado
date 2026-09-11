# CU14 — Gestionar Pedido

## 1. Objetivo

Implementar el caso de uso **CU14 — Gestionar Pedido** del sistema **Dulce Bocado**, permitiendo registrar, consultar y modificar pedidos de clientes registrados u ocasionales.

El pedido permite:

- Seleccionar un cliente registrado o registrar un cliente ocasional.
- Agregar una o varias presentaciones de productos.
- Definir cantidades.
- Aplicar personalización únicamente cuando la presentación lo permita.
- Registrar costo adicional por personalización.
- Definir fecha y hora de entrega.
- Registrar observaciones.
- Congelar el precio vigente de cada presentación al guardar.
- Calcular subtotales y total desde el backend.
- Crear el pedido inicialmente en estado `PROGRAMADO`.
- Modificar únicamente pedidos que continúen en estado `PROGRAMADO`.
- Registrar el pedido sin reservar ni descontar inventario.

---

## 2. Reglas de negocio implementadas

### 2.1 Cliente

El pedido admite dos tipos de cliente:

- `REGISTRADO`
- `OCASIONAL`

Para cliente registrado se almacena `id_cliente`.

Para cliente ocasional se almacena `nombre_cliente_ocasional`.

La base de datos garantiza que el pedido tenga exactamente uno de los dos.

### 2.2 Estado inicial

Todo pedido registrado mediante CU14 se crea con:

```text
PROGRAMADO
```

Los estados definidos son:

```text
PROGRAMADO
EN_PROCESO
ENTREGADO
CANCELADO
```

La gestión de estados y la entrega corresponden a **CU15 — Gestionar Estado y Entrega de Pedido**.

### 2.3 Precio congelado

El frontend no envía el precio definitivo del pedido.

Laravel obtiene el precio directamente desde:

```text
producto_presentacion.precio
```

y lo almacena en:

```text
detalle_pedido.precio_congelado
```

### 2.4 Cálculo del subtotal

```text
subtotal =
(precio_congelado × cantidad)
+ costo_personalizacion
```

### 2.5 Cálculo del total

```text
total_pedido = SUM(subtotales)
```

El total mostrado en React es únicamente una vista previa.

### 2.6 Personalización

Se agregó a `producto_presentacion`:

```text
permite_personalizacion BOOLEAN
```

Cuando `permite_personalizacion = false`, el backend rechaza personalización o costos adicionales.

### 2.7 Inventario

Registrar un pedido en CU14:

```text
NO reserva stock
NO descuenta stock
NO genera movimientos de inventario
```

La validación de disponibilidad real y el descuento de existencias se realizarán al momento de la entrega mediante CU15.

---

## 3. Base de datos

### 3.1 Tabla `pedido`

Campos:

```text
id_pedido
id_cliente
nombre_cliente_ocasional
id_usuario
fecha_pedido
fecha_entrega
hora_entrega
total
estado
observaciones
fecha_creacion
fecha_actualizacion
```

Restricciones:

- Cliente registrado u ocasional, pero no ambos.
- `total >= 0`.
- Estados permitidos: `PROGRAMADO`, `EN_PROCESO`, `ENTREGADO`, `CANCELADO`.
- FK hacia `cliente`.
- FK hacia `usuarios`.

### 3.2 Tabla `detalle_pedido`

Campos:

```text
id_detalle_pedido
id_pedido
id_producto_presentacion
cantidad
precio_congelado
detalle_personalizacion
costo_personalizacion
subtotal
fecha_creacion
fecha_actualizacion
```

Restricciones:

```text
cantidad > 0
precio_congelado > 0
costo_personalizacion >= 0
subtotal > 0
```

Relaciones:

- `detalle_pedido.id_pedido` → `pedido.id_pedido`
- `detalle_pedido.id_producto_presentacion` → `producto_presentacion.id_producto_presentacion`

### 3.3 Modificación de `producto_presentacion`

Se agregó:

```text
permite_personalizacion BOOLEAN DEFAULT FALSE
```

---

## 4. Modelos Laravel

Se implementaron:

```text
backend/app/Models/Pedido.php
backend/app/Models/DetallePedido.php
```

Relaciones:

```text
Pedido belongsTo Cliente
Pedido belongsTo Usuario
Pedido hasMany DetallePedido

DetallePedido belongsTo Pedido
DetallePedido belongsTo ProductoPresentacion
```

También se agregaron relaciones en `Cliente`, `Usuario` y `ProductoPresentacion`.

---

## 5. Permiso

Se creó:

```text
pedidos.gestionar_pedido
```

Asignado a:

```text
Administrador
Vendedor
```

---

## 6. Requests

Se implementaron:

```text
backend/app/Http/Requests/Pedidos/StorePedidoRequest.php
backend/app/Http/Requests/Pedidos/UpdatePedidoRequest.php
```

Validan:

- Tipo de cliente.
- Cliente registrado válido.
- Nombre obligatorio para cliente ocasional.
- Fecha y hora de entrega.
- Al menos una línea.
- Presentación existente.
- Cantidad mínima de 1.
- Costo de personalización no negativo.

---

## 7. Controlador

Se implementó:

```text
backend/app/Http/Controllers/Api/Pedidos/PedidoController.php
```

Métodos:

```text
index()
show()
catalogos()
store()
update()
```

### `index()`

Permite listar, buscar y filtrar pedidos.

### `show()`

Obtiene un pedido completo con cliente, usuario, detalles, producto y presentación.

### `catalogos()`

Devuelve:

```text
clientes
presentaciones
tipos_cliente
```

### `store()`

Registra el pedido dentro de una transacción, obtiene precios desde BD, valida personalización, calcula subtotales y total.

### `update()`

Solo permite editar pedidos `PROGRAMADO`. Reemplaza detalles y vuelve a congelar precios vigentes.

---

## 8. Rutas API

```text
GET    /api/pedidos
POST   /api/pedidos
GET    /api/pedidos/catalogos
GET    /api/pedidos/{id}
PUT    /api/pedidos/{id}
```

Protección:

```text
auth:sanctum
permiso:pedidos.gestionar_pedido
```

---

## 9. Pruebas backend realizadas

### 9.1 Pedido con cliente registrado

Pedido #1:

```text
Cliente: María Elena Gonzales Rojas
Estado: PROGRAMADO
```

Cálculo inicial:

```text
Presentación #2
Bs 200 × 2 + Bs 30 = Bs 430

Presentación #1
Bs 150 × 1 = Bs 150

TOTAL = Bs 580
```

### 9.2 Personalización no permitida

Se intentó personalizar una presentación con `permite_personalizacion = false`.

Laravel rechazó la solicitud y la transacción no dejó un pedido incompleto.

### 9.3 Pedido con cliente ocasional

Pedido #3:

```text
Cliente ocasional: Carlos Mendoza
Presentación #3
Precio congelado: Bs 230
Cantidad: 2
Total: Bs 460
Estado: PROGRAMADO
```

### 9.4 Edición del Pedido #1

Resultado final:

```text
Fecha entrega: 13/09/2026
Hora: 16:00
Presentación #2
Cantidad: 3
Precio congelado: Bs 200
Costo personalización: Bs 40
Subtotal/Total: Bs 640
Estado: PROGRAMADO
```

---

## 10. Frontend CU14

Se crearon:

```text
frontend/src/services/pedidoService.js
frontend/src/pages/pedidos/PedidosPage.jsx
frontend/src/pages/pedidos/PedidoModal.jsx
frontend/src/pages/pedidos/PedidoDetalleModal.jsx
```

### `pedidoService.js`

Funciones:

```text
listarPedidos()
obtenerPedido()
obtenerCatalogosPedido()
crearPedido()
actualizarPedido()
```

### `PedidoModal.jsx`

Permite crear y editar pedidos, cliente registrado/ocasional, varias líneas, personalización, fecha/hora, observaciones y total estimado.

### `PedidoDetalleModal.jsx`

Muestra cliente, estado, usuario, fecha/hora, productos, precio congelado, personalización, subtotales y total.

### `PedidosPage.jsx`

Incluye listado, búsqueda, filtros, nuevo pedido, ver detalle y editar pedidos `PROGRAMADO`.

---

## 11. Integración de CU7 requerida por CU14

Se extendió la configuración producto-presentación para manejar:

```text
precio
permite_personalizacion
```

Archivos modificados:

```text
frontend/src/pages/productos/PresentacionesModal.jsx
frontend/src/services/presentacionService.js

backend/app/Http/Controllers/Api/Productos/ProductoController.php
backend/app/Models/Producto.php
backend/app/Models/Presentacion.php

backend/app/Http/Requests/Productos/AsignarPresentacionProductoRequest.php
backend/app/Http/Requests/Productos/UpdateProductoPresentacionRequest.php
```

---

## 12. Pendientes antes del cierre total

El backend principal está validado y los archivos principales del frontend están creados.

Pendientes:

```text
Ruta React /pedidos
Sidebar
Permiso pedidos.gestionar_pedido en menú
Prueba funcional completa desde navegador
Integración Pago ↔ Pedido
```

La integración Pago ↔ Pedido debe resolverse antes de validar la entrega en CU15, porque la entrega exige saldo cero.

---

## 13. Estado actual

```text
Base de datos                         ✅
Migraciones                          ✅
Modelos                              ✅
Relaciones                           ✅
Permiso                              ✅
Requests                             ✅
PedidoController                     ✅
Rutas API                            ✅
Cliente registrado                   ✅
Cliente ocasional                    ✅
Precio congelado                     ✅
Personalización                      ✅
Cálculo backend                      ✅
Transacciones                        ✅
Edición PROGRAMADO                   ✅
Pruebas backend                      ✅
Servicio React                       ✅
PedidoModal                          ✅
PedidoDetalleModal                   ✅
PedidosPage                          ✅

Ruta React /pedidos                  ⏳
Sidebar                              ⏳
Prueba final frontend                ⏳
Integración Pago ↔ Pedido            ⏳
```

---

## 14. Próximo paso

```text
1. Registrar /pedidos en el router.
2. Agregar Pedidos al Sidebar.
3. Ejecutar npm run build.
4. Probar listado.
5. Registrar un pedido desde React.
6. Consultar detalle.
7. Editar pedido PROGRAMADO.
8. Verificar PostgreSQL.
```

Después continuar con:

```text
CU15 — Gestionar Estado y Entrega de Pedido
```
