# Sprint 5 — Guía de Desarrollo, Despliegue y Pruebas

**Proyecto:** Dulce Bocado  
**Duración prevista:** 1 semana  
**Equipo:** Fabián Cuellar Salvatierra y Juan Pablo Montoya Salinas  
**Estado:** **Desarrollo 100% completado** en rama `devFabian`. Listo para levantamiento de contenedores y batería de pruebas E2E en caliente.  
**Historias de Usuario cubiertas:**  
* **HU22 / CU24:** Dashboard Administrativo con KPIs en Tiempo Real y Gráficos Multidominio.
* **HU23 / CU25:** Reportes Parametrizados de Ventas, Pedidos e Inventario con Exportación a PDF y Envío Múltiple por Correo.

---

## 1. Resumen de la Solución Arquitectónica

Se implementó el nuevo microservicio `report-service` (`microservices/report-service/`), el cual asume la responsabilidad del Dashboard y Reportes manteniendo el desacoplamiento estricto del sistema:

1. **Sin consultas cruzadas a bases de datos ajenas:** `report-service` utiliza su propia base de datos PostgreSQL (`dulce_report`) para auditoría y registro de envíos (`reporte_envio`).
2. **Consumo Agregador REST (`DashboardAggregatorService`):** Consume mediante HTTP REST las APIs de `sales-service`, `order-service`, `payment-service`, `inventory-service` y `production-service`, propagando el token `Bearer` del usuario autenticado.
3. **Tolerancia a Fallos (Graceful Degradation):** Si un microservicio externo no responde, el agregador marca su fuente como `DEGRADADO` o `NO_DISPONIBLE` y muestra las fuentes activas sin fallar con error 500.
4. **Respaldo Previo a Despacho SMTP:** Todo reporte solicitado para envío por correo genera el binario PDF y lo guarda físicamente en `storage/app/reportes/` **antes** de conectar con el servidor SMTP. Si el servidor de correos falla, el reporte se preserva intacto y devuelve un código HTTP 503 con metadatos del archivo.
5. **Deduplicación e Idempotencia:** Se normalizan y deduplican los destinatarios de correo. Acepta el encabezado `X-Idempotency-Key` para evitar duplicidad de envíos.
6. **Frontend 100% Bearer:** `frontend/src/services/reporteService.js` fue migrado de cookies/CSRF a cabeceras `Authorization: Bearer <token>`.

---

## 2. Tareas Desarrolladas en este Sprint

| Tarea | Componente | Descripción | Estado Técnico |
|---|---|---|---|
| **S5-01** | Contrato de API | Especificación de endpoints y permisos: `dashboard.consultar`, `reportes.generar`, `reportes.enviar`. | Completado |
| **S5-02** | Microservicio `report-service` | Estructura Laravel 11/12, Dockerfile, Postgres `dulce_report` e `integrations.php`. | Completado |
| **S5-03** | Agregador Dashboard | Lógica multiconsulta y cálculo de métricas en `DashboardAggregatorService.php`. | Completado |
| **S5-04** | Reportes y PDF | `ReporteDataService.php` y `ReportePdfService.php` (Blade landscape A4). | Completado |
| **S5-05** | Envío de Correo | `ReporteMailService.php` con deduplicación, guardado previo y soporte idempotente. | Completado |
| **S5-06** | Gateway Nginx | Configuración en `gateway/nginx.conf` ruteando `/api/dashboard` y `/api/reportes`. | Completado |
| **S5-07** | Frontend y Vistas | Adaptación de `reporteService.js`, `DashboardPage.jsx` y `ReportesPage.jsx`. | Completado |

---

## 3. Tareas Restantes para el Desarrollador (Paso a Paso)

Para completar el **Definition of Done (DoD) al 100%**, el desarrollador asignado debe ejecutar los siguientes pasos de verificación en caliente:

### Paso 1: Actualizar la rama local
```bash
git pull origin devFabian
```

### Paso 2: Levantar el ecosistema Docker
Asegurarse de tener Docker Desktop iniciado y ejecutar:
```bash
docker compose -f docker-compose.yml -f docker-compose.sprint5.report.yml up -d --build
```
> Esto levantará `report-db` en el puerto 5432 interno y `report-service` en el puerto 8000, además de Mailpit en el puerto 8025 (web) y 1025 (SMTP).

### Paso 3: Ejecutar migraciones en `report-service`
```bash
docker compose exec report-service php artisan migrate --force
```
> Esto creará la tabla `reporte_envio` en la base de datos `dulce_report`.

### Paso 4: Sembrar los permisos de Reportes en `security-service`
```bash
docker compose exec security-service php artisan db:seed --class=ReportesPermisosSeeder --force
```
> Esto registrará los permisos `reportes.generar`, `reportes.enviar` y `reportes.ver` asignándolos al rol `Administrador` y al usuario `admin`.

### Paso 5: Ejecutar la Batería de Pruebas de Aceptación (TP-01 al TP-06)

#### TP-01: Health Check y Gateway
```bash
curl -i http://localhost/health
curl -i http://localhost/api/health
```
* **Resultado esperado:** HTTP 200 con JSON indicando `service: "report-service"`.

#### TP-02: Validación de Seguridad sin Token
```bash
curl -i -H "Accept: application/json" http://localhost/api/dashboard/resumen
```
* **Resultado esperado:** HTTP 401 con JSON `error.code: "TOKEN_REQUERIDO"`.

#### TP-03: Dashboard Interactivo en Frontend
1. Acceder al frontend en `http://localhost:5173` (o vía Gateway en `http://localhost`).
2. Iniciar sesión como `admin`.
3. Navegar a `/dashboard`.
4. Cambiar el selector de períodos ("Hoy", "Últimos 7 Días", "Este Mes", "Todo el Año").
5. Verificar que se renderizan los KPIs (ventas, pedidos activos, producción, alertas de stock), los gráficos de tendencia y estados, y las tablas de próximas entregas y últimas ventas.

#### TP-04: Consulta de Reportes con Filtros
1. Navegar a `/reportes`.
2. Probar la pestaña **Ventas**: seleccionar un rango de fechas y pulsar "Consultar".
3. Probar la pestaña **Pedidos**: filtrar por estado y pulsar "Consultar".
4. Probar la pestaña **Inventario**: filtrar por almacén y marcar "Stock crítico".
5. Verificar que las tablas muestran los datos agregados correctamente.

#### TP-05: Descarga de Archivo PDF
1. En `/reportes`, pulsar el botón "Descargar PDF".
2. Abrir el archivo PDF descargado y validar:
   * Orientación horizontal (Landscape A4).
   * Encabezado institucional "Dulce Bocado".
   * Resumen y filtros aplicados.
   * Tabla con el listado detallado de registros.

#### TP-06: Envío de Correo y Verificación en Mailpit
1. En `/reportes`, en el campo de correos ingresar varias direcciones con duplicados intencionales:
   ```text
   admin@dulcebocado.com, auditor@dulcebocado.com, admin@dulcebocado.com
   ```
2. Pulsar "Enviar por correo".
3. Verificar mensaje de confirmación de envío.
4. Abrir Mailpit en el navegador: `http://localhost:8025`.
5. Verificar que llegó el correo con el asunto `Dulce Bocado - Reporte de ...` y que contiene el archivo PDF adjunto.
6. Confirmar que solo se enviaron a los correos deduplicados (2 correos únicos).

---

## 4. Checklist de Cierre del Sprint 5

- [ ] Contenedores `report-db` y `report-service` en estado `healthy`.
- [ ] Migración `reporte_envio` ejecutada sin errores.
- [ ] Permisos de reportes sembrados en `security-service`.
- [ ] Dashboard interactivo mostrando KPIs y gráficos en tiempo real.
- [ ] Descarga de PDFs de Ventas, Pedidos e Inventario funcionando.
- [ ] Correo recibido en Mailpit con el PDF adjunto y deduplicación validada.
- [ ] Registro de auditoría creado en la base de datos `dulce_report`.
