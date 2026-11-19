# T404 — Confirmación de ventas: avance incremental

Fecha: 2026-11-19. Estado: **En curso**. Esta entrega implementa el contrato interno de Inventory; falta conectar Sales y validar el flujo distribuido antes de completar T404.

## Contrato implementado

- `POST /internal/ventas/descontar`: requiere `X-Internal-Service-Key` igual a `INVENTORY_SALES_KEY` y `X-Actor-User-Id` del usuario validado por Sales.
- `GET /internal/ventas/{operacion_id}`: misma autorización; responde `APLICADA` con `venta_id` o 404 si no hay operación aplicada.
- La clave es exclusiva para Sales. La clave existente de Producción no autoriza estas rutas. Gateway ya bloquea `/internal/`.

```json
{
  "operacion_id": "11111111-1111-4111-8111-111111111111",
  "venta_id": 1,
  "items": [
    {"presentacion_id": 1, "cantidad": 2},
    {"presentacion_id": 2, "cantidad": 3}
  ]
}
```

Se aceptan entre 1 y 100 presentaciones distintas y cantidades enteras positivas. Inventory bloquea el almacén MOSTRADOR y sus existencias, valida todos los artículos y registra descuentos/movimientos/operación en una transacción. La operación guarda una huella del actor, venta y artículos ordenados. Repetirla devuelve el mismo resultado; cambiar su contenido produce 409. Una restricción única por venta evita descontarla de nuevo con otro UUID.

Stock insuficiente produce `409 STOCK_INSUFICIENTE` sin movimientos parciales ni operación aplicada. Se puede reintentar después de reponer stock. La consulta 404 significa ausencia de una operación aplicada visible; Sales debe reintentar con el mismo ID, nunca asumir que puede emitir otro descuento por una respuesta perdida.

## Configuración y migración

Definir `INVENTORY_SALES_KEY` en el entorno de Inventory y compartirla únicamente con Sales. No reutilizar la clave de Producción. Aplicar la nueva migración incremental `2026_11_19_000002_create_venta_operacion_table.php` antes de habilitar llamadas. No ejecutar `migrate:fresh` sobre desarrollo.

No se modificaron bases de desarrollo ni se provisionaron secretos en esta intervención. Los cambios permanecen sin commit.

## Pruebas y límites

Se agregaron cinco casos en `tests/Feature/VentaInventarioInternoTest.php`: descuento/repetición/consulta, insuficiencia sin descuento parcial, conflictos de operación/venta, clave de Producción no autorizada y validación de artículos/cantidades.

La suite de Inventory ejecutó 56 casos y 275 aserciones sin fallos de aserción; Artisan mostró 56 avisos. La suite fuerza SQLite en memoria antes de inicializar la aplicación. Esta ejecución acredita reglas y regresiones aisladas; no acredita bloqueo concurrente real en PostgreSQL ni integración con Sales.

La ejecución directa posterior con `vendor/bin/phpunit --display-warnings --display-notices tests/Feature/VentaInventarioInternoTest.php` terminó correctamente: **5 pruebas, 29 aserciones**, sin avisos reportados por PHPUnit. La salida incluye caracteres BOM provenientes del código existente; no se atribuye todavía una causa definitiva a los avisos del envoltorio Artisan.

## Trabajo pendiente para cerrar T404

1. Persistir en Sales un intento de confirmación con UUID estable, snapshot de detalles y actor, antes de solicitar Inventory.
2. Bloquear edición/anulación mientras el resultado sea incierto; conservar precios y total. No mantener una transacción de Sales abierta mientras se espera HTTP.
3. Implementar `POST /api/ventas/{id}/confirmar`, permiso `ventas.confirmar`, validación de clave de idempotencia y conciliación usando el UUID persistido.
4. Confirmar Sales solo al comprobar `APLICADA` y la correspondencia de operación/venta. Tras rechazo por stock, conservar el borrador; definir explícitamente el tratamiento del intento antes de permitir editarlo.
5. Probar en PostgreSQL dos ventas que compiten por el último artículo, confirmaciones simultáneas y respuesta perdida tras el descuento. Verificar un solo conjunto de movimientos y ningún stock negativo.
6. Integrar con Payment/Gateway y actualizar PS4-03/04/05 con evidencia de servicios reales. Solo entonces marcar T404 **Completado**.
