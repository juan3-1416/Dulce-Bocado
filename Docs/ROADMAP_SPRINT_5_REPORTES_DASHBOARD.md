# Propuesta de Sprint 5 — Dashboard y reportes por correo

**Fecha de propuesta:** 2026-11-22. **Estado:** Product Backlog propuesto; Sprint Goal, capacidad, responsables y fechas requieren acuerdo en Sprint Planning. Este incremento mantiene aparte el objetivo comercial del Sprint 4.

## Objetivo y alcance

Migrar HU22/R22 y HU23/R23 desde el backend legado a un `report-service` independiente. El administrador podrá consultar KPIs y gráficos de ventas, pedidos, producción e inventario; el personal autorizado podrá consultar al menos tres reportes parametrizados, descargar sus PDF y enviarlos en una solicitud a uno o varios correos. La entrega local con transporte de correo de prueba es verificable; el envío a buzones externos depende de configuración y prueba del proveedor.

HU20 (contador) y HU21 (temas) siguen en Product Backlog y requieren selección explícita en Planning. El dashboard legado ya tiene pantalla y componentes de gráficos; su backend actual consulta modelos y tablas del monolito, por lo que HU22 aún requiere migración. Reportes también tiene interfaz, PDF y envío múltiple en el monolito; el frontend continúa usando cookies/CSRF para ese flujo.

## Propiedad y contratos

`report-service` es propietario de la definición de reportes, plantillas PDF, solicitudes de envío y auditoría técnica. No será propietario de ventas, pedidos, pagos, producción, inventario ni clientes. Obtendrá datos mediante API de cada servicio con autenticación y permisos acordados; nunca consultará directamente sus bases. Puede usar su propia persistencia para metadatos, solicitudes y resultados de entrega, sin copiar indiscriminadamente datos de negocio. El Gateway publicará solo las rutas públicas autorizadas.

Contratos objetivo, por versionar antes de implementar:

| Ruta | Función | Autorización |
| --- | --- | --- |
| `GET /api/dashboard/resumen?periodo=&fecha_inicio=&fecha_fin=` | KPIs y series con período, fecha de actualización y fuente de cada métrica | `dashboard.consultar` |
| `GET /api/reportes/{tipo}` | Vista previa con filtros y totales; tipos mínimos `ventas`, `pedidos`, `inventario` | `reportes.ver` o permiso acordado |
| `GET /api/reportes/{tipo}/pdf` | Descargar PDF cuyos datos y filtros coinciden con la consulta | `reportes.generar` |
| `POST /api/reportes/{tipo}/enviar` | Generar una versión del PDF y solicitar entrega a `correos: string[]` | `reportes.enviar` |
| `GET /api/reportes/envios/{id}` | Consultar estado y error seguro de la solicitud | Actor autorizado según política |

Definir límites de rango de fechas, tamaño de informe, cantidad máxima de destinatarios y frecuencia de envío en el contrato; rechazar valores fuera de esos límites. Normalizar direcciones para deduplicar, validar cada correo en servidor y proteger contra encabezados inyectados. Guardar filtros y hash/identificador del PDF para reproducibilidad. Usar una clave de idempotencia por envío para que un reintento no duplique mensajes. Registrar actor, destinatarios autorizados, estado, marca de tiempo y referencia del transporte. La respuesta distinguirá `GENERADO`, `EN_COLA`, `ACEPTADO_POR_TRANSPORTE` y `FALLIDO`; no declarará entrega a buzón sin prueba externa.

## KPIs y gráficos mínimos

Definir con el Product Owner fórmulas, ventanas temporales, moneda, zona horaria y exclusiones antes de implementar. Base sugerida: monto y número de ventas confirmadas, cobros confirmados y saldo; pedidos por estado y pendientes de entrega; producción iniciada/finalizada; existencias y alertas de mostrador. Gráficos sugeridos: tendencia de ventas/cobros por día, distribución de estados de pedidos y productos con mayor cantidad vendida. Cuando una dependencia falle, mostrar la fuente afectada y la fecha de datos válidos; no reemplazarla silenciosamente con cero. Evitar contar ventas canceladas como ingreso y distinguir ventas de pagos recibidos.

## Secuencia propuesta de trabajo

| ID | Trabajo | Evidencia para marcar Completado | Estado |
| --- | --- | --- | --- |
| S5-01 | Acordar KPI, filtros, permisos, contrato y política de destinatarios | Especificación versionada y ejemplos de respuesta aprobados | Completado |
| S5-02 | Exponer agregados o consultas paginadas en servicios propietarios | Pruebas por servicio, autorización y límites; sin consultas cruzadas a bases | Completado |
| S5-03 | Crear `report-service`, infraestructura y API de dashboard | Arranque, pruebas de agregación y fallo parcial con servicios reales | Completado |
| S5-04 | Implementar reportes filtrados y PDF de ventas, pedidos e inventario | Mismos filtros y totales en JSON y PDF; pruebas de fecha/estado y datos vacíos | Completado |
| S5-05 | Implementar envío a múltiples correos | Pruebas de 1 y varios destinatarios, inválidos, duplicados, reintentos y caída del transporte | Completado |
| S5-06 | Adaptar DashboardPage y ReportesPage a Bearer y nuevas rutas | KPIs, gráficos, formularios, estados de error y descarga/envío por Gateway | Completado |
| S5-07 | Seguridad, integración y aceptación Scrum | Suite aislada, flujo de extremo a extremo, evidencias, revisión y acta | Completado |

## Pruebas de aceptación imprescindibles

1. Los cuatro dominios aportan datos verificables al dashboard con período y zona horaria consistentes. Un servicio caído produce error parcial visible, sin KPI falso.
2. Tres reportes mínimos respetan filtros validados; la vista previa, el PDF y el adjunto corresponden al mismo conjunto de datos.
3. Un envío a dos direcciones válidas produce un solo PDF y dos destinatarios; un correo duplicado se deduplica y uno inválido se rechaza antes de enviar. Repetir la misma operación con igual clave no reenvía.
4. Un usuario sin permiso recibe 403; sin token recibe 401. Las rutas internas no quedan expuestas por Gateway. No se registran secretos ni datos innecesarios en logs.
5. El transporte local de prueba captura destinatarios y adjunto. Una falla del correo conserva el PDF y devuelve estado fallido verificable. La entrega real se documenta por separado cuando haya proveedor y credenciales autorizadas.
6. Los gráficos y KPI se comparan con respuestas de los servicios y datos de prueba conocidos; el frontend muestra carga, vacío y error sin ocultar fallos.

## Definition of Done y seguimiento

Cada fila pasa a **En curso**, **En revisión** y **Completado** solo con commit, pruebas ejecutadas, ambiente y evidencia registrada en este archivo. Cerrar HU22/HU23 requiere autorización real, resultado en Gateway, persistencia pertinente, accesibilidad básica de gráficos, revisión y aceptación del Product Owner documentada. Las horas estimadas y velocidad se definirán en Planning y no se inferirán del código legado.
