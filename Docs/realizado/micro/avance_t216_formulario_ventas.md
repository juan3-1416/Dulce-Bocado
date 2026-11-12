# T216 — Migración del formulario de Ventas

**Fecha:** 12-11-2026

**Rama:** `devFabian`

**Estado:** preparación de interfaz; integración funcional pendiente de T204–T205.

## Base reutilizada

Se adaptó `frontend/src/pages/ventas/VentaModal.jsx`, la vista del monolito. Se conservaron la selección de cliente, las filas de productos/presentaciones, las cantidades, las observaciones y el cálculo visual estimado. Se retiraron del envío los campos del contrato legado: `id_producto_presentacion`, precio enviado por el navegador, costo/detalle de personalización y operaciones de cobro. `sales-service` calcula precios, snapshots y total.

## Contratos usados

- Customer: `GET /api/clientes?estado=1` por Gateway con Bearer. Se usa para escoger un cliente registrado activo; también se admite un cliente ocasional.
- Catalog: se espera `GET /api/presentaciones` por Gateway con Bearer y respuesta `{ "presentaciones": [...] }`. Cada elemento debe incluir `presentacion_id` entero, `nombre`, `precio` no negativo, `moneda: "BOB"`, `disponible` y `permite_personalizacion` booleanos. La lista se habilita solo si cumple el contrato y tiene presentaciones disponibles. Este contrato de listado debe confirmarlo el responsable de T204–T205.
- Sales: `POST /api/ventas` y `PUT /api/ventas/{id}` con `{ id_cliente, nombre_cliente_ocasional, observaciones, items: [{ presentacion_id, cantidad }] }` e `Idempotency-Key` generado por el servicio React. `GET /api/ventas/{id}` carga una venta para editar solo en estado `BORRADOR`.

## Comportamiento y límite

El botón de nueva venta y la edición permanecen deshabilitados mientras no exista un listado compatible de Catalog. La pantalla de lectura y anulación continúa usando Sales. Los permisos de acciones usan `ventas.crear`, `ventas.modificar` y `ventas.anular`. No se usan cookies ni CSRF en el flujo nuevo.

La comprobación de sintaxis del nuevo cliente de Catálogo y `git diff --check` aprobaron. `npm run build` no pudo ejecutarse porque la instalación local de `vite` no se completó. Tampoco se ejecutó React → Gateway → Catalog → Sales: `catalog-service` aún no está en el repositorio y su contrato de listado no está confirmado. Mantener T216 **EN CURSO** hasta compilar, verificar alta/edición con Catalog real y ejecutar las pruebas de integración y permisos.
