# Dulce Bocado — guía general de implementación

**Propósito:** reunir el alcance, la arquitectura, las reglas de integración y la ruta de trabajo para completar el sistema web académico de la pastelería simulada Dulce Bocado.

**Estado de referencia (11 de noviembre de 2026):** Sprint 1 cerrado según su acta; Sprint 2 documentado y pendiente según esa misma acta. Los sprints 3 y 4 están definidos en la documentación Scrum, pero su ejecución no queda acreditada por las fuentes revisadas. Antes de iniciar cada tarea, comprobar el estado real del repositorio y del tablero.

## 1. Procedencia y uso autónomo

Esta guía incorpora el contenido necesario para desarrollar el proyecto sin consultar otros archivos. Se elaboró a partir de la documentación Scrum oficial, del cierre de Sprint 1 y plan de Sprint 2, y del contraste con el código disponible al redactarla. Las fuentes sirven para trazabilidad histórica; **no son dependencias de lectura para el agente**. Cuando un detalle técnico no esté fijado aquí, verificar la implementación actual y registrar la decisión antes de codificar.

Las primeras secciones del documento Scrum describen una distribución inicial de servicios y sprints distinta. Sus secciones posteriores **5.2–5.4** detallan el plan actualizado: Sprint 2 incorpora Customer, Catalog, Orders y Sales; Catalog usa MySQL y Sales usa PostgreSQL. Esta guía sigue ese plan detallado, coherente con el acta de Sprint 1. **La arquitectura de microservicios es la única referencia técnica para implementar el proyecto.** Cualquier descripción anterior del repositorio que difiera de ella se considera desactualizada para este trabajo.

## 2. Objetivo y alcance

Construir un sistema de información web que conecte seguridad, clientes, catálogo, recetas, pedidos, ventas, pagos, producción, inventario y reportes. Debe permitir seguir una venta inmediata y un pedido con elaboración y recogida presencial, con trazabilidad de responsables, movimientos, estados, precios y cobros.

El alcance funcional oficial comprende **HU1–HU23**:

| Grupo | Historias | Resultado principal |
|---|---|---|
| Seguridad | HU1–HU6 | Login, usuarios, roles, permisos, asociación y asignación de accesos |
| Catálogo y clientes | HU7–HU9 | Productos/presentaciones, clientes, materias primas y recetas |
| Venta y cobro | HU10–HU13 | Venta, pagos, pago por internet/QR y recibo interno |
| Pedidos | HU14–HU15 | Registro, estados y entrega |
| Operación | HU16–HU19 | Producción, almacenes/existencias, ingresos y egresos |
| Soporte y análisis | HU20–HU23 | Visitas, temas, dashboard y reportes PDF por correo |

Los ajustes de inventario, proveedores/compras y consumo/costo/desperdicio constan en el alcance técnico del Sprint 3 y en el mapeo de casos de uso, **sin crear nuevas HU/R**. El sistema contempla integración con pasarela de pago y servidor de correo según sus contratos; las credenciales y proveedores concretos deben configurarse al implementar.

Límites prácticos: recibo interno no equivale a facturación fiscal; pago por internet no exige una tienda pública completa. Evitar ampliar el proyecto con funciones ajenas a las 23 HU y el backlog técnico aprobado.

## 3. Arquitectura objetivo

```text
Usuario → React/Vite/Tailwind → Nginx API Gateway → servicios Laravel REST/JSON
                                                ├→ Security → PostgreSQL
                                                ├→ Customer → PostgreSQL
                                                ├→ Catalog → MySQL
                                                ├→ Orders → PostgreSQL
                                                ├→ Sales → PostgreSQL
                                                ├→ Payment → PostgreSQL
                                                ├→ Inventory → PostgreSQL
                                                ├→ Production → PostgreSQL
                                                ├→ Support → PostgreSQL
                                                └→ Report → APIs propietarias (sin BD de negocio)
```

Stack: **React + JavaScript + Vite + Tailwind CSS**; **Laravel/PHP** para APIs REST; **Nginx** como Gateway; **PostgreSQL y MySQL**; **Docker Compose**; **Git/GitHub**; Jira para seguimiento Scrum. Cada servicio mantiene su esquema, migraciones, reglas y transacciones locales. El backend Laravel legado presente en Sprint 1 no debe confundirse con un servicio propietario del diseño final.

| Servicio | Propiedad y base | Introducción |
|---|---|---|
| `security-service` | Identidades, RBAC, tokens; `dulce_security` PostgreSQL | S1, cerrado |
| `customer-service` | Clientes; `dulce_customers` PostgreSQL | S2 |
| `catalog-service` | Categorías, productos, presentaciones, materias primas maestras y recetas; `dulce_catalog` MySQL | S2 |
| `order-service` | Pedidos, detalle, estados, entrega; `dulce_orders` PostgreSQL | S2 |
| `sales-service` | Ventas, detalle, totales, anulación; `dulce_sales` PostgreSQL | S2; stock en S3 |
| `payment-service` | Pagos, saldos, pago en línea y recibos; `dulce_payments` PostgreSQL | S3 |
| `inventory-service` | Almacenes, existencias, movimientos, ajustes, proveedores/compras; `dulce_inventory` PostgreSQL | S3 |
| `production-service` | Producción y trazabilidad de consumo/costo/desperdicio; `dulce_production` PostgreSQL | S3 |
| `support-service` | Contadores por página; `dulce_support` PostgreSQL | S4 |
| `report-service` | Dashboard, reportes, PDF y correo; sin base de negocio | S4 |

### Reglas obligatorias de comunicación

1. React consume **solo el Gateway** mediante `VITE_API_URL` (en desarrollo, `http://localhost:8080`). No usar puertos internos en el frontend.
2. Los servicios se llaman mediante **REST/HTTP con JSON** y contratos explícitos. El Gateway enruta las rutas públicas; en Docker, las llamadas internas usan los nombres de servicio de la red y el mecanismo de autenticación acordado.
3. Cada servicio accede solo a **su propia base**. Guardar IDs externos y snapshots necesarios; nunca FK ni SQL hacia tablas de otro servicio.
4. Validar referencias externas mediante la API propietaria antes de confirmar. Si una dependencia falla, responder con error controlado y no confirmar una operación incompleta.
5. Propagar identidad/autorización de manera verificable. El Sprint 1 usa Sanctum Personal Access Tokens en `Authorization: Bearer`; `/api/auth/me` entrega roles/permisos. El control del menú y `ProtectedRoute` complementa, pero no reemplaza, la autorización backend. Sin token: `401`; sin permiso: `403`.
6. Una transacción de base cubre solo un servicio. Para operaciones entre servicios, definir orden, identificador de operación, idempotencia, respuesta ante reintento y compensación/estado pendiente antes de implementar, sobre todo en venta→inventario y producción→inventario. No prometer atomicidad distribuida por una transacción local.

### Contratos entre dominios

| Consumidor → propietario | Motivo |
|---|---|
| Orders → Customer | Existencia y estado del cliente |
| Orders → Catalog | Presentación, precio vigente y personalización |
| Sales → Customer/Catalog | Cliente opcional; presentación y precio previo al snapshot |
| Sales → Inventory | Validar y egresar stock de Mostrador antes de confirmar venta; integración S3 |
| Payment → Sales/Orders | Total, estado y saldo de la operación pagada |
| Production → Catalog/Inventory | Receta; disponibilidad y movimientos de materias primas y producto terminado |
| Report → Sales/Orders/Production/Inventory | Agregación para dashboard y reportes, siempre por API |

Las rutas públicas ya existentes de Seguridad incluyen `/api/auth/*`, `/api/usuarios*`, `/api/roles*`, `/api/permisos*` y `/api/asignaciones*`. Sprint 2 agrega `/api/clientes*`, `/api/categorias*`, `/api/productos*`, `/api/presentaciones*`, `/api/materias-primas*`, `/api/recetas*`, `/api/pedidos*` y `/api/ventas*`. Los contratos preliminares de S3/S4 deben cerrarse con métodos, payloads, permisos y errores antes de conectar interfaces. Actualizar Nginx al agregar cada servicio y verificar el enrutamiento desde React.

## 4. Reglas de negocio transversales

- **Históricos:** guardar en detalle de pedido/venta `presentacion_id`, nombre, precio unitario, cantidad y subtotal como snapshot. Cambios posteriores del catálogo no alteran operaciones registradas.
- **Pedidos:** cliente, presentaciones, fecha/hora de entrega, observaciones y personalización opcional; transiciones de estado válidas y entrega registrada. El pedido no reserva stock automáticamente. La entrega exige saldo pagado y disponibilidad suficiente según la regla final de Inventario.
- **Ventas:** uno o varios ítems, cliente registrado u ocasional, total calculado, responsable y anulación controlada. En S2 la venta base conserva total/snapshot; en S3 se completa validación y descuento de Mostrador. No considerar HU10 integralmente cerrada antes de esa integración.
- **Pagos:** montos positivos, uno o varios abonos, acumulado no mayor que el total, saldo correcto; pago por internet con estados `PENDIENTE`, `APROBADO`, `RECHAZADO`, referencia y respuesta del proveedor. Recibos internos emitibles y consultables.
- **Inventario:** almacenes de Materias Primas, Producción y Mostrador; stock nunca negativo; ingresos, egresos y ajustes con usuario, fecha y motivo. Catalog es dueño de la ficha del artículo, Inventory de su existencia. Las pérdidas se registran con trazabilidad.
- **Producción:** consultar receta vigente de Catalog, calcular requerimientos, validar insumos en Inventory, registrar consumo y unidades buenas; solo estas incrementan terminado. Registrar costo/desperdicio conforme al diseño S3.
- **Soporte:** contador por ruta; al menos tres temas en React, persistidos localmente si se desea; dashboard con datos de APIs; al menos tres reportes parametrizados (ventas, pedidos, inventario), PDF con filtros y envío a uno o varios correos válidos.

## 5. Ruta de ejecución y estado

| Sprint | Entrega definida | Estado sustentado |
|---|---|---|
| 1 | Infraestructura, Gateway, Seguridad HU1–HU6, pruebas PS1-01 a PS1-20 | Cerrado según acta; código de Security/Gateway presente |
| 2 | HU7–HU9, HU14–HU15 y base HU10: Customer, Catalog, Orders, Sales, React y Gateway | Planificado en acta; verificar avance antes de empezar |
| 3 | HU11–HU13, HU16–HU19, alcance técnico de inventario/compras/producción e integración Sales→Inventory | Plan detallado, sin cierre verificado |
| 4 | HU20–HU23, Support, Report, temas, integración, pruebas, Docker y evidencias | Plan detallado, sin cierre verificado |

### Sprint 2: secuencia concreta

1. T201–T203: Customer, PostgreSQL, API, permisos, Gateway e interfaz.
2. T204–T208: Catalog en MySQL, productos/presentaciones, materias primas y recetas, con interfaz.
3. T209–T213: Orders; validar Customer y Catalog por REST; snapshots, estados y entrega.
4. T214–T216: Sales base; total, snapshots, anulación e interfaz.
5. T217–T218: Gateway, integración, pruebas PS2-01 a PS2-20 y documentación. Mantener explícita la deuda de stock para S3.

### Sprint 3: orden de dependencia

1. Fijar contratos de Inventory para existencias, movimientos y egresos idempotentes; crear sus tablas y APIs propietarias.
2. Completar Sales→Inventory con validación/descuento real de Mostrador y rechazo de stock insuficiente.
3. Payment consulta Sales/Orders por REST; implementar pagos, saldo, QR/pasarela y recibo.
4. Production consulta Catalog e Inventory; implementar producción, consumo, entradas de unidades buenas y desperdicio.
5. Integrar compras/proveedores y ajustes definidos en backlog técnico, interfaces, rutas Gateway y pruebas T301–T318.

### Sprint 4: cierre

Implementar contador de visitas en Support; temas en React; Report como agregador REST; dashboard, tres reportes filtrados, PDF y correo. Después ejecutar regresión de flujos completos, permisos, dependencia caída, persistencia, arranque Docker, documentación de contratos y evidencias Scrum. No cerrar el proyecto hasta demostrar HU20–HU23 y ausencia de fallos críticos en los flujos principales.

## 6. Criterio común de terminado

Para cada capacidad: contrato API y permiso definidos; migración nueva aplicada sin editar migraciones ejecutadas; validaciones y respuestas HTTP consistentes; prueba positiva, negativa y de autorización; llamada a través del Gateway; UI cuando corresponda; datos persistentes; ninguna consulta a BD ajena; evidencia reproducible y estado de Jira actualizado. Para flujos distribuidos, probar dependencia caída, reintento y ausencia de duplicados. El cierre de sprint requiere demostración del incremento y revisión de los criterios oficiales de su sección.

## 7. Decisiones técnicas adoptadas y datos externos pendientes

La sección 17 fija las decisiones operativas de autenticación, contratos, estados, idempotencia y recuperación. Deben aplicarse de forma consistente en todos los servicios. Solo requieren información externa el proveedor/entorno de pagos y el servidor de correo; sus adaptadores y pruebas se preparan sin credenciales reales. Antes de marcar una tarea como terminada, comprobar el avance real en el repositorio.

## 8. Inicio reproducible

Desde la raíz de `Dulce-Bocado`, el entorno comprobado en el cierre S1 se levanta con:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml ps
```

El Gateway de S1 se publica en `localhost:8080`, frontend en `localhost:5173` y Security en `localhost:8001` para diagnóstico local; React usa solo `VITE_API_URL=http://localhost:8080`. El Compose final para S2–S4 deberá ampliarse de forma incremental y verificarse en cada sprint. La primera tarea planificada en el acta es **T201: crear `customer-service`, su PostgreSQL y sus rutas base**.

## 9. Instrucciones de ejecución para el agente

Esta sección convierte el plan en una secuencia de trabajo verificable. Su aplicación nunca autoriza a marcar como implementado lo que solo aparece en documentos.

1. **Reconocer el estado real:** leer Compose, rutas Nginx, migraciones, modelos, controladores, servicios frontend y pruebas existentes; registrar qué existe y qué falta para la tarea. El acta más reciente de cierre prevalece sobre un resumen intermedio del mismo sprint.
2. **Trabajar una capacidad completa cada vez:** definir contrato y dueño del dato → migración/modelo → validación y API → pruebas del servicio → ruta Gateway → servicio React e interfaz → prueba integrada → evidencia. No crear simultáneamente cuatro servicios vacíos como sustituto del avance funcional.
3. **Mantener los límites:** ampliar `microservices/<servicio>` según dominio. No trasladar reglas de negocio al frontend, al Gateway ni al backend legado. Nginx enruta; Laravel decide.
4. **Extender Seguridad:** crear permisos de negocio con convención `modulo.accion`, asociarlos a roles y proteger los endpoints. La lista de permisos sugeridos del acta S2 no es definitiva; fijar los nombres una vez y usarlos de forma consistente en seeder, middleware, `/api/auth/me`, `ProtectedRoute` y menú.
5. **Preservar datos:** crear migraciones nuevas para cambios de esquema; no editar migraciones ya aplicadas ni ejecutar comandos que recrean bases con datos. Cada servicio tiene volumen persistente y variables de entorno propias.
6. **Documentar cada contrato:** método, ruta, campos requeridos/opcionales, respuesta, estados HTTP, permiso, dueño, consumidor, timeout y efecto ante reintento. Registrar ejemplos JSON sintéticos sin credenciales.
7. **No cerrar por compilación:** una compilación exitosa no demuestra reglas de negocio. Probar casos de éxito, validación, autorización, dependencia caída y persistencia. Una HU se cierra cuando su flujo completo puede demostrarse por React → Gateway → servicio.

### Distribución de responsabilidades en el código

| Capa | Debe hacer | No debe hacer |
|---|---|---|
| React | Formularios, navegación, estados de carga/error, servicios HTTP centralizados, permisos visuales | Decidir precios finales, saldo, stock o transiciones como fuente de verdad |
| Nginx Gateway | Exponer URL única y enrutar por prefijo preservando método, cuerpo y encabezado de autorización | Consultar bases, calcular totales o autenticar por su cuenta |
| Laravel propietario | Validación, autorización, reglas de negocio, transacciones locales, API REST | Leer tablas de otra base o modificar datos de otro servicio directamente |
| PostgreSQL/MySQL propio | Persistencia y restricciones dentro del dominio | Relaciones FK entre servicios |
| Servicio externo | Confirmación de pago o entrega de correo según contrato | Ser tratado como éxito antes de recibir respuesta verificable |

## 10. Modelo de datos mínimo por servicio

Los nombres concretos de columnas deben cotejarse con las secciones de diseño y migraciones existentes antes de crearlas. Esta tabla indica **responsabilidad**, no una orden de duplicar entidades.

| Servicio | Entidades o datos que debe poseer | Referencias externas |
|---|---|---|
| Security | `usuarios`, `roles`, `permisos`, `rol_permiso`, `usuario_rol_permiso`, `personal_access_tokens` | Ninguna tabla ajena |
| Customer | Cliente, estado y datos de contacto | Identidad del usuario que modifica, si se audita |
| Catalog | Categoría, producto, presentación, materia prima maestra, receta y detalle de receta | Ninguna existencia de almacén |
| Orders | Pedido, detalle, estado/historial y entrega | IDs de cliente, presentación y usuario; snapshots comerciales |
| Sales | Venta, detalle, estado/anulación | IDs de cliente opcional, presentación y usuario; snapshots comerciales |
| Payment | Pago, pago por internet, recibo | Tipo e ID de venta/pedido; usuario externo; snapshot para recibo |
| Inventory | Almacén, existencia, ingreso/detalle, egreso/detalle, ajuste, proveedor, compra/detalle | Tipo e ID del artículo de Catalog; usuario externo |
| Production | Producción, detalle, consumo y desperdicio | IDs de presentación, materia prima y usuario; snapshot de receta/costo aplicado |
| Support | `visita_pagina` con ruta, total y última visita | Ninguna |
| Report | No posee datos de negocio | Respuestas REST de servicios dueños |

**Invariantes de datos:** importe y cantidad deben usar tipos numéricos apropiados, con precisión monetaria consistente; cantidades y precios negativos se rechazan donde no representan un ajuste explícito; claves únicas evitan duplicados de acceso y de identificadores de negocio; toda referencia externa se valida por API; cada operación conserva fecha y responsable cuando corresponde. Las restricciones entre filas del mismo servicio pertenecen a su base y a su lógica Laravel.

## 11. Contratos REST y comportamiento esperado

### Seguridad (implementada en Sprint 1)

`POST /api/auth/login` recibe `nombre_usuario` y `contrasena`; `GET /api/auth/me` devuelve usuario y permisos efectivos; `POST /api/auth/logout` invalida el token actual. Las rutas de usuarios, roles, permisos y asignaciones aparecen en el acta S1. Se documentaron usuario inactivo rechazado, control de intentos, contraseñas hasheadas, unicidad, asignaciones sin duplicar, `401` y `403`.

Antes de reutilizar Security en otro Laravel, verificar **en código** cómo valida ese servicio el token emitido por Security. `auth:sanctum` instalado en un servicio distinto no demuestra por sí solo que reconozca un token cuya base pertenece a Security. El mecanismo de validación común debe tener contrato, prueba de token válido, revocado, usuario inactivo, permiso faltante y caída de Security. No copiar tablas de tokens a cada dominio como atajo silencioso.

### Sprint 2: rutas base acordadas

| Dominio | Rutas mínimas del acta | Regla esencial |
|---|---|---|
| Customer | `GET/POST /api/clientes`, `GET/PUT/PATCH /api/clientes/{id}`, `PATCH /api/clientes/{id}/estado` | Un cliente inactivo no entra en nuevas operaciones |
| Catalog | `GET/POST /api/categorias`, `/api/productos`, `/api/presentaciones`, `/api/materias-primas`, `/api/recetas`; `GET /api/presentaciones/{id}`, `/api/presentaciones/{id}/receta` | Presentación y receta son datos propios de Catalog |
| Orders | `GET/POST /api/pedidos`, `GET/PUT /api/pedidos/{id}`, `PATCH /api/pedidos/{id}/estado`, `POST /api/pedidos/{id}/entregar` | Validar cliente/presentación; congelar precio; rechazar transición inválida |
| Sales | `GET/POST /api/ventas`, `GET/PUT /api/ventas/{id}`, `POST /api/ventas/{id}/anular` | Recalcular total en backend y guardar snapshot |

**Códigos:** `200/201` para consulta/creación correctas; `401` sin identidad; `403` sin permiso; `404` recurso inexistente; `409` conflicto de estado o disponibilidad; `422` entrada inválida. Un servicio dependiente que no responde requiere error controlado de integración, sin registrar éxito. Mantener estructura JSON de error coherente y mensajes comprensibles en React.

### Sprint 3 y 4: contratos que deben cerrarse

Para Sprint 3 y 4 se adoptan las rutas preliminares indicadas más abajo y las reglas operativas de la sección 17. Cada ruta debe especificar payload y respuesta en su contrato de código antes de conectar el frontend:

- Inventory: consulta de existencias por almacén/tipo/artículo; ingreso, egreso y ajuste con ID de operación único; respuesta con saldo actualizado; rechazo de stock negativo. El mismo ID no puede descontar dos veces.
- Payment: consulta del total de venta/pedido, pagos existentes y saldo; registro de abono; inicio/confirmación/rechazo de pago externo; recibo asociado a pago confirmado. Un callback repetido no puede duplicar abonos.
- Production: consulta de receta y existencias; inicio/cierre de producción; salida de insumos y entrada de unidades buenas; estados que permitan detectar una operación parcialmente aplicada.
- Support: registrar y consultar visita por ruta; incremento atómico para visitas concurrentes.
- Report: endpoints de resumen, filtros y PDF; origen REST por dominio; destinatarios validados y resultado de envío distinguible de la generación del PDF.

Si una ruta preliminar requiere un endpoint interno adicional para completar una operación segura, documentar su propósito, permiso y consumidor; no exponerlo como función nueva al usuario.

## 12. Flujos de extremo a extremo

### A. Venta de mostrador

1. Usuario autenticado selecciona presentaciones en React; Sales valida el permiso y consulta Catalog para precio/disponibilidad comercial.
2. Sales calcula cantidades, subtotales y total en backend y guarda snapshots. Si hay cliente registrado, lo valida con Customer.
3. Desde Sprint 3, antes de confirmar, Sales solicita a Inventory disponibilidad y egreso de Mostrador con identificador idempotente. Stock insuficiente rechaza la confirmación; la operación no debe aparentar venta completada.
4. Payment registra efectivo o QR/pasarela, siempre contra total y saldo obtenido de Sales. Recibo interno corresponde al pago confirmado.
5. Ante caída entre pasos, conservar estado rastreable y definir reintento/compensación; no volver a descontar por una segunda petición idéntica.

### B. Pedido y entrega presencial

1. Orders valida cliente activo con Customer y presentaciones con Catalog; guarda precio vigente como snapshot, fecha/hora, observaciones y personalización.
2. Orders registra cambios de estado permitidos con fecha/responsable. No reservar inventario de forma automática.
3. Payment registra anticipo y saldo; los abonos no exceden el total. Un pago QR pendiente no equivale a saldo cobrado.
4. Si requiere elaboración, Production consulta receta, usa Inventory para insumos y registra producto terminado bueno. El recorrido del producto hasta Mostrador debe quedar en movimientos de Inventory.
5. La entrega se autoriza solo cuando saldo es cero y hay stock suficiente en Mostrador; la salida de stock y el registro de entrega deben resistir reintentos sin duplicarse.

### C. Producción e inventario

1. Production recibe presentación y cantidad planificada; obtiene receta de Catalog y calcula requerimiento por ingrediente.
2. Inventory verifica cantidades en Materias Primas. Si falta insumo, no confirmar el consumo.
3. Registrar movimientos de egreso, cantidad producida, unidades buenas y desperdicio con vínculo operativo. Solo unidades buenas aumentan existencias de producto terminado.
4. Mantener trazabilidad de usuario, fecha, artículo, almacén, cantidad, motivo y referencia de producción; evitar stock negativo aun con solicitudes concurrentes.

### D. Reporte

Report recibe filtros y permiso; consulta por REST a los servicios propietarios, conserva los filtros en datos y PDF, y comunica por separado los fallos de consulta, generación y correo. El usuario puede obtener el PDF aunque falle el envío, si el diseño de interfaz lo permite; no afirmar envío exitoso sin respuesta del servidor de correo.

## 13. Pruebas de aceptación por etapa

**Sprint 1:** conservar la evidencia PS1-01 a PS1-20 del acta y ejecutar regresión al cambiar autenticación o Gateway.

**Sprint 2:** comprobar las veinte pruebas PS2-01 a PS2-20 del acta: altas y estados de cliente, persistencia MySQL, rechazo de precios/recetas inválidos, pedido válido y referencias inválidas, precio histórico, estados/entrega, venta base, dependencia caída, Gateway, permisos y persistencia. La venta base no acredita por sí sola descuento real de stock.

**Sprint 3:** además del plan de pruebas oficial, comprobar saldo cero/positivo, sobrepago rechazado, pasarela aprobada/rechazada/pendiente, callback duplicado, recibo, stock insuficiente, concurrencia de egresos, ajustes con motivo, receta insuficiente, solo unidades buenas ingresadas, y Sales→Inventory sin doble descuento.

**Sprint 4:** comprobar conteo por ruta y concurrencia, persistencia de tres temas, dashboard desde APIs, tres reportes con filtros reflejados en PDF, correo válido/incorrecto y fallido, permisos, regresión de venta y pedido completos, reinicio con persistencia y Compose integral. Guardar evidencia de respuestas HTTP y pantallas clave.

## 14. Errores que esta guía busca evitar

- Presentar como terminado un sprint solo porque figura en el plan; cambiar la tabla de estado únicamente con evidencia.
- Recalcular pedidos o ventas históricos con el precio actual de Catalog.
- Guardar el stock comercial en Catalog o permitir que Sales escriba directamente la base de Inventory.
- Crear FK de `cliente_id`, `presentacion_id` o `usuario_id` hacia otra base.
- Descontar stock en Sprint 2 y afirmar que la integración S3 está completa sin Inventory operativo.
- Considerar autorizado un endpoint porque su botón está oculto en React.
- Confirmar pago QR por crear una solicitud pendiente; aceptar duplicados de callback.
- Tratar un timeout REST como operación definitivamente fallida o definitivamente exitosa sin verificar el estado por identificador.
- Enviar reportes mediante consultas SQL directas a bases propietarias.
- Añadir historias funcionales nuevas para tareas técnicas ya incluidas en el alcance S3.
- Copiar credenciales al código, publicar puertos internos como URL de frontend o sustituir el Gateway.

## 15. Entrega documental por cada cambio

Registrar: HU/CU/tarea; servicio dueño; archivos modificados; migración; permisos; contrato HTTP; dependencias REST; pruebas con resultado; captura o respuesta de evidencia; limitaciones y siguiente tarea. Actualizar esta guía si se agrega una ruta, base o contrato. Al cerrar un sprint, comprobar los criterios de esta guía y conservar evidencia concreta de cada uno; anotar cualquier excepción.

## 16. Historias de usuario funcionales completas

Las **HU1–HU23** corresponden a **R1–R23** por número. Los criterios siguientes son los criterios funcionales oficiales incorporados aquí para que este archivo sea autónomo. La columna de servicio/sprint aplica el plan detallado vigente. Las pruebas adicionales de las secciones anteriores precisan riesgos de implementación; no sustituyen estos criterios.

### Seguridad — Sprint 1, cerrado según acta

**HU1 / R1 — Acceso y autenticación (`security-service`).** Como usuario autorizado, quiero iniciar y cerrar sesión y acceder a las funciones permitidas por mi rol para usar el sistema de forma segura.

- Aceptación: credenciales válidas permiten entrar y cerrar sesión; las funciones y el menú reflejan roles/permisos; los accesos no autorizados se rechazan.
- Implementación de referencia: login con `nombre_usuario` y `contrasena`, token Sanctum Bearer, `/api/auth/me`, logout que invalida token, protección backend y rutas React. Probar `401` sin token y `403` sin permiso.

**HU2 / R2 — Usuarios (`security-service`).** Como administrador, quiero registrar, consultar, modificar, activar y desactivar usuarios para mantener las cuentas al día.

- Aceptación: registrar, consultar y modificar; activar/desactivar; una cuenta desactivada no accede.
- Implementación: validar unicidad de usuario y correo, hash de contraseña, estado y revocación de acceso al desactivar.

**HU3 / R3 — Roles de acceso (`security-service`).** Como administrador, quiero registrar, consultar, modificar y desactivar roles para organizar el acceso.

- Aceptación: todas esas operaciones funcionan; existen como mínimo `Administrador`, `Vendedor` y `Producción`.
- Implementación: impedir duplicados y preservar las reglas especiales del rol Administrador documentadas en el cierre S1.

**HU4 / R4 — Permisos (`security-service`).** Como administrador, quiero registrar, consultar y administrar permisos para definir acciones disponibles.

- Aceptación: se registran y consultan permisos vinculados a funciones; pueden administrarse para asociarlos después a roles.
- Implementación: nombres únicos y convención consistente `modulo.accion`.

**HU5 / R5 — Asociación rol-permiso (`security-service`).** Como administrador, quiero asociar permisos a cada rol para aplicar autorizaciones.

- Aceptación: un rol admite uno o varios permisos; el acceso efectivo del usuario refleja los permisos asociados a sus roles.
- Implementación: gestionar `rol_permiso` sin duplicados; no retirar accidentalmente una relación usada por asignaciones vigentes.

**HU6 / R6 — Asignación de acceso (`security-service`).** Como administrador, quiero asignar relaciones de roles y permisos a usuarios para controlar accesos y menú.

- Aceptación: se asignan las relaciones a un usuario; menú y acceso a funciones reflejan la asignación vigente.
- Implementación: usar la relación existente `usuario_rol_permiso`; revisar efecto de asignar y quitar un rol completo, invalidación de acceso y permisos efectivos.

### Catálogo, clientes, pedidos y venta base — Sprint 2

**HU7 / R7 — Catálogo y presentaciones (`catalog-service`).** Como administrador o vendedor, quiero mantener categorías, productos y presentaciones con precios y disponibilidad para ofrecer un catálogo actualizado.

- Aceptación: toda presentación exige producto asociado y precio no negativo; categoría, producto y presentación pueden consultarse, modificarse y desactivarse; se conserva disponibilidad y opción de personalización.
- Implementación: producto y presentación son entidades distintas; validar que una presentación pertenezca al producto indicado; precio y disponibilidad comercial pertenecen a Catalog, existencia física a Inventory.

**HU8 / R8 — Clientes (`customer-service`).** Como administrador o vendedor, quiero registrar y consultar clientes, actualizar datos y revisar historial para atender ventas y pedidos.

- Aceptación: registrar, consultar, modificar y desactivar clientes; consultar su historial; permitir cliente ocasional.
- Implementación: Customer posee la ficha; el historial se compone de ventas/pedidos por API, sin consultar bases ajenas. Los pedidos requieren cliente según HU14; la venta puede usar cliente ocasional.

**HU9 / R9 — Recetas (`catalog-service`).** Como productor, quiero registrar y modificar la receta de cada presentación para conocer materias primas y cantidades necesarias.

- Aceptación: receta vinculada a presentación, con al menos una materia prima de cantidad mayor que cero; rechazar materia prima faltante o cantidad inválida.
- Implementación: Catalog posee receta y materia prima maestra; Production consulta esa receta por REST. Cambios en receta no deben alterar registros históricos de producción ya completados.

**HU10 / R10 — Ventas de mostrador (`sales-service` + `inventory-service`).** Como vendedor, quiero registrar productos vendidos, verificar existencias y calcular total para completar la venta.

- Aceptación: total calculado automáticamente con productos, cantidades y precios registrados; antes de confirmar, verificar existencias de Mostrador e impedir vender más que el stock.
- Distribución: S2 implementa venta base, total y snapshots; S3 completa la comprobación y el egreso real de stock. No cerrar HU10 plenamente al terminar solo S2.

**HU14 / R14 — Registro de pedidos (`order-service`).** Como vendedor, quiero registrar pedido con cliente, productos, precios, fecha de entrega y personalización para dejar constancia.

- Aceptación: exigir cliente, al menos un producto, cantidades mayores que cero y fecha/hora de entrega posteriores al registro; calcular total y conservar precios fijados al registrar; observaciones y personalización opcionales.
- Implementación: validar referencias con Customer/Catalog, guardar snapshots, evitar recalcular con catálogo actual y no reservar stock automáticamente.

**HU15 / R15 — Estados y entrega de pedidos (`order-service`, con Payment/Inventory al integrarse).** Como vendedor, quiero actualizar el estado y registrar la entrega para seguir el cumplimiento.

- Aceptación: solo transiciones de estado permitidas; registrar entrega cuando corresponda.
- Implementación: definir tabla de transiciones antes de programar, rechazar transiciones inválidas y duplicación de entrega. Al integrar S3, comprobar saldo pagado y disponibilidad en Mostrador antes de entregar.

### Pagos, inventario y producción — Sprint 3

**HU11 / R11 — Pagos (`payment-service`).** Como administrador o vendedor, quiero registrar pagos de una venta y consultar saldo para controlar importes pendientes.

- Aceptación: cada pago es mayor que cero y actualiza saldo; rechazar cuando la suma supera el total de la operación.
- Implementación: validar total y estado de venta/pedido por REST; registrar varios pagos sin sobrepago y devolver saldo calculado de forma consistente ante concurrencia.

**HU12 / R12 — Pagos por internet (`payment-service`).** Como cliente, quiero pagar por internet una venta o pedido y conocer el resultado para confirmar el pago.

- Aceptación: guardar el resultado del servicio externo y asociarlo a venta/pedido; una transacción rechazada no cuenta como pago exitoso.
- Implementación: distinguir pendiente/aprobado/rechazado, referencia del proveedor y callback repetido; solo aprobación confirmada afecta el saldo.

**HU13 / R13 — Recibos internos (`payment-service`).** Como vendedor, quiero generar, consultar, imprimir, reimprimir y anular recibos internos cuando corresponda.

- Aceptación: recibo generado, consultable, visualizable, imprimible y reimprimible; anulable conforme a reglas de la operación.
- Implementación: numeración/identificador interno, snapshot del pago y estado de anulación; no presentarlo como factura fiscal.

**HU16 / R16 — Producción (`production-service`).** Como productor, quiero registrar elaboración de una presentación y verificar receta y materias primas.

- Aceptación: obtener receta y comprobar insumos antes de registrar; rechazar falta de materia prima; si termina, guardar cantidad elaborada y consumo.
- Implementación: consultar Catalog/Inventory por REST, trazar consumos y desperdicio, distinguir unidades buenas; coordinar movimientos sin duplicarlos en reintentos.

**HU17 / R17 — Almacenes y existencias (`inventory-service`).** Como productor, quiero consultar y controlar existencias por artículo y almacén sin stock negativo.

- Aceptación: consulta por artículo en Materias Primas, Producción y Mostrador; movimientos nunca dejan existencia negativa.
- Implementación: almacén + tipo/ID externo de artículo identifican existencia; proteger egresos concurrentes con transacción local y restricción adecuada.

**HU18 / R18 — Ingresos de inventario (`inventory-service`).** Como productor, quiero registrar ingresos de materia prima o producto terminado para actualizar existencias.

- Aceptación: exigir artículo, almacén, cantidad mayor que cero y motivo; guardar ingreso aumenta existencia en el almacén indicado.
- Implementación: registrar cabecera/detalle, usuario, fecha, referencia y operación idempotente; validar artículo maestro por Catalog.

**HU19 / R19 — Egresos de inventario (`inventory-service`).** Como productor, quiero registrar egresos tras verificar disponibilidad.

- Aceptación: exigir artículo, almacén y cantidad mayor que cero; rechazar cantidad superior a existencia; en caso válido, descontar la cantidad registrada.
- Implementación: conservar motivo y trazabilidad; egresos usados por venta/producción no pueden repetirse por reintento. Ajustes/pérdidas y compras/proveedores pertenecen al alcance técnico S3, sin agregar una nueva HU.

### Soporte, análisis y cierre — Sprint 4

**HU20 / R20 — Contador de visitas (`support-service` + React).** Como usuario, quiero contar visitas por página y ver el total en su pie de página.

- Aceptación: cada página contabiliza visitas; el pie muestra su contador correspondiente.
- Implementación: almacenar ruta lógica, total y última visita; evitar incrementos perdidos con visitas simultáneas.

**HU21 / R21 — Temas de interfaz (React).** Como usuario, quiero elegir al menos tres temas visuales para usar mi apariencia preferida.

- Aceptación: al menos tres opciones; estilo uniforme en las páginas.
- Implementación: tema centralizado en React/CSS/Tailwind, incluidos formularios, navegación y estados; la preferencia puede persistir en LocalStorage. No requiere microservicio.

**HU22 / R22 — Resumen en dashboard (`report-service`).** Como administrador, quiero consultar actividad de ventas, pedidos, producción e inventario.

- Aceptación: el administrador accede al dashboard; se presentan datos de los cuatro dominios.
- Implementación: Report agrega APIs de Sales, Orders, Production e Inventory; mostrar período/frescura de datos y errores parciales sin leer bases directamente.

**HU23 / R23 — Reportes PDF y correo (`report-service`).** Como administrador o vendedor, quiero filtrar reportes, generarlos en PDF y enviarlos por correo.

- Aceptación: mínimo tres reportes parametrizados; los filtros aparecen aplicados al PDF; validar destinatarios y enviar a una o varias direcciones válidas.
- Implementación: reportes mínimos de ventas, pedidos e inventario; datos obtenidos por APIs propietarias, generación reproducible y estado de envío verificable.

### Alcance técnico adicional sin nueva historia

En Sprint 3 también se prevén ajustes de inventario, proveedores y compras, y registro de consumo/costo/desperdicio de producción. Su inclusión procede del backlog técnico y mapeo de casos de uso; no numerar HU24 ni crear requisitos R24. Definir sus contratos y pruebas dentro de Inventory/Production respetando las reglas de stock, trazabilidad y propiedad de datos ya descritas.

## 17. Decisiones de implementación para evitar ambigüedades

Estas son **decisiones técnicas de esta guía**, tomadas para ejecutar las HU oficiales sin cambiar su alcance. Si el código existente ya resuelve alguna de forma equivalente, conservar ese mecanismo y demostrar las mismas garantías; no duplicar infraestructura. Toda diferencia debe quedar registrada con su prueba.

### 17.1 Autenticación y autorización distribuida

1. `security-service` es el único dueño de usuarios, permisos y tokens Sanctum. Los demás servicios no comparten su base ni copian `personal_access_tokens`.
2. React envía `Authorization: Bearer <token>` al Gateway; Nginx conserva ese encabezado. Cada servicio protegido utiliza un middleware Laravel que solicita a Security la **validación del token y permiso requerido** por una API interna. Se agrega a Security un endpoint de introspección interno, inaccesible desde las rutas públicas del Gateway.
3. La llamada interna se autentica con credencial de servicio en variables de entorno Docker, separada del token del usuario. Security devuelve identidad, estado activo y permisos efectivos. Cada servicio comprueba el permiso localmente con esa respuesta. No confiar en encabezados de identidad enviados por el navegador.
4. No cachear una autorización positiva mientras no se haya definido revocación coordinada. Así logout, desactivación y cambios de permisos tienen efecto en la siguiente petición; asumir el costo de la llamada interna para este proyecto académico.
5. Si Security no responde, rechazar la operación protegida con error controlado de dependencia; no permitir acceso por defecto. Probar token válido, inválido, revocado, usuario desactivado, permiso ausente y Security caído.
6. Para llamadas servicio→servicio, enviar credencial interna y, cuando corresponda, el identificador del usuario responsable. El receptor autentica al servicio llamante, comprueba que esté autorizado para ese contrato y audita al usuario externo; nunca toma un `id_usuario` del body como prueba de identidad.

### 17.2 Forma de los contratos y errores

- Versionar los contratos inicialmente como `/api/...` según las rutas ya documentadas; no introducir `/v2` sin migración. JSON UTF-8, fechas ISO 8601 con zona horaria explícita, importes en decimal de precisión fija y cantidades según unidad de medida. Nunca calcular dinero con `float` binario.
- En operaciones de escritura, Laravel valida y calcula importes; el frontend puede mostrar una estimación pero el resultado del servidor manda. Guardar moneda `BOB` o documentar un valor único equivalente en todo el sistema.
- Respuesta de error uniforme propuesta: `{"error":{"code":"CODIGO_ESTABLE","message":"Mensaje legible","details":{}}}`. No exponer trazas ni secretos. `422` validación; `401` identidad; `403` permiso; `404` inexistencia; `409` estado/stock/conflicto; `503` dependencia necesaria indisponible. `504` si vence el tiempo de espera de una dependencia. Confirmar el mapeo en un contrato compartido antes de integrar.
- Las llamadas entre servicios tienen timeout explícito y máximo de reintentos acotado. Solo reintentar automáticamente lecturas o escrituras con clave idempotente. Registrar `correlation_id`, servicio, operación y código sin token ni datos sensibles.
- Toda ruta de escritura crítica recibe `Idempotency-Key` o `operacion_id` estable, persistido con restricción única por servicio y tipo de operación. Repetir la misma clave y payload devuelve el resultado previo; repetirla con payload diferente devuelve `409`.

### 17.3 Estados y transiciones

Los nombres de estado siguientes son la convención operativa propuesta. Si las migraciones existentes ya usan otros nombres, mapearlos sin cambiar el significado. Guardar historial de transición con fecha y responsable.

| Entidad | Estados y transición permitida | Rechazo obligatorio |
|---|---|---|
| Pedido | `REGISTRADO → EN_PREPARACION → LISTO → ENTREGADO`; `REGISTRADO/EN_PREPARACION → CANCELADO` | Entregar antes de `LISTO`, cancelar después de entregar o repetir entrega con otro ID |
| Venta | `BORRADOR → PENDIENTE_STOCK → CONFIRMADA`; `BORRADOR/PENDIENTE_STOCK → CANCELADA`; `CONFIRMADA → ANULADA` con reversión documentada | Confirmar sin egreso de stock en S3, o anular sin tratar stock/pagos relacionados |
| Pago internet | `PENDIENTE → APROBADO` o `PENDIENTE → RECHAZADO`; estados finales inmutables salvo corrección auditada | Acreditar pendiente/rechazado o duplicar callback |
| Producción | `PLANIFICADA → EN_PROCESO → COMPLETADA`; cancelación solo antes de consumos irreversibles o con compensación auditada | Completar sin receta, insumos o movimientos confirmados |
| Recibo | `EMITIDO → ANULADO`; reimpresión registra evento, no crea pago | Emitir para pago inexistente/no confirmado |

El pedido puede saltar a `LISTO` desde `REGISTRADO` **solo si se define y prueba una regla explícita para productos disponibles sin elaboración**. Hasta entonces, usar la secuencia normal. La entrega exige saldo cero confirmado por Payment y existencias verificadas en Mostrador por Inventory; una respuesta de dependencia desconocida no autoriza entregar. Las reglas de cancelación y devolución de pagos deben cerrarse como parte del contrato de anulación antes de habilitar el botón en React.

### 17.4 Venta e inventario sin transacción distribuida

1. Sales crea venta `BORRADOR` con total y snapshots. Al confirmar, fija `operacion_id` y pasa a `PENDIENTE_STOCK` dentro de su transacción local.
2. Sales llama a Inventory para un egreso de Mostrador asociado a `venta_id` y `operacion_id`. Inventory bloquea/actualiza existencias en una transacción local, rechaza stock insuficiente y guarda la clave única con el resultado.
3. Si Inventory confirma, Sales marca `CONFIRMADA`. Si rechaza con `409` por stock, Sales vuelve a `BORRADOR` o marca error recuperable, sin afirmar venta. Si hay timeout, Sales permanece `PENDIENTE_STOCK` y **consulta el resultado por `operacion_id`** antes de reintentar; nunca lanza un segundo descuento con clave nueva.
4. Si Inventory descontó pero Sales no pudo guardar `CONFIRMADA`, la reconciliación vuelve a consultar el egreso y finaliza la venta. Una anulación posterior exige operación inversa idempotente y reglas de pagos/recibos; no borrar el movimiento original.
5. Para cada ítem, registrar el egreso exacto una sola vez. Probar dos confirmaciones simultáneas con stock escaso, doble clic, timeout después del egreso y reinicio entre pasos.

### 17.5 Producción e inventario sin duplicaciones

Production toma snapshot de receta y cantidades, consulta disponibilidad, y registra estado antes de solicitar movimientos. Cada consumo y cada ingreso de unidades buenas lleva `operacion_id` propio y referencia a producción. Inventory es el único que cambia existencias. Si una llamada queda incierta, Production consulta por ID y reanuda; no repite con una clave distinta. El producto terminado ingresa únicamente por unidades buenas. Cualquier desperdicio queda como registro trazable y, si afecta stock, como movimiento de Inventory. No marcar `COMPLETADA` hasta confirmar todos los movimientos requeridos.

### 17.6 Pagos, saldo y recibos

Payment consulta total y estado de la operación en Sales/Orders. Guarda cada pago en transacción local con importe decimal positivo y clave idempotente. Al validar sobrepago, bloquea una fila/resumen local de saldo por `tipo_operacion + id_operacion_externo`, para serializar pagos concurrentes. Una operación con pagos iniciados no puede cambiar su total sin regla explícita de ajuste; de otro modo el saldo pierde significado.

El pago por internet guarda referencia única del proveedor y estado `PENDIENTE`; el callback se valida contra la credencial/firma del proveedor y se aplica una sola vez. Solo `APROBADO` origina un abono. Un pago en efectivo/QR confirmado genera recibo interno con snapshot; anular recibo no borra automáticamente el pago ni modifica saldo. La anulación de pago requiere evento de reversión auditado y recálculo consistente. Probar dos pagos concurrentes que juntos excederían el total.

### 17.7 Rutas preliminares de Sprint 3 y 4

Estas rutas aparecen en el plan detallado y deben respetarse al cerrar los contratos, salvo ajuste documentado antes de crear consumidores:

| Servicio | Rutas base |
|---|---|
| Payment | `/api/pagos`, `/api/pagos/{id}`, `/api/pagos/{id}/anular`, `/api/pagos/resumen/{tipo}/{id}`, `/api/pagos-internet`, `/api/pagos-internet/{id}`, `/api/pagos-internet/{id}/confirmar`, `/api/recibos`, `/api/recibos/{id}`, `/api/recibos/{id}/anular` |
| Inventory | `/api/almacenes`, `/api/existencias`, `/api/ingresos`, `/api/egresos`, `/api/ajustes`, `/api/proveedores`, `/api/compras`, `/api/stock/validar` |
| Production | `/api/producciones`, `/api/producciones/{id}`, `/api/producciones/{id}/completar` |
| Support | `/api/visitas`, `/api/visitas/resumen` |
| Report | `/api/dashboard/resumen`, `/api/reportes/ventas`, `/api/reportes/pedidos`, `/api/reportes/inventario`, `/api/reportes/produccion`, `/api/reportes/{tipo}/pdf`, `/api/reportes/{tipo}/enviar` |

### 17.8 Datos que todavía dependen del entorno

Para conectar una pasarela real se necesitan proveedor elegido, documentación de API, credenciales de prueba, URL de callback, método de firma y reglas de reversión. Para correo se necesitan servidor/proveedor, credenciales, remitente autorizado y entorno de prueba. El despliegue en nube exige destino, dominio, TLS y manejo de secretos. Los tres proveedores/destinos quedan **pendientes por decisión del proyecto**; no bloquean el desarrollo y las pruebas locales de los cuatro sprints.

## 18. Estrategia de desarrollo y pruebas mientras faltan servicios externos

**Decisión:** completar los microservicios, la interfaz y los flujos de los cuatro sprints en Docker local. Separar el código de negocio de tres adaptadores configurables: pasarela de pagos, correo saliente y configuración de despliegue. No introducir servicios externos concretos ni credenciales ficticias en el repositorio.

### Pasarela de pagos de prueba

- Crear una interfaz de integración en `payment-service` con operaciones de iniciar pago, consultar resultado y validar notificación. Usar un adaptador de prueba local configurable que permita respuestas `PENDIENTE`, `APROBADO`, `RECHAZADO`, timeout y notificación repetida.
- El simulador debe pasar por las mismas reglas de persistencia, idempotencia, saldo y recibo que usará un proveedor real. Identificar explícitamente la transacción como `proveedor=simulado`; no mostrarla como cobro real.
- Probar saldo, rechazo, repetición de callback, referencia duplicada, timeout y recuperación. Con ello se puede cerrar la **implementación y prueba funcional local** de HU12; la prueba de integración con una pasarela real queda pendiente.
- Al elegir proveedor, implementar su adaptador y ejecutar pruebas en sandbox oficial y luego en entorno real según corresponda, sin reescribir la lógica de Payment.

### Correo de prueba

- `report-service` genera primero el PDF y guarda/retorna el resultado de generación separado del resultado de envío. Usar transport de correo de prueba que capture mensajes y adjuntos en entorno local, sin enviarlos a destinatarios reales.
- Probar una y varias direcciones válidas, direcciones inválidas, PDF adjunto con filtros correctos, fallo de entrega simulado y reintento controlado. Registrar `SIMULADO` o equivalente en la evidencia.
- Con ello se puede cerrar la **implementación y prueba funcional local** de HU23; el envío a cuentas reales requiere SMTP/proveedor y pruebas de integración posteriores.

### Despliegue de prueba

- Mantener Compose completo para frontend, Gateway, todos los Laravel, PostgreSQL y MySQL; variables por entorno mediante ejemplos sin secretos, volúmenes persistentes y checks de salud. Probar arranque desde cero en un entorno de desarrollo vacío, migraciones, datos iniciales mínimos, reinicio y recuperación.
- Ejecutar pruebas de extremo a extremo solo por el Gateway, incluida indisponibilidad de un servicio, permisos y flujos venta→stock→pago y pedido→producción→entrega.
- Se puede cerrar el **despliegue local reproducible** de Sprint 4. El despliegue en un servidor público, TLS, dominio, copias de seguridad operativas y pruebas del entorno publicado quedan pendientes hasta seleccionar infraestructura.

### Estados de cierre que debe informar el agente

| Elemento | Puede cerrarse con simulación local | Queda pendiente para integración real |
|---|---|---|
| Microservicios S1–S4, UI y Gateway | Sí, con pruebas y evidencia por HU | Verificación posterior en el entorno publicado |
| HU12 pago por internet | Lógica y flujo funcional con proveedor simulado | Sandbox/producción del proveedor elegido |
| HU23 envío de reportes | PDF, validaciones y flujo con correo capturado localmente | Entrega a buzones reales y diagnóstico SMTP/proveedor |
| Infraestructura | Compose, persistencia, salud, regresión local | Servidor, dominio, TLS y operación real |

El informe final debe decir **«cuatro sprints implementados y probados localmente; integraciones externas y despliegue público pendientes»** cuando ese sea el estado. No declarar «proyecto desplegado» ni «pago/correo real verificado» antes de contar con evidencia de esas integraciones.
