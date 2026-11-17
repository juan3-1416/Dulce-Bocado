# Resumen de Avance — Sprint 3 (Fabián)

**Proyecto:** Dulce Bocado — Sistema Web de Gestión (Microservicios)  
**Rama:** `devFabian`  
**Responsable:** Fabián Cuellar Salvatierra  
**Fecha:** 16 de noviembre de 2026  
**Estado:** 100% de las tareas asignadas a Fabián completadas en desarrollo (35 / 35 horas, 50% global del Sprint 3).

---

## 1. Resumen Ejecutivo

Se completó toda la infraestructura, lógica de negocio y pruebas del microservicio **`production-service`**, así como la adaptación de todas las interfaces de usuario del frontend para **Producción** e **Inventario** bajo la arquitectura de microservicios con Nginx Gateway (`:8080`) y tokens Bearer.

---

## 2. Detalle de Tareas Implementadas por Fabián

### Backend (`microservices/production-service`)

| Tarea | Horas | Descripción |
|---|:---:|---|
| **T302** | 5h | **Infraestructura de Producción:** Microservicio Laravel 11/12 independiente, base de datos PostgreSQL `dulce_production` con migraciones y constraints (`cantidad > 0`, estados válidos, referencias positivas). Modelos `Produccion` y `ProduccionIdempotencia`. |
| **T308** | 5h | **Integración REST con Catálogo:** Adaptador `CatalogoRecetaService` que consulta `GET /api/presentaciones/{id}/receta` en `catalog-service` con `X-Internal-Service-Key`. Valida vigencia, disponibilidad de producto/presentación e insumos activos. Cálculos con precisión decimal **BCMath** a 3 decimales (sin floats). |
| **T310** | 7h | **Registro y Coordinación de Producción:** Controlador `ProduccionController` y servicio `ProduccionService`. Manejo estricto de `Idempotency-Key` (16–128 caracteres) con huella SHA-256. Guarda orden en estado `EN_PROCESO` con snapshot inmutable de receta (`consumo_snapshot`). Realiza la llamada HTTP a Inventory mediante `POST /internal/producciones/aplicar`. |
| **T314** | 4h | **Pruebas y Conciliación:** Suite automatizada de **13 pruebas y 79 aserciones** en SQLite en memoria (100% aprobadas). Comando de consola `php artisan produccion:conciliar` y contenedor `production-scheduler` en Docker Compose que ejecuta `schedule:work` cada minuto para resolver solicitudes con respuesta perdida. |
| **Aporte T313** | — | **Rutas Gateway:** Configuración de `/api/producciones` y `/api/producciones/*` en `gateway/nginx.conf`, preservando `Authorization` e `Idempotency-Key` y bloqueando headers internos del cliente. |

### Frontend (`frontend/src/`)

| Tarea | Horas | Descripción |
|---|:---:|---|
| **T311** | 5h | **Interfaz de Producción:** `ProduccionList.jsx` (listado paginado, filtro por estado, modal de detalle de insumos) y `ProduccionForm.jsx` (selector de recetas vivas de Catálogo, validaciones de cantidad, persistencia de reintento en `localStorage` ante cortes de red). Servicio `produccionGatewayService.js`. |
| **T304** | 5h | **Interfaz de Almacenes y Stock:** `AlmacenList.jsx` (tarjetas de almacenes activos) y `ExistenciaList.jsx` (tabla de saldos por almacén con filtros por tipo/artículo y tratamiento de saldo 0 sin filas). Servicio `inventarioConsultaService.js`. |
| **T306** | 4h | **Interfaz de Movimientos:** `MovimientoInventarioPage.jsx` unificada para `INGRESO`, `EGRESO` y `TRASLADO`, con validaciones numéricas estrictas, selección de almacenes compatibles y firmas de idempotencia. |

---

## 3. Estado de Pruebas y Compilación

* **Suite de Pruebas Unitarias de Producción:** 13 pruebas, 79 aserciones, 0 fallos (`php artisan test --compact`).
* **Base de datos de desarrollo (`dulce_production`):** Limpia, sin registros residuales (`produccion=0, idempotencia=0`). Cero seeders basura en el repositorio.
* **Frontend:** `npm run build` compila con 0 errores.
* **Linter Frontend:** `oxlint` sin errores.

---

## 4. Pendientes para el Compañero (Juan Pablo)

Para concluir el Sprint 3 y poder realizar las pruebas integradas de extremo a extremo, resta:

1. **Microservicio `inventory-service` (T301, T303, T305, T307, T309, T312):**
   * Crear el microservicio en `microservices/inventory-service` con base PostgreSQL `dulce_inventory`.
   * Implementar endpoints públicos para consultas y movimientos (`/api/almacenes`, `/api/existencias`, `/api/movimientos`, `/api/ingresos`, `/api/egresos`, `/api/traslados`).
   * Implementar endpoints internos para Producción:
     * `POST /internal/producciones/aplicar` (aplica débitos de insumos y crédito de terminados en una transacción atómica; responde `{ "operacion_id": "...", "estado": "APLICADA" }` o error 409 `STOCK_INSUFICIENTE`).
     * `GET /internal/producciones/{operacion_id}` (permite a `production-service` y al scheduler conciliar operaciones en caso de timeout).
2. **Permisos en `security-service` (T313):**
   * Crear y ejecutar seeder con los permisos de Sprint 3: `produccion.ver`, `produccion.crear`, `inventario.ver`, `inventario.ingresar`, `inventario.egresar`, `inventario.trasladar`.
   * Asignarlos a los roles `Administrador` y `Producción`.
3. **Gateway (T313):**
   * Definir `set $inventory_target inventory-service:8000;` y enrutar las rutas públicas de inventario en `gateway/nginx.conf`.
4. **Fase Final de Pruebas Integradas:**
   * Ejecutar el checklist de pruebas conjuntas R-01 a R-08 detallado en el plan del sprint.
