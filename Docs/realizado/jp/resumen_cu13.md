# Resumen Oficial — CU13: Gestionar Recibo

**Estado:** ✅ COMPLETADO FUNCIONALMENTE

Este documento resume la implementación realizada para el Caso de Uso 13 — Gestionar Recibo dentro del sistema de información web de Dulce Bocado.

El CU13 permite generar, consultar, visualizar, imprimir, reimprimir y anular recibos internos asociados a pagos registrados.

El recibo funciona como comprobante interno de dinero efectivamente recibido por Dulce Bocado y no como factura fiscal.

Debido a que una venta puede tener pagos parciales o múltiples, cada recibo se asocia directamente a un pago.

---

## 1. Objetivo del CU13

El objetivo principal del CU13 es proporcionar un comprobante interno por cada pago recibido.

El flujo general es:

`Venta`

→ puede tener uno o varios pagos

→ cada pago puede generar un recibo

Ejemplo:

Venta total:

`Bs 600.00`

Pagos:

- Pago #1 → Bs 200.00
- Pago #2 → Bs 100.00
- Pago #3 → Bs 300.00

Recibos:

- Pago #1 → REC-000001
- Pago #2 → REC-000002
- Pago #3 → REC-000003

Esto permite conservar trazabilidad individual sobre cada ingreso de dinero.

---

## 2. Decisión de Diseño — Recibo asociado a Pago

Se decidió que el recibo no se relacione directamente con la venta, sino con un pago.

La relación conceptual es:

`Venta 1 : N Pago`

y:

`Pago 1 : N Recibo`

La razón principal es que CU11 permite pagos parciales y múltiples.

Si una venta de Bs 600 recibe inicialmente Bs 200, el recibo debe demostrar únicamente los Bs 200 efectivamente recibidos.

Por lo tanto:

`Recibo = constancia de un pago recibido`

y no:

`Recibo = representación completa de la venta`

---

## 3. Tipo de Documento

CU13 implementa un:

`Recibo interno de pago`

No corresponde a:

- Factura electrónica.
- Nota fiscal.
- Documento tributario.
- Integración con Impuestos Nacionales.
- Facturación electrónica fiscal.

El recibo incluye una aclaración indicando que:

`Este recibo no constituye una factura fiscal.`

---

## 4. Base de Datos

Se creó la tabla:

`recibo`

### Campos principales

- `id_recibo`
- `id_pago`
- `id_usuario_emision`
- `nombre_cliente`
- `ci_nit_cliente`
- `monto`
- `metodo_pago`
- `referencia_pago`
- `fecha_pago`
- `estado`
- `fecha_emision`
- `id_usuario_anulacion`
- `motivo_anulacion`
- `fecha_anulacion`
- `cantidad_impresiones`
- `id_usuario_ultima_impresion`
- `fecha_ultima_impresion`
- `fecha_creacion`
- `fecha_actualizacion`

---

## 5. Relación con Pago

Cada recibo se relaciona mediante:

`id_pago`

con:

`pago.id_pago`

La relación se configuró con:

`ON DELETE RESTRICT`

para evitar eliminar pagos que forman parte del historial documental del sistema.

Conceptualmente:

`Pago 1 : N Recibo`

Esto permite conservar recibos anteriores anulados y generar posteriormente uno nuevo.

---

## 6. Un solo recibo activo por pago

Se implementó un índice único parcial:

`uq_recibo_pago_emitido`

Este índice garantiza que un mismo pago solamente pueda tener un recibo con estado:

`EMITIDO`

al mismo tiempo.

Ejemplo permitido:

`Pago #1`

- Recibo #1 → ANULADO
- Recibo #2 → EMITIDO

Ejemplo no permitido:

`Pago #1`

- Recibo #1 → EMITIDO
- Recibo #2 → EMITIDO

Esto conserva el historial sin permitir duplicidad activa.

---

## 7. Numeración visual del recibo

No se creó una columna adicional para almacenar un número de recibo independiente.

Se utiliza:

`id_recibo`

como identificador único.

Visualmente se transforma al formato:

`REC-000001`

Ejemplos:

`id_recibo = 1`

→ `REC-000001`

`id_recibo = 27`

→ `REC-000027`

Esto evita almacenar datos redundantes.

---

## 8. Snapshot de Datos

Al generar un recibo se realiza una copia histórica de información importante del pago y del cliente.

Se guardan directamente en `recibo`:

- Nombre del cliente.
- CI/NIT.
- Monto recibido.
- Método de pago.
- Referencia.
- Fecha del pago.

Esto permite que el recibo histórico conserve la información original incluso si posteriormente se modifica el cliente.

Ejemplo:

Si el cliente cambia posteriormente su nombre o CI/NIT, el recibo previamente generado mantiene los datos que existían al momento de su emisión.

---

## 9. Cliente registrado y cliente ocasional

El sistema soporta ambos tipos de cliente.

### Cliente registrado

El nombre se obtiene mediante:

`cliente.nombre + cliente.apellido`

y también se almacena:

`cliente.ci_nit`

### Cliente ocasional

Se utiliza:

`venta.nombre_cliente_ocasional`

Si no existe información suficiente, el sistema utiliza:

`Cliente ocasional`

como valor de respaldo.

---

## 10. Métodos de Pago soportados

El recibo permite los mismos métodos financieros utilizados por CU11 y CU12:

- `EFECTIVO`
- `QR`
- `ONLINE`

La base de datos restringe el campo `metodo_pago` a estos valores.

Esto permite generar recibos tanto para pagos manuales como para pagos aprobados mediante CU12.

---

## 11. Estados del Recibo

El recibo puede tener dos estados:

- `EMITIDO`
- `ANULADO`

El flujo permitido es:

`EMITIDO → ANULADO`

No existe reactivación directa.

Si un recibo fue anulado y se necesita emitir nuevamente, se crea un nuevo recibo.

---

## 12. Restricciones de Base de Datos

Se implementaron varias restricciones para garantizar la integridad de la información.

### Monto

`monto > 0`

No pueden existir recibos con monto cero o negativo.

### Método de pago

Solo se permiten:

- EFECTIVO
- QR
- ONLINE

### Estado

Solo se permiten:

- EMITIDO
- ANULADO

---

## 13. Auditoría de Anulación

Se creó la restricción:

`chk_recibo_auditoria_anulacion`

Cuando el recibo está:

`EMITIDO`

debe cumplir:

- `id_usuario_anulacion = NULL`
- `motivo_anulacion = NULL`
- `fecha_anulacion = NULL`

Cuando el recibo está:

`ANULADO`

debe existir obligatoriamente:

- Usuario que anuló.
- Motivo de anulación.
- Fecha de anulación.

Esto garantiza trazabilidad completa.

---

## 14. Control de Impresiones

Se implementaron:

- `cantidad_impresiones`
- `id_usuario_ultima_impresion`
- `fecha_ultima_impresion`

Inicialmente:

`cantidad_impresiones = 0`

Primera impresión:

`cantidad_impresiones = 1`

Primera reimpresión:

`cantidad_impresiones = 2`

Segunda reimpresión:

`cantidad_impresiones = 3`

Esto permite conocer cuántas veces fue impreso el documento.

---

## 15. Restricción de Auditoría de Impresión

Se creó:

`chk_recibo_impresion`

Cuando:

`cantidad_impresiones = 0`

deben ser NULL:

- Usuario de última impresión.
- Fecha de última impresión.

Cuando:

`cantidad_impresiones > 0`

deben existir obligatoriamente:

- Usuario de última impresión.
- Fecha de última impresión.

---

## 16. Modelo Eloquent

Se creó:

`backend/app/Models/Recibo.php`

El modelo está configurado con:

- `$table = 'recibo'`
- `$primaryKey = 'id_recibo'`
- `$fillable`
- `$casts`
- timestamps personalizados.

Se utilizan:

`fecha_creacion`

y:

`fecha_actualizacion`

como timestamps del modelo.

---

## 17. Relaciones del Modelo Recibo

Se implementaron:

### `pago()`

Relaciona el recibo con el pago correspondiente.

### `usuarioEmision()`

Relaciona el recibo con el usuario que lo generó.

### `usuarioAnulacion()`

Relaciona el recibo con el usuario que realizó la anulación.

### `usuarioUltimaImpresion()`

Relaciona el recibo con el último usuario que ordenó su impresión.

---

## 18. Relación agregada en Pago

En:

`backend/app/Models/Pago.php`

se agregó:

`recibos()`

como relación:

`hasMany`

Esto permite consultar todos los recibos históricos asociados a un pago.

Ejemplo:

`Pago #1`

- Recibo #1 ANULADO.
- Recibo #2 EMITIDO.

---

## 19. Seguridad y Permisos

Se creó el permiso:

`recibos.gestionar_recibo`

Descripción:

`Permite generar, consultar, imprimir, reimprimir y anular recibos.`

El permiso fue asignado a:

- Administrador.
- Vendedor.

También se propagó a los usuarios que ya poseían dichos roles.

---

## 20. Protección de Endpoints

Todas las rutas del CU13 utilizan:

`auth:sanctum`

y:

`permiso:recibos.gestionar_recibo`

Por lo tanto, solo usuarios autenticados y autorizados pueden utilizar el módulo.

---

## 21. Seeder

Se creó:

`database/seeders/RecibosInicialSeeder.php`

El Seeder:

- Crea el permiso si no existe.
- Reactiva el permiso si estaba inactivo.
- Lo asigna a Administrador.
- Lo asigna a Vendedor.
- Propaga la relación a los usuarios correspondientes.

También fue integrado en:

`DatabaseSeeder.php`

---

## 22. Form Requests

Se crearon:

- `StoreReciboRequest`
- `AnularReciboRequest`

No existe:

`UpdateReciboRequest`

porque un recibo emitido no debe modificarse directamente.

La corrección documental se realiza mediante:

`ANULAR → GENERAR NUEVO`

---

## 23. StoreReciboRequest

El frontend únicamente envía:

`id_pago`

Ejemplo:

```json
{
    "id_pago": 1
}