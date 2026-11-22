# Sprint 4 — Contexto, avance y evidencia para documentación oficial

**Corte de revisión:** 2026-11-22, rama local `devFabian` en `36a6fff` tras integrar `origin/dev-jp` por avance rápido. **Método:** comparación de commits `0b50b7e..36a6fff`, revisión estática del repositorio y documentos existentes. No se ejecutaron en esta revisión contenedores, migraciones, seeders, pruebas integrales ni una transacción real de Libélula. Este documento separa implementación observable, evidencia previa y aceptación pendiente.

## 1. Antecedentes y objetivo

Sprint 2 dejó Sales y Orders con sus bases y borradores. Sprint 3 añadió Production e Inventory; su aceptación integral estaba pendiente en el plan inicial de Sprint 4. El objetivo de Sprint 4 es completar la venta de mostrador con descuento idempotente, cobrar sin sobrepasar el total mediante efectivo o QR, emitir recibos internos y asociar anticipos a pedidos, con servicios y datos propios.

El alcance acordado se expresa como HU10 (venta confirmada), HU11 (pagos), HU12 (QR y anticipo) y HU13 (recibos), además de validar HU16–HU19 del incremento anterior. HU20–HU23 quedaron fuera de la capacidad de este sprint. Los criterios, rutas y matriz PS4 están en [sprint4.md](sprint4.md). El documento [SPRINT_4_PLAN_DESARROLLO_Y_PRUEBAS.md](SPRINT_4_PLAN_DESARROLLO_Y_PRUEBAS.md) describe entregables técnicos y afirma cierre total; esa afirmación necesita conciliación con los resultados de pruebas que se indican más abajo.

## 2. Arquitectura y entregables observables

| Componente | Implementación localizable | Estado que permite afirmar el repositorio |
| --- | --- | --- |
| Sales + Inventory | `VentaConfirmacionService.php`, `VentaInventarioService.php`, `/api/ventas/{id}/confirmar`, `/internal/ventas/descontar`, operación persistida por UUID | Existe código para confirmar y descontar; faltan resultados integrales PS4-03/04/05 con bases reales documentados en la matriz. |
| Payment | Base PostgreSQL propia, migraciones, efectivo/saldo/idempotencia, intención QR, integración Libélula, recibos y PDF | Existen servicios, controladores y rutas. La suite aislada de efectivo documentó 18 pruebas y 93 aserciones en `SPRINT_4_PRUEBAS_PAYMENT.md`; no equivale a una transacción financiera real. |
| Security + Gateway | Introspección Bearer, rutas públicas de Sales/Payment, bloqueo de `/internal/*`, permisos Sprint 4 | Se recibió `Sprint4PermisosSeeder.php` para `ventas.confirmar`, pagos y recibos; se debe comprobar su aplicación efectiva en el ambiente conjunto. |
| Frontend | Pantallas de Ventas, Pagos, QR, Pedidos y Recibos adaptadas a servicios | El plan registra build/lint y código de vistas; falta evidencia reproducible de recorrido integral con datos persistidos. |
| Producción | Dockerfile y permisos de Producción | Cambios de apoyo; el flujo heredado PS3 debe verificarse con todos los servicios levantados. |

Cada servicio conserva propiedad sobre su base. Sales solicita el egreso a Inventory por API interna y Payment consulta el total/estado de Sales u Orders por API. Una respuesta perdida exige conciliar con el mismo identificador para evitar descuentos o cobros repetidos. El callback QR y las credenciales requieren verificación con el contrato real de Libélula y entorno autorizado.

## 3. Evidencia recibida de `dev-jp` el 2026-11-22

Se integraron cuatro commits nuevos sin conflicto, de `0b50b7e` a `36a6fff`:

| Commit | Cambio comprobado | Relación con Sprint 4 |
| --- | --- | --- |
| `15cf8f4` | Seeder idempotente de permisos `ventas.confirmar`, `pagos.crear/ver`, `recibos.crear/ver/anular`; se enlaza desde `DatabaseSeeder`. | Completa código pendiente de T406; requiere ejecución y prueba de roles en Security. |
| `54b83fe` | Ajustes de configuración Libélula, incluida URL de registrar deuda y variables de entorno de Payment. | Refina adaptador T405/T408; no aporta por sí solo evidencia de pago QR externo exitoso. |
| `51f09e5` | Dashboard legado: Bearer en frontend, introspección en backend, permiso `dashboard.consultar`, cambios de controlador/rutas; seeders de demostración para varios servicios y `scripts/seed-demo.ps1`. | Prepara demostración de datos y acceso. El dashboard sigue en `backend` y usa modelos/SQL del monolito; no implementa HU22 en `report-service`. |
| `36a6fff` | `Docs/poblacion.md` con explicación de correcciones y procedimiento para datos demo. | Guía de ejecución, no registro de pruebas PS4 completadas. |

Los seeders demo introducen datos ficticios en bases de varios servicios. Antes de ejecutarlos deben revisarse sus precondiciones, idempotencia, conexiones y efecto sobre datos existentes; este informe no registra su ejecución. `Docs/poblacion.md` documenta una ruta local de otro desarrollador que debe ajustarse al ambiente donde se use.

## 4. Estado de tareas y pruebas conciliado

La tabla del plan Scrum marca T401–T414 como **Completado** y declara 70 horas/100%. El backlog operativo se concilió en `Docs/sprint4.md`: T401 **En curso**; T404/T405/T406/T414 **En revisión**; T407 **Por hacer**; T402/T403/T408–T413 **Completado** en su alcance técnico declarado. Estas fuentes describen cortes y criterios diferentes; no se deben trasladar simultáneamente como una misma medición.

Para el informe oficial, el estado comprobable hoy es: la mayor parte del código de HU10–HU13 está incorporada y existen pruebas aisladas/documentación técnica. La guía [SPRINT_4_PRUEBAS_CONSOLIDACION_MICROSERVICIOS.md](SPRINT_4_PRUEBAS_CONSOLIDACION_MICROSERVICIOS.md) mantiene **sin marcar TP-01 a TP-10**, incluido arranque conjunto, flujo Sales→Inventory, efectivo, QR real, recibos, seguridad y persistencia tras reinicio. La matriz PS4 de `sprint4.md` todavía no contiene resultados reproducibles por caso. Por tanto, la aceptación integral del incremento y la revisión formal del Product Owner quedan **pendientes de evidencia verificable**.

Evidencia previa registrada: Payment ejecutó 18 pruebas/93 aserciones en PostgreSQL aislado, con HTTP simulado de dependencias; Inventory ejecutó cinco casos nuevos/29 aserciones de descuento y una suite aislada de 56 casos/275 aserciones, documentadas en [SPRINT_4_CONFIRMACION_VENTAS.md](SPRINT_4_CONFIRMACION_VENTAS.md). El plan también declara build/lint del frontend, pero esta revisión no los repitió. Estas cifras acreditan los escenarios y ambientes indicados, no los TP integrales.

La sección 5 del plan Scrum afirma Review, decisión de aceptación del Product Owner y velocidad de 70 horas. No se encontró en la matriz TP un acta, resultados observados ni horas reales que sustenten esas afirmaciones. Antes de incorporarlas al documento oficial, obtener acta/fecha/asistentes, evidencia del entorno y resultados de cada caso; de no existir, presentarlas como pendientes o estimaciones, según corresponda.

## 5. Dashboard y reportes: estado real y decisión de alcance

Sí existe una **pantalla de dashboard** con tarjetas KPI y gráficos en React. El commit `51f09e5` hizo que solicite `/api/dashboard/resumen` con Bearer y añadió el permiso de consulta. Gateway envía esa ruta a `backend` legado; `DashboardController.php` calcula datos mediante modelos y consultas SQL del monolito. Esto permite aprovechar la interfaz, pero no demuestra KPIs de las bases independientes ni completa HU22 en microservicios. Los seeders demo tampoco son evidencia de que las métricas estén conectadas a esos servicios.

También existe en el monolito `ReporteController.php`: filtra ventas, pedidos e inventario, genera PDF y acepta un arreglo `correos`, valida direcciones y elimina duplicados antes de llamar al correo. `ReportesPage.jsx` presenta filtros y envío, mientras `reporteService.js` aún usa cookies/CSRF y el backend legado accede a sus propios modelos. Por ello HU23 está implementada como referencia legada y **pendiente de migración**. La precisión nueva de HU23/R23 exige varios destinatarios, filtros idénticos en consulta/PDF/adjunto, permisos, auditoría y resultado verificable del transporte.

Se propone un **Sprint 5** separado para migrar HU22/HU23 a `report-service`, reutilizar las vistas React y completar KPIs, gráficos, PDF y correo múltiple. El trabajo y sus pruebas están en [ROADMAP_SPRINT_5_REPORTES_DASHBOARD.md](ROADMAP_SPRINT_5_REPORTES_DASHBOARD.md). HU20/HU21 se seleccionarán explícitamente en Planning si hay capacidad. Esta decisión conserva el Sprint Goal y las métricas históricas del Sprint 4.

## 6. Próximas evidencias para el cierre oficial del Sprint 4

1. Acordar ambiente, commit, datos ficticios y responsable; levantar exactamente la composición Docker necesaria y registrar salud de cada servicio (TP-01/PS4-01).
2. Aplicar permisos y migraciones incrementales sin vaciar bases; comprobar perfiles autorizados/no autorizados, Gateway e aislamiento interno (TP-02/09).
3. Ejecutar PS3 heredadas y venta→descuento con stock suficiente/insuficiente, reintentos y concurrencia en PostgreSQL (TP-03/04).
4. Ejecutar efectivo, saldo, QR con el entorno autorizado de Libélula, anticipo de pedido y recibo/PDF con datos persistidos; diferenciar proveedor externo de dobles simulados (TP-05 a TP-08).
5. Reiniciar servicios/bases sin borrar volúmenes y comparar estados, pagos y movimientos; probar caída de dependencias (TP-10 y PS4 correspondientes).
6. Completar para cada prueba fecha, commit, ambiente, petición, respuesta, consulta de base, resultado y responsable. Conciliar backlog operativo, acta de Review, aceptación y horas reales con esas evidencias antes de redactar el cierre Scrum.

## 7. Fuentes del repositorio

- `Docs/sprint4.md`: objetivo, contratos, backlog operativo y matriz PS4.
- `Docs/SPRINT_4_PLAN_DESARROLLO_Y_PRUEBAS.md`: narrativa técnica y declaraciones de cierre sujetas a conciliación.
- `Docs/SPRINT_4_PRUEBAS_CONSOLIDACION_MICROSERVICIOS.md`: procedimiento TP-01 a TP-10 y checklist todavía abierto.
- `Docs/SPRINT_4_PRUEBAS_PAYMENT.md` y `Docs/SPRINT_4_CONFIRMACION_VENTAS.md`: evidencias aisladas previas.
- `Docs/poblacion.md`: cambios y carga demo aportados por `dev-jp`.
- Código en `microservices/`, `gateway/`, `frontend/` y `backend/` a `36a6fff`.

Este informe es una base técnica para la documentación oficial. No constituye por sí mismo acta de Sprint Review ni certificación de pago/correo externo.
