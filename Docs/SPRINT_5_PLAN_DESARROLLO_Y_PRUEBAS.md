# Plan de Desarrollo y Pruebas — Sprint 5: Dashboard y Reportes por Correo

**Fecha:** 22 de Noviembre de 2026  
**Rama de trabajo:** `devFabian`  
**Estado general:** Completado / Listo para Revisión y Despliegue  
**Historias de Usuario cubiertas:**  
- **HU22 / CU24:** Dashboard Administrativo Interactivo con KPIs en Tiempo Real y Gráficos Multidominio.
- **HU23 / CU25:** Reportes Parametrizados de Ventas, Pedidos e Inventario con Exportación a PDF y Envío Múltiple por Correo Electrónico.

---

## 1. Resumen Ejecutivo y Arquitectura

En este Sprint 5 se realizó la migración y desacoplamiento de la inteligencia operativa y analítica del sistema desde el monolito hacia un microservicio dedicado: `report-service`.

### 1.1 Principios Arquitectónicos Implementados
1. **Desacoplamiento Estricto de Base de Datos:** `report-service` **no** realiza consultas directas, JOINs ni comparte modelos Eloquent con las bases de datos de otros servicios (`dulce_sales`, `dulce_order`, `dulce_inventory`, `dulce_production`, `dulce_payment`, `dulce_security`).
2. **Consumo Agregador REST:** Consume las APIs de los microservices mediante HTTP con timeout configurado y propagación del token `Bearer` Sanctum del usuario autenticado.
3. **Degradación Elegante (Fault Tolerance):** Si alguno de los servicios upstream (`sales-service`, `order-service`, `inventory-service`, `production-service`, `payment-service`) no está disponible o responde con timeout, el agregador reporta el estado de dicha fuente como `DEGRADADO` o `NO_DISPONIBLE` y presenta los datos de las fuentes sanas sin lanzar un error 500 global ni mostrar valores falsos en cero silenciosos.
4. **Respaldo Previo a Despacho SMTP:** Todo reporte solicitado para envío por correo genera primero el binario PDF y lo persiste en `storage/app/reportes/` con registro en la tabla `reporte_envio`. Si el servidor SMTP externo falla, el archivo no se pierde y el sistema responde 503 con metadatos del archivo para reintento o descarga manual.
5. **Deduplicación e Idempotencia:** Se normalizan y deduplican las listas de correos destinatarios. El encabezado `X-Idempotency-Key` evita envíos dobles ante reintentos del cliente.
6. **Frontend 100% Token Bearer:** Se eliminó la dependencia heredada de cookies de sesión y tokens CSRF en `reporteService.js`, unificando todo el frontend bajo la cabecera `Authorization: Bearer <token>`.

---

## 2. Matriz de Tareas del Sprint 5

| ID | Tarea | Componente | Descripción y Entregables | Estado |
|---|---|---|---|---|
| **S5-01** | Contrato de API y especificación de permisos | Documentación / API | Definición de endpoints, filtros, esquema JSON y permisos: `dashboard.consultar`, `reportes.generar`, `reportes.enviar`, `reportes.ver`. | **Completado** |
| **S5-02** | Creación del microservicio `report-service` | Backend Microservice | Estructura Laravel 11/12 (`microservices/report-service/`), bootstrap, dockerfile, configuración de base de datos Postgres `dulce_report` y `integrations.php`. | **Completado** |
| **S5-03** | Servicio Agregador de Dashboard (`DashboardAggregatorService`) | Backend Service | Consultas paralelas a ventas, pagos, pedidos, inventario y producción con agregación de métricas, KPIs, tendencias, alertas de stock bajo y ranking top productos. | **Completado** |
| **S5-04** | Generador de Datos y PDF de Reportes (`ReporteDataService` & `ReportePdfService`) | Backend Service | Filtros por rango de fechas, estados, clientes y almacenes. Renderizado de plantilla landscape A4 con Dompdf y guardado en disco. | **Completado** |
| **S5-05** | Servicio de Envío de Correo e Idempotencia (`ReporteMailService`) | Backend Service | Deduplicación de correos, persistencia en `reporte_envio`, adjunto de PDF, manejo de excepciones SMTP y respuesta transaccional. | **Completado** |
| **S5-06** | Enrutamiento en API Gateway (`nginx.conf`) | Gateway / Nginx | Publicación de rutas `/api/dashboard/` y `/api/reportes/` apuntando a `report-service:8000` con protección de headers internos. | **Completado** |
| **S5-07** | Refactorización de Frontend a Bearer y Pruebas | Frontend / React | Actualización de `reporteService.js` eliminando cookies/CSRF y usando `obtenerToken()`. Verificación de `DashboardPage.jsx` y `ReportesPage.jsx`. | **Completado** |

---

## 3. Contratos de API Publicados en Gateway

### 3.1 Dashboard
- **`GET /api/dashboard/resumen`** (y alias `GET /api/dashboard`)
  - **Permiso requerido:** `dashboard.consultar`
  - **Query Params:** `periodo` (`hoy`, `7d`, `mes`, `anio`, `personalizado`), `fecha_inicio` (`YYYY-MM-DD`), `fecha_fin` (`YYYY-MM-DD`).
  - **Estructura de respuesta:**
    ```json
    {
      "periodo": {
        "tipo": "mes",
        "descripcion": "Mes actual: 01/11/2026 al 30/11/2026",
        "inicio": "01/11/2026",
        "fin": "30/11/2026"
      },
      "kpis": {
        "ventas_total": 4520.50,
        "ventas_cantidad": 28,
        "ventas_hoy": 350.00,
        "ganancia_bruta": 1582.18,
        "costo_ventas": 2938.32,
        "margen_bruto": 35.0,
        "cobertura_costos": 100.0,
        "pagos_total": 4120.50,
        "pagos_efectivo": 2500.00,
        "pagos_qr": 1620.50,
        "pedidos_activos": 8,
        "pedidos_en_proceso": 3,
        "pedidos_programados": 5,
        "produccion_activa": 2,
        "produccion_finalizada": 14,
        "alertas_stock": 3
      },
      "graficos": {
        "tendencia_ventas": [
          { "fecha": "2026-11-20", "etiqueta": "20/11", "total": 1250.00 }
        ],
        "estados_pedidos": [
          { "estado": "PROGRAMADO", "cantidad": 5 },
          { "estado": "EN_PROCESO", "cantidad": 3 },
          { "estado": "ENTREGADO", "cantidad": 20 },
          { "estado": "CANCELADO", "cantidad": 1 }
        ],
        "top_productos": [
          {
            "id_producto_presentacion": 4,
            "producto": "Torta Selva Negra",
            "presentacion": "Mediana",
            "unidades": 15,
            "monto": 1800.00
          }
        ],
        "almacenes": [
          {
            "id_almacen": 1,
            "nombre": "Almacén Central",
            "total_items": 45,
            "stock_total": 320.5,
            "stock_critico": 3
          }
        ]
      },
      "tablas": {
        "proximos_pedidos": [
          {
            "id_pedido": 104,
            "cliente": "Carlos Perez",
            "fecha_entrega": "2026-11-23",
            "hora_entrega": "15:00",
            "total": 350.00,
            "saldo": 150.00,
            "estado": "PROGRAMADO"
          }
        ],
        "ultimas_ventas": [
          {
            "id_venta": 210,
            "cliente": "Maria Lopez",
            "fecha_venta": "22/11/2026 14:30",
            "vendedor": "Admin",
            "total": 120.00,
            "estado": "REGISTRADA"
          }
        ],
        "stock_bajo": [
          {
            "id_inventario": 12,
            "nombre": "Harina de Trigo Especial",
            "almacen": "Almacén Central",
            "detalle": "Kg",
            "cantidad": 3.5
          }
        ]
      },
      "fuentes_estado": {
        "sales": "DISPONIBLE",
        "payments": "DISPONIBLE",
        "orders": "DISPONIBLE",
        "inventory": "DISPONIBLE",
        "production": "DISPONIBLE"
      }
    }
    ```

### 3.2 Reportes
- **`GET /api/reportes/ventas`**, **`GET /api/reportes/pedidos`**, **`GET /api/reportes/inventario`**
  - **Permiso requerido:** `reportes.generar`
  - Devuelve el reporte en formato JSON con metadatos de filtros, resumen y arreglo de datos.
- **`GET /api/reportes/{tipo}/pdf`**
  - **Permiso requerido:** `reportes.generar`
  - Descarga directa de archivo binario PDF en hoja horizontal A4.
- **`POST /api/reportes/{tipo}/enviar`**
  - **Permiso requerido:** `reportes.enviar`
  - **Cuerpo JSON:** `{ "correos": ["gerencia@dulcebocado.com", "contabilidad@dulcebocado.com"] }`
  - **Cabecera opcional:** `X-Idempotency-Key: <uuid>`
  - **Respuesta 200 (éxito):**
    ```json
    {
      "message": "Reporte generado y enviado correctamente.",
      "envio": true,
      "tipo": "ventas",
      "correos": ["gerencia@dulcebocado.com", "contabilidad@dulcebocado.com"],
      "archivo": "reporte_ventas_20261122_153000_a1b2c3.pdf",
      "ruta_guardada": "reportes/reporte_ventas_20261122_153000_a1b2c3.pdf",
      "id_envio": 1
    }
    ```
  - **Respuesta 503 (falla SMTP tolerada):**
    ```json
    {
      "message": "El reporte fue generado y guardado, pero no pudo enviarse por correo.",
      "envio": false,
      "tipo": "ventas",
      "correos": ["gerencia@dulcebocado.com"],
      "archivo": "reporte_ventas_20261122_153000_a1b2c3.pdf",
      "ruta_guardada": "reportes/reporte_ventas_20261122_153000_a1b2c3.pdf",
      "error": "Connection could not be established with host mailpit:1025",
      "id_envio": 1
    }
    ```

---

## 4. Guía de Pruebas de Aceptación (Test Suite)

### TP-01: Verificación de Health Check y Rutas en Gateway
- **Objetivo:** Verificar que el Gateway rutea `/api/dashboard` y `/api/reportes` al nuevo microservicio.
- **Comando:**
  ```bash
  curl -i http://localhost/health
  curl -i http://localhost/api/health
  ```
- **Criterio de Aceptación:** Devuelve HTTP 200 con `service: report-service`.

### TP-02: Seguridad y Autenticación de Tokens
- **Objetivo:** Rechazar accesos sin token o sin los permisos correspondientes.
- **Comandos:**
  ```bash
  # Sin token (debe responder 401)
  curl -i -H "Accept: application/json" http://localhost/api/dashboard/resumen

  # Con token inválido (debe responder 401)
  curl -i -H "Accept: application/json" -H "Authorization: Bearer token_falso" http://localhost/api/dashboard/resumen
  ```
- **Criterio de Aceptación:** Código HTTP 401 con mensaje `TOKEN_REQUERIDO` o `SESION_EXPIRADA`.

### TP-03: Consulta Interactiva del Dashboard con Filtros de Período
- **Objetivo:** Consultar métricas en los períodos `hoy`, `7d`, `mes`, `anio` y verificar que no hay errores en el frontend.
- **Pasos:**
  1. Iniciar sesión como usuario Administrador en el frontend (`http://localhost:5173`).
  2. Navegar a `/dashboard`.
  3. Cambiar el selector de períodos a "Hoy", "Últimos 7 Días", "Este Mes" y "Todo el Año".
  4. Observar que las tarjetas de KPIs, gráficos de dona, barras y tablas de operaciones se actualizan reactivamente.

### TP-04: Consulta y Generación de Reportes Parametrizados
- **Objetivo:** Consultar los 3 tipos de reportes (`ventas`, `pedidos`, `inventario`) con filtros aplicados.
- **Pasos:**
  1. Navegar a la página `/reportes`.
  2. Seleccionar la pestaña "Ventas", elegir un rango de fechas y hacer clic en "Consultar".
  3. Verificar que la tabla de resultados coincide con los datos del microservicio de ventas.
  4. Repetir para "Pedidos" e "Inventario".

### TP-05: Descarga de Reporte en Formato PDF
- **Objetivo:** Validar la descarga directa del archivo PDF en orientación horizontal A4.
- **Pasos:**
  1. En `/reportes`, pulsar el botón "Descargar PDF".
  2. Verificar que el navegador descarga un archivo con nombre similar a `reporte_ventas_2026-11-22.pdf`.
  3. Abrir el archivo y verificar que contiene el título "Dulce Bocado", resumen de totales, tabla de filtros aplicados y desglose de ítems.

### TP-06: Envío de Reporte a Múltiples Destinatarios y Deduplicación
- **Objetivo:** Enviar el reporte por correo a múltiples direcciones, comprobando deduplicación y registro de auditoría.
- **Pasos:**
  1. En `/reportes`, en el campo de correos ingresar:
     `admin@dulcebocado.com, auditor@dulcebocado.com, admin@dulcebocado.com` (con duplicado intencional).
  2. Presionar "Enviar por correo".
  3. Verificar que la respuesta informa que se enviaron únicamente 2 correos (deduplicados).
  4. Verificar que se creó una copia del archivo en `storage/app/reportes/`.

---

## 5. Guía de Tareas Restantes para el Desarrollador (Paso a Paso)

Para llevar el Sprint 5 de **85% - 90%** (desarrollo terminado) al **100% de Definition of Done (DoD)**, el desarrollador que reciba los cambios debe realizar:

1. **Sincronización:**
   ```bash
   git pull origin devFabian
   ```
2. **Levantamiento del entorno:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.sprint5.report.yml up -d --build
   ```
3. **Migración en el microservicio `report-service`:**
   ```bash
   docker compose exec report-service php artisan migrate --force
   ```
4. **Sembrado de permisos de reportes en `security-service`:**
   ```bash
   docker compose exec security-service php artisan db:seed --class=ReportesPermisosSeeder --force
   ```
5. **Verificación visual y de descarga (TP-01 a TP-06):**
   * Dashboard interactivo en `http://localhost:5173/dashboard`.
   * Reportes con filtros y descarga de PDF en `http://localhost:5173/reportes`.
   * Envío de correos y verificación en el buzón local de Mailpit `http://localhost:8025`.

---

## 6. Conclusiones y Estado del Incremento

1. **Sprint 5 completado en desarrollo:** Se ha migrado exitosamente el flujo de Dashboard (HU22) y Reportes (HU23) a la arquitectura de microservicios con total desacoplamiento de bases de datos.
2. **Reutilización de vistas:** Se aprovecharon íntegramente los componentes del frontend y las plantillas Blade del monolito, adaptándolas a la nueva infraestructura.
3. **Frontend moderno:** `reporteService.js` opera de manera segura y limpia mediante cabeceras Bearer Sanctum, eliminando cookies y tokens CSRF.
4. **Respaldo en Docker Compose:** El archivo `docker-compose.sprint5.report.yml` define el despliegue del servicio junto a su base de datos Postgres `report-db` y red compartida `dulce_bocado_net`.
5. **Guía ejecutiva:** Consultar también [sprint5.md](sprint5.md) para el resumen rápido de entrega.
