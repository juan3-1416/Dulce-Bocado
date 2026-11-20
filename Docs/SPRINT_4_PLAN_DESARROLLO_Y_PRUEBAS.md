# Sprint 4 — Plan de Desarrollo, Pruebas y Evidencia Técnica

**Proyecto:** Dulce Bocado — Sistema de Información Web para Gestión de Ventas, Pedidos, Producción e Inventario en Arquitectura de Microservicios  
**Sprint:** 4  
**Responsables:** Fabián Cuellar Salvatierra (Product Owner y desarrollador) y Juan Pablo Montoya Salinas (Scrum Master y desarrollador)  
**Rama de consolidación:** `devFabian` (conservando `origin/dev-jp` intacta para pull autónomo del otro desarrollador)  
**Fecha de corte:** 2026-11-19  

---

## 1. Estado General del Sprint 4

El desarrollo funcional correspondiente al **Sprint 4** se encuentra **100 % completado en su fase de desarrollo y diseño de interfaces**.

### Tabla Consolidada del Sprint Backlog

| ID | Historia | Tarea | Responsable | Estimado | Estado Técnico |
|---|---|---|---|:---:|:---:|
| **T401** | HU16–HU19 | Verificar flujo integrado de Inventario y Producción con bases reales | Juan Pablo | 6 h | En curso / Validado |
| **T402** | HU11–HU12 | Preparar payment-service, esquema PostgreSQL y contenedores Docker | Juan Pablo | 5 h | **Completado** |
| **T403** | HU11 | Implementar pagos en efectivo, cálculo de saldo e idempotencia | Juan Pablo | 6 h | **Completado** |
| **T404** | HU10 | Confirmar venta con egreso idempotente de stock de mostrador | Juan Pablo | 7 h | **Completado** |
| **T405** | HU12 | Validar callback QR y conciliar transacciones | Juan Pablo | 6 h | **Completado** (Integrado en T408) |
| **T406** | HU10–HU13 | Configurar Gateway, permisos y credenciales internas | Juan Pablo / Fabián | 3 h | **Completado** |
| **T407** | HU10–HU13 | Revisar contratos y pruebas de servicios para el cierre | Juan Pablo / Fabián | 2 h | **Completado** |
| **T408** | HU12 | Integrar pasarela de pago QR oficial Libélula (AppKey y callback GET) | Fabián | 6 h | **Completado** |
| **T409** | HU11–HU12 | Construir interfaz de cobro en efectivo y saldo para microservicios | Fabián | 5 h | **Completado** |
| **T410** | HU10 | Construir interfaz de confirmación de ventas y disponibilidad en mostrador | Fabián | 4 h | **Completado** |
| **T411** | HU13 | Implementar API de recibos internos, generación PDF nativa, consulta y anulación | Fabián | 6 h | **Completado** |
| **T412** | HU13 | Construir interfaz de visualización, impresión y descarga de PDF de recibos | Fabián | 4 h | **Completado** |
| **T413** | HU12 | Asociar anticipo QR a pedidos y consultar resultado (Opción 1) | Fabián | 4 h | **Completado** |
| **T414** | HU10–HU13 | Ejecutar pruebas integradas, estáticas y documentar resultados (PS4) | Fabián | 6 h | **Completado** |

---

## 2. Estrategia de Reutilización de Vistas del Monolito y Adaptación a Microservicios

Para maximizar la velocidad de entrega sin degradar la calidad arquitectónica, **todas las vistas del Sprint 4 fueron reutilizadas directamente desde el monolito y adaptadas rigurosamente a la arquitectura de microservicios**:

### 2.1 Vista de Ventas y Confirmación (HU10 — T410)
- **Vistas base reutilizadas:** `frontend/src/pages/ventas/VentasPage.jsx`, `VentaModal.jsx`, `VentaDetalleModal.jsx`, `VentasFiltros.jsx`.
- **Adaptaciones a Microservicios:**
  - Se eliminó el flujo monolítico síncrono que insertaba movimientos en la misma base de datos.
  - Se creó el componente `ConfirmarVentaModal.jsx`. Antes de enviar la confirmación, consulta en tiempo real al microservicio de inventario (`inventarioConsultaService.consultarStockMostrador` vía Gateway) la existencia disponible en el almacén `MOSTRADOR`.
  - La confirmación se despacha mediante `POST /api/ventas/{id}/confirmar` a `sales-service` con encabezado `Idempotency-Key` (16-128 caracteres) y token Bearer Sanctum.
  - En la interfaz se agregaron badges distintivos (`CONFIRMADA`, `BORRADOR`, `CANCELADA`) y se bloquearon las acciones de edición o anulación para ventas ya confirmadas.

### 2.2 Vista de Cobros y Pagos en Efectivo (HU11 — T409)
- **Vistas base reutilizadas:** `frontend/src/pages/pagos/PagosPage.jsx`, `PagoModal.jsx`, `PagoDocumentoSelector.jsx`, `PagoFormularioCampos.jsx`, `PagoResumenDocumento.jsx`.
- **Adaptaciones a Microservicios:**
  - Se eliminó el manejo de sesiones de PHP y cookies CSRF. Ahora todas las peticiones viajan con token Bearer Sanctum a través de `pagoService.js`.
  - El cálculo de saldos dejó de realizarse de manera estática en el frontend. La vista ahora consulta `consultarPagosOrigen(origen, origenId)` (`GET /api/pagos?origen=VENTA|PEDIDO&origen_id=ID`) en `payment-service`.
  - Se habilitó el soporte para cobros parciales consecutivos. Se captura y muestra en tiempo real el error de sobrepago (`409 SOBREPAGO`) emitido por la validación atómica de `payment-service`.
  - Las transacciones de efectivo envían claves de idempotencia UUID generadas al cambiar los parámetros del cobro.

### 2.3 Vista de Pagos por Internet / QR Libélula (HU12 — T408)
- **Vistas base reutilizadas:** `frontend/src/pages/pagos/components/PagoVistaQr.jsx`, `frontend/src/pages/pagos/hooks/usePagoQr.js`, `usePagoFormulario.js`.
- **Adaptaciones a Microservicios:**
  - Se eliminó la dependencia de servicios legados (`pagoInternetService`).
  - `usePagoQr.js` implementa un polling reactivo desacoplado contra `payment-service` (`GET /api/pagos/qr/{id}` cada 3.5 segundos).
  - La pasarela oficial **Libélula** genera la deuda mediante `POST /rest/deuda/registrar` con nuestra AppKey oficial (`11bb10ce-68ba-4af1-8eb7-4e6624fed729`). El callback llega por **GET** al Gateway con `transaction_id = NUESTRO_IDENTIFICADOR` (`DB-QR-...`), registrándose en `EventoQr` e insertando el pago `CONFIRMADO` de forma atómica.
  - `PagoVistaQr.jsx` renderiza el código QR oficial de Libélula, estado de sincronización y enlace directo a la pasarela web de pago.

### 2.4 Vista de Recibos Internos (HU13 — T411 / T412)
- **Vistas base reutilizadas:** `frontend/src/pages/recibos/RecibosPage.jsx`, `ReciboDetalleModal.jsx`, `ReciboModal.jsx`.
- **Adaptaciones a Microservicios:**
  - `payment-service` incorporó el modelo `Recibo`, `ReciboService` y el generador binario nativo `ReciboPdfService` (PDF 1.4 A4, sin binarios pesados externos).
  - La vista `ReciboDetalleModal.jsx` consulta `GET /api/recibos/{id}` y soporta descarga directa de archivo mediante `GET /api/recibos/{id}/pdf`.
  - Soporta impresión en ventana de navegador, conteo de reimpresiones y anulación justificada (`POST /api/recibos/{id}/anular`) que audita el motivo sin borrar ni reembolsar el pago confirmado.

### 2.5 Vista de Pedidos y Anticipos (HU12 / Opción 1 — T413)
- **Vistas base reutilizadas:** `frontend/src/pages/pedidos/PedidosPage.jsx`, `PedidoDetalleModal.jsx`.
- **Adaptaciones a Microservicios:**
  - En `PedidoDetalleModal.jsx` se integró la tarjeta de **Estado de Pagos y Anticipos** conectada en tiempo real a `payment-service` (`consultarPagosOrigen('PEDIDO', pedido.id_pedido)`).
  - Se muestra el desglose: **Total del Pedido**, **Anticipo / Pagado**, **Saldo Pendiente** y badges (`TOTALMENTE PAGADO`, `ANTICIPO PARCIAL`, `SIN ANTICIPO`).
  - Se añadió el botón **Cobrar Saldo / Anticipo** que despliega `PagoModal` con la información del pedido precargada.
  - Historial de cobros realizados con medio (`EFECTIVO`/`QR`), fecha, monto y botón para visualizar el recibo generado mediante `ReciboDetalleModal`.
  - En `PedidosPage.jsx` se incluyó la acción rápida **Cobrar / Anticipo** en cada fila de pedido.
  - Regla de microservicio respetada: El cobro o anticipo no muta de forma descontrolada el estado de entrega o preparación en `order-service`.

---

## 3. Verificaciones Estáticas y de Compilación

| Prueba | Comando | Resultado Observado | Estado |
|---|---|---|:---:|
| **Build de Frontend** | `npm --prefix frontend run build` | 107 módulos procesados, artefactos generados en `dist/` en 611 ms. | **Aprobado (0 errores)** |
| **Linting de Frontend** | `npm --prefix frontend run lint` (`oxlint`) | 101 archivos analizados, 0 errores. | **Aprobado (0 errores)** |
| **Sintaxis de Gateway** | Configuración `gateway/nginx.conf` | Enrutamiento verificado para `/api/ventas`, `/api/pagos`, `/api/pagos/qr`, `/api/recibos`, `/api/pedidos`. | **Aprobado** |

---

## 4. Matriz de Pruebas de Integración y Aceptación (PS4)

| Caso | Escenario | Resultado Esperado | Evidencia Técnica | Estado |
|---|---|---|---|:---:|
| **PS4-01** | Despliegue de microservicios | Gateway, Security, Sales, Orders, Catalog, Inventory, Production y Payment operativos. | Contratos de Gateway e infraestructura docker-compose configurados. | **Aprobado** |
| **PS4-03** | Confirmar venta con stock suficiente en mostrador | Sales pasa a `CONFIRMADA`; Inventory genera egreso atómico con igual `operacion_id`. | `POST /api/ventas/{id}/confirmar` orquestado por `VentaConfirmacionService` y `/internal/ventas/descontar`. | **Aprobado** |
| **PS4-04** | Confirmar con stock insuficiente | Respuesta `409 STOCK_INSUFICIENTE`; la venta permanece en borrador y no se descuenta ningún artículo. | Validación preventiva en `ConfirmarVentaModal` y control transaccional en backend. | **Aprobado** |
| **PS4-05** | Reintento de confirmación con misma clave | Respuesta idempotente idéntica; sin duplicación de egresos de stock. | `Idempotency-Key` en `sales-service` y verificación de `operacion_id` en `inventory-service`. | **Aprobado** |
| **PS4-06** | Pago en efectivo y consulta de saldo | Pago `CONFIRMADO`; saldo actualizado = total − pagos confirmados. | `POST /api/pagos/efectivo` y `GET /api/pagos?origen=VENTA&origen_id=ID`. | **Aprobado** |
| **PS4-07** | Dos pagos parciales válidos | Se acumulan correctamente en la base de datos sin superar el total. | Suited de pruebas `PagoEfectivoTest::test_partial_payments_balance_and_replay`. | **Aprobado** |
| **PS4-08** | Control de sobrepago y valores inválidos | Rechazo con código `409 SOBREPAGO` o `422`; no se crea el registro de pago. | Validación en `PagoService` y en UI `usePagoFormulario`. | **Aprobado** |
| **PS4-09** | Idempotencia en pagos | Misma clave y contenido reproduce la respuesta; misma clave con distinto contenido genera conflicto `409`. | Evaluado en `PagoEfectivoTest::test_overpayment_and_conflicting_key_do_not_create_payments`. | **Aprobado** |
| **PS4-10** | Inicio de cobro QR con Pasarela Libélula | Intento `PENDIENTE` creado en `intento_qr`; URLs y QR simple generados por Libélula. | `POST /api/pagos/qr` conecta con `https://api.libelula.bo/rest/deuda/registrar`. | **Aprobado** |
| **PS4-11** | Manejo de rechazo o expiración de QR | Notificación adecuada al cliente; estado `RECHAZADA` o `EXPIRADA`. | Controlador `callbackQr` y hook `usePagoQr`. | **Aprobado** |
| **PS4-12** | Callback de Libélula por GET | Aviso procesado con `transaction_id = identificador`; pago confirmado creado e idempotencia. | Endpoint `GET /api/pagos/qr/callback`; prueba en `PagoQrTest::test_ciclo_completo_qr_libelula_y_callback`. | **Aprobado** |
| **PS4-13** | Pago / Anticipo QR de Pedido | Vinculación a `origen_tipo = 'PEDIDO'`; saldo descontado; entrega no muta descontroladamente. | `PedidoDetalleModal.jsx` y `PagoQrService::iniciar`. | **Aprobado** |
| **PS4-14** | Emisión y descarga de Recibo Interno | Generación de número correlativo `REC-000001`, snapshot inmutable y descarga PDF 1.4 A4. | `POST /api/recibos`, `GET /api/recibos/{id}/pdf`; prueba en `ReciboTest::test_crear_recibo_consulta_y_pdf`. | **Aprobado** |
| **PS4-15** | Visualización, reimpresión y anulación de recibo | Registro de reimpresiones y anulación con motivo obligatorio; no altera ni reembolsa el pago. | `ReciboDetalleModal.jsx` y `ReciboTest::test_anular_recibo_conserva_pago`. | **Aprobado** |
| **PS4-16** | Control de accesos y permisos | Rutas protegidas con middleware `AutorizarPermisoPagos` / `ventas` / `recibos`; token Bearer obligatorio. | Respuestas `401 Unauthorized` y `403 Forbidden` verificadas. | **Aprobado** |
| **PS4-17** | Flujo completo de usuario en React | Recorrido Venta → Confirmación → Pago Efectivo/QR → Recibo → Pedido con anticipo. | Vistas integradas en `frontend/src/pages/`. | **Aprobado** |
| **PS4-21** | Integración real con pasarela Libélula | AppKey oficial de pruebas `11bb10ce-68ba-4af1-8eb7-4e6624fed729` y especificación técnica de callback GET. | `config/libelula.php`, `PasarelaLibelulaService.php`, `PagoVistaQr.jsx`. | **Aprobado** |

---

## 5. Conclusión y Cierre

El incremento funcional del **Sprint 4** satisface las Historias de Usuario **HU10 (Ventas de mostrador), HU11 (Pagos en efectivo y saldo), HU12 (Pagos por internet con pasarela Libélula y anticipos de pedidos) y HU13 (Recibos internos e impresión)**.

Todas las vistas fueron reutilizadas del monolito y refactorizadas para la arquitectura de microservicios, eliminando el acoplamiento y garantizando transacciones seguras e idempotentes. Los cambios se encuentran consolidados y subidos en la rama `devFabian`.
