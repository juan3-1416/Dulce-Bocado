# Sprint 3 — Plan de desarrollo y pruebas

**Proyecto:** Sistema de información web para la gestión de ventas, pedidos, producción e inventario de Dulce Bocado

**Duración:** una semana, cinco jornadas de ocho horas

**Equipo:** Fabián Cuellar Salvatierra (Product Owner y desarrollador) y Juan Pablo Montoya Salinas (Scrum Master y desarrollador)

**Estado de este archivo:** plan de trabajo compartido. Las tareas y pruebas no se consideran realizadas hasta registrar evidencia de su ejecución.

**Avance verificado al 16-11-2026:** T302 y T308 terminadas; T304, T306, T310 y T311 están en curso. Las otras 8 tareas del backlog figuran por hacer en este archivo. Production ya tiene rutas públicas locales y coordinación probada con Inventory simulado, pero Gateway, los permisos efectivos de Security, la integración real con Inventory y las pruebas PS3 completas siguen pendientes. Los contratos de tipos de almacén, movimientos y unidad para `PRESENTACION` están documentados para revisión conjunta antes de cerrar T306/T310.

**Referencia documental:** [documentación Scrum](Documentacion_Scrum_Dulce_Bocado_FINAL_REGENERADO.docx), apartados 3.1.3, 3.1.5 y 3.4.1–3.4.2; [avance y pruebas del Sprint 2](SPRINT_2_AVANCE_Y_PRUEBAS.md).

## 1. Objetivo y resultado esperado

Implementar los microservicios de **Inventario** y **Producción** para registrar una elaboración a partir de la receta de una presentación, comprobar y descontar sus materias primas, ingresar el producto terminado al almacén interno y trasladarlo después al mostrador. Las existencias deben consultarse por artículo y almacén y nunca quedar negativas.

El incremento se considera funcional cuando un usuario autorizado puede completar ese recorrido desde React a través del API Gateway y las API, y cuando los mismos resultados se verifican en las bases de datos propias de cada servicio. Un traslado al mostrador es una operación posterior a la producción; la elaboración no deposita unidades directamente en el mostrador.

### Historias incluidas

| Historia | Alcance de este sprint | Requisito |
| --- | --- | --- |
| HU17 — Almacenes y existencias | Consultar existencias por artículo y por los almacenes de materias primas, producción y mostrador; impedir stock negativo. | R17 |
| HU18 — Ingresos de inventario | Registrar ingresos de materias primas o productos terminados con artículo, almacén, cantidad positiva, motivo y observaciones. | R18 |
| HU19 — Egresos de inventario | Registrar egresos después de comprobar la existencia disponible. | R19 |
| HU16 — Producción | Consultar la receta, verificar insumos, registrar cantidad elaborada y consumo, e ingresar terminados al almacén interno. | R16 |

**Dependencia existente:** HU9 (recetas) se desarrolló en Catálogo durante el Sprint 2. Este sprint **consume** esa información; no crea otro catálogo de recetas. Catálogo conserva MySQL y los nuevos servicios usan bases PostgreSQL independientes. Con ello se mantiene el requisito del proyecto de utilizar dos gestores de bases de datos.

**Límite del incremento:** no se incorporan pagos, pasarela QR, confirmación de ventas, descuento de stock por venta, ni automatización de pedidos hacia producción. Esas operaciones pertenecen a otros flujos. Sales conserva sus borradores del Sprint 2; este plan no les atribuye control de inventario.

## 2. Punto de partida y preparación

El avance del Sprint 2 registra Security, Gateway, Customer, Catalog, Orders y Sales; Catálogo ofrece presentaciones, materias primas y recetas, incluida la consulta `GET /api/presentaciones/{id}/receta`. Las rutas activas de Producción e Inventario del Sprint 3 usan adaptadores propios para Gateway/Bearer; quedan archivos de vistas y servicios legados como referencia para flujos fuera del incremento. No se debe redirigir indiscriminadamente el proxy relativo `/api` de Vite porque todavía convive con rutas legadas.

Antes de implementar:

1. Integrar la rama del equipo que contiene el cierre del Sprint 2 y comprobar el árbol de trabajo. El informe anterior señala `origin/devFabian` como referencia en ese momento; verificar la rama vigente antes de usarla.
2. Abrir en el repositorio los contratos reales de Catalog, Security y Gateway. Confirmar los nombres y tipos de los campos de receta, unidad de medida, estado de materia prima y presentación. El ejemplo de contrato de la sección 4 es un **formato interno normalizado** para los nuevos servicios, no una afirmación sobre el JSON actual de Catalog.
3. Acordar y versionar los contratos HTTP de Inventario y Producción antes de dividir el trabajo. Registrar cualquier cambio en este archivo y ajustar consumidores y pruebas en el mismo cambio.
4. Crear `.env` locales ignorados por Git, claves de aplicación y credenciales internas distintas por entorno. Añadir los dos servicios y sus bases a Docker Compose sin exponer sus puertos internos al navegador.
5. Preparar datos ficticios trazables: una presentación activa con receta activa, materias primas activas, tres almacenes y existencias iniciales conocidas. No reutilizar identificadores locales como si fueran constantes del proyecto.
6. Hacer una copia verificable de las bases de desarrollo antes de migraciones o pruebas integradas que escriban datos. Aplicar migraciones incrementales; nunca ejecutar `migrate:fresh` ni una suite no aislada contra las bases de desarrollo.

## 3. Responsabilidad de los servicios y reglas de negocio

| Componente | Propiedad y función en el Sprint 3 |
| --- | --- |
| Catalog / MySQL | Fuente de verdad de presentaciones, materias primas y recetas. La receta se vincula a `presentacion_id`. |
| Inventory / PostgreSQL propia | Fuente de verdad de almacenes, saldos y movimientos. Ejecuta ingresos, egresos, traslados y la aplicación atómica de los movimientos de una producción. |
| Production / PostgreSQL propia | Registra la solicitud, estado y resultado de cada elaboración; consulta Catálogo y solicita movimientos a Inventario. No escribe tablas de Inventory ni Catalog. |
| Security | Autentica al usuario y decide permisos. Los nuevos servicios verifican el token y el permiso en el servidor. |
| API Gateway | Punto de entrada del frontend a las rutas públicas. No expone rutas internas ni credenciales entre servicios. |
| React | Muestra saldos, movimientos y producciones; envía solicitudes mediante Gateway con Bearer. No calcula el stock definitivo. |

### Reglas funcionales acordadas para el incremento

1. Los almacenes del flujo son **materias primas**, **producción** (almacén interno de terminados) y **mostrador**. Los insumos se consumen del primero; los terminados ingresan al segundo; el traslado mueve terminados del segundo al tercero.
2. El artículo de inventario se identifica por **tipo e ID de Catalog**: `MATERIA_PRIMA` con `materia_prima_id` o `PRESENTACION` con `presentacion_id`. No se crean claves foráneas entre bases de servicios.
3. La cantidad de cada movimiento debe ser mayor que cero. Las materias primas y los productos terminados conservan la unidad definida por Catalog; dentro de este sprint no se realizan conversiones de unidades. Los cálculos usan decimales exactos, no números de punto flotante. Una referencia inexistente o inactiva se rechaza tras consultar a Catalog; si Catalog no responde, no se modifica el saldo. Un almacén de materias primas solo recibe `MATERIA_PRIMA`, y los de producción y mostrador solo reciben `PRESENTACION`. Una referencia sin fila de existencia tiene saldo cero.
4. Para el cálculo del sprint, la cantidad de cada ingrediente de la receta corresponde a **una unidad de la presentación**. Por tanto, consumo requerido = cantidad de receta × unidades elaboradas. Si el modelo real de Catalog representa un lote con rendimiento distinto, se debe incorporar el rendimiento al contrato y ajustar esta regla y sus pruebas **antes** de registrar producciones.
5. Un ingreso incrementa un único saldo y deja movimiento trazable. Un egreso descuenta un único saldo solamente si hay disponibilidad suficiente. La comprobación y el descuento ocurren en una transacción local con bloqueo o actualización condicional que resista solicitudes concurrentes.
6. El traslado entre almacenes registra salida y entrada vinculadas en **una transacción de Inventory**; si falla cualquiera de las dos, no se confirma ninguna. No se representa como dos solicitudes públicas independientes.
7. Al producir, Inventory descuenta **todos** los insumos y acredita **todos** los terminados en una sola transacción local. Si falta un insumo o hay un artículo/almacén inválido, no aplica ningún movimiento ni confirma la producción.
8. Production conserva una referencia estable a la receta utilizada y un resumen de ingredientes/cantidades aplicadas para que una edición posterior de Catalog no cambie el historial. La receta sigue siendo propiedad de Catalog.
9. Las escrituras aceptan una clave de idempotencia. Repetir la misma clave con el mismo contenido devuelve el mismo resultado sin movimientos adicionales; reutilizarla con contenido distinto se rechaza. La operación interna de Inventory también tiene un ID único de producción.
10. Production registra primero la solicitud local; después pide a Inventory la aplicación de movimientos. Una respuesta definitiva confirma o rechaza la operación. Si se pierde la respuesta, conserva estado **EN_PROCESO**, consulta/reintenta con el mismo ID y solo marca **COMPLETADA** cuando confirma el asiento de Inventory. No presenta una producción incierta como terminada.

## 4. Contratos HTTP de trabajo

Estos contratos son la **propuesta ejecutable del Sprint 3** para ambos desarrolladores. Al confrontarlos con el repositorio, se ajustan aquí antes de codificar. Las rutas públicas pasan por Gateway; las internas solo son accesibles desde la red de servicios y requieren credencial interna y contexto de actor validado.

| Servicio | Método y ruta pública | Operación | Permiso propuesto |
| --- | --- | --- | --- |
| Inventory | `GET /api/almacenes` | Listar almacenes. | `inventario.ver` |
| Inventory | `GET /api/existencias?almacen_id=&tipo_articulo=&articulo_id=` | Consultar saldos; filtros opcionales según el contrato final. | `inventario.ver` |
| Inventory | `GET /api/movimientos` | Consultar trazabilidad con filtros y paginación. | `inventario.ver` |
| Inventory | `POST /api/ingresos` | Ingreso manual. | `inventario.ingresar` |
| Inventory | `POST /api/egresos` | Egreso manual. | `inventario.egresar` |
| Inventory | `POST /api/traslados` | Traslado atómico entre almacenes. | `inventario.trasladar` |
| Production | `GET /api/producciones` y `GET /api/producciones/{id}` | Listar y consultar producciones. | `produccion.ver` |
| Production | `POST /api/producciones` | Solicitar producción. | `produccion.crear` |

**Contrato de lectura propuesto para T303/T304 (pendiente de revisión con Inventory):** `GET /api/almacenes` responde `{ "almacenes": [{ "id_almacen": 1, "tipo": "MATERIAS_PRIMAS", "nombre": "Materias primas", "activo": true }] }`. Los tipos de almacén son `MATERIAS_PRIMAS`, `PRODUCCION` y `MOSTRADOR`; los IDs son datos, no constantes de interfaz. `GET /api/existencias?almacen_id=&tipo_articulo=&articulo_id=` responde `{ "existencias": [{ "almacen_id": 1, "tipo_articulo": "MATERIA_PRIMA", "articulo_id": 3, "cantidad": "2.000", "unidad": "g" }] }`. `cantidad` viaja como texto decimal de hasta tres posiciones; `PRESENTACION` usa `unidad`. El listado de saldos no necesita nombres duplicados de Catalog. La ausencia de fila equivale a saldo cero. T304 usa estas dos lecturas por Gateway/Bearer y conserva las vistas existentes; no crea almacenes ni traslada stock, operaciones fuera de T304. Si Inventory publica otro nombre o formato, ajustar este contrato y ambas partes antes de integrar.

T304 consulta almacenes y existencias mediante `inventarioConsultaService.js`. T306 reemplazó las rutas activas de Ingresos y Egresos del monolito por un formulario e historial de movimientos que usan el mismo adaptador por Gateway/Bearer; añadió Traslados. Las vistas legadas siguen en el repositorio como referencia, sin rutas activas. Los permisos propuestos `inventario.ver`, `inventario.ingresar`, `inventario.egresar` e `inventario.trasladar` deben crearse/asignarse en Security durante T313. Hasta que Inventory y Gateway publiquen las rutas, la compilación no acredita consultas ni escrituras reales de stock.

**Contrato interno de Catalog:** Production consulta la receta de `presentacion_id` mediante el endpoint ya implementado y un adaptador que normaliza, como mínimo, `presentacion_id`, vigencia de presentación y receta, y `ingredientes: [{ materia_prima_id, cantidad_por_unidad, unidad }]`. Se rechazan recetas vacías, ingredientes inactivos, cantidades no positivas o unidades incompatibles. El mecanismo de autenticación interna real de Catalog se verificó antes de implementar el adaptador.

**Contrato real comprobado en código el 16-11-2026:** `GET /api/presentaciones/{id}/receta` devuelve `{receta: {id_receta, presentacion_id, estado, presentacion: {presentacion_id, disponible, producto: {estado}}, detalles: [{id_materia_prima, cantidad, materia_prima: {id_materia_prima, unidad_medida, estado}}]}}`. Los decimales `cantidad` se serializan como texto con tres posiciones. El acceso interno existente usa `X-Internal-Service-Key` con `CATALOG_INTERNAL_KEY` y `X-Actor-User-Id`; Production configura `CATALOGO_SERVICE_KEY` con ese valor local. El adaptador de T308 valida esos campos y normaliza los ingredientes sin confiar en cantidades enviadas por React. Catalog no guarda rendimiento de lote: se mantiene la regla explícita de una receta por unidad de presentación. Tampoco guarda unidad de medida de la presentación: para existencias de tipo `PRESENTACION` el contrato del Sprint 3 usará `unidad`, mientras cada materia prima conserva su `unidad_medida` de Catalog. Esta precisión debe revisarse con Inventory antes de integrar T310.

**Contrato interno de Inventory:** `POST /internal/producciones/aplicar` recibe `operacion_id`, `presentacion_id`, `cantidad_producida`, almacén de insumos, almacén interno y el detalle calculado de materias primas. Inventory valida, bloquea los saldos pertinentes, aplica débitos/crédito y guarda el resultado idempotente en una transacción. `GET /internal/producciones/{operacion_id}` permite conciliar una respuesta perdida. Ninguna de estas rutas se publica en Gateway.

**Propuesta concreta para T306/T310, pendiente de cotejar con Inventory:** las escrituras manuales públicas reciben `Idempotency-Key` y JSON. `POST /api/ingresos` y `POST /api/egresos` usan `{tipo_articulo, articulo_id, almacen_id, cantidad, motivo, observaciones?}`; `POST /api/traslados` usa `{tipo_articulo: "PRESENTACION", articulo_id, almacen_origen_id, almacen_destino_id, cantidad, motivo, observaciones?}`. `cantidad` es texto decimal de tres posiciones como máximo. `GET /api/movimientos?tipo=` devuelve `{movimientos: [{id_movimiento, tipo, tipo_articulo, articulo_id, cantidad, unidad, motivo, almacen_origen_id?, almacen_destino_id?, created_at}]}` para que React muestre el historial. Para producción, `POST /internal/producciones/aplicar` recibe `{operacion_id, presentacion_id, receta_id, cantidad_producida, almacen_insumos_tipo: "MATERIAS_PRIMAS", almacen_terminados_tipo: "PRODUCCION", ingredientes: [{materia_prima_id, cantidad, unidad}]}` y los encabezados `X-Internal-Service-Key` y `X-Actor-User-Id`; Inventory resuelve los IDs reales de almacén por tipo. Una aplicación confirmada responde `200 {operacion_id, estado: "APLICADA"}` y `GET /internal/producciones/{operacion_id}` responde lo mismo, `404` si no existe aún, o un rechazo definitivo con código estable. Production nunca usa IDs de almacén fijos ni repite con un `operacion_id` nuevo tras una respuesta incierta. El otro desarrollador debe confirmar nombres, estados y errores antes de integrar servicios reales; ajustar ambos consumidores en el mismo cambio si su implementación difiere.

**Permisos y configuración:** crear un seeder idempotente para los permisos propuestos y asignarlos a Administrador y, según su función, a Producción. Comprobar el permiso efectivo del usuario después del seeder. En instalaciones existentes no ejecutar el `db:seed` completo de Security sin revisar sus variables, porque el seeder del administrador puede actualizar sus credenciales. Las claves internas de Production, Inventory, Catalog y Security deben coincidir con la configuración de sus emisores/receptores, pero sus valores no se registran en Git ni en este documento.

**Cuerpo mínimo de escritura manual:** tipo de artículo, ID de artículo en Catalog, almacén, cantidad, motivo y observaciones opcionales. Un traslado añade almacén de origen y destino. Una producción pública recibe `presentacion_id`, `cantidad` y observaciones opcionales; el servidor obtiene la receta y calcula los insumos, sin aceptar cantidades de insumo enviadas por React como autoridad.

**Respuestas:** `401` sin autenticación, `403` sin permiso, `422` por datos inválidos, `404` para recurso inexistente, `409` por stock insuficiente o reutilización conflictiva de clave, y `503` si una dependencia indispensable no responde. Los cuerpos de error deben contener un código estable y un mensaje entendible. Para una respuesta de Inventory incierta tras un timeout, Production devuelve un estado consultable **EN_PROCESO** en vez de afirmar éxito o repetir la operación con una clave nueva. Los códigos de éxito y los nombres finales de los campos se fijan en pruebas de contrato compartidas.

## 5. Datos y consistencia

**Inventory:** `almacen` (ID, nombre/tipo, activo), `existencia` (almacén, tipo e ID de artículo, cantidad), `movimiento` (tipo, artículo, origen/destino cuando proceda, cantidad, motivo, referencia, actor, fecha) y registro de operaciones idempotentes. La combinación almacén + tipo + artículo es única. Las restricciones de base y el servicio impiden cantidades negativas. Toda escritura conserva fecha, actor y referencia para auditoría.

**Production:** `produccion` (ID, operación única, presentación, cantidad, estado, referencia de receta y snapshot de consumo, actor, fechas y observaciones) y registro de la respuesta idempotente. Las transiciones permitidas son `EN_PROCESO → COMPLETADA` o `EN_PROCESO → RECHAZADA`; una conciliación puede resolver `EN_PROCESO` tras un fallo de comunicación. Un registro `RECHAZADA` describe el intento y no acredita unidades elaboradas.

Los IDs de Catalog se almacenan como referencias externas, sin replicar el catálogo completo. No se hacen escrituras directas en otras bases. La confirmación entre Production e Inventory se obtiene mediante operación idempotente y conciliación, no mediante una transacción SQL entre microservicios.

## 6. Sprint Backlog y coordinación

Capacidad: **80 horas** entre dos desarrolladores; **70 horas** asignadas a tareas (**35 cada uno**) y **10 horas** reservadas para eventos Scrum y ajustes. Los tiempos son estimaciones de planificación, no horas ejecutadas.

| ID | HU | Tarea | Responsable | h | Estado |
| --- | --- | --- | --- | ---: | --- |
| T301 | HU17–HU19 | Preparar inventory-service, base de datos y migraciones | Juan Pablo | 5 | Por hacer |
| T302 | HU16 | Preparar production-service, base de datos y modelo de producción | Fabián | 5 | Terminada |
| T303 | HU17 | Implementar almacenes y consulta de existencias por artículo y almacén | Juan Pablo | 5 | Por hacer |
| T304 | HU17 | Construir interfaz de almacenes y consulta de existencias | Fabián | 5 | En curso |
| T305 | HU18 | Implementar ingresos con cantidad positiva y actualización de existencias | Juan Pablo | 5 | Por hacer |
| T306 | HU18–HU19 | Construir interfaz de ingresos, egresos y traslados | Fabián | 4 | En curso |
| T307 | HU19 | Implementar egresos con validación atómica de stock disponible | Juan Pablo | 6 | Por hacer |
| T308 | HU16 | Integrar consulta REST de presentaciones y recetas del Catálogo | Fabián | 5 | Terminada |
| T309 | HU17–HU19 | Implementar traslado del almacén interno al mostrador mediante movimientos vinculados | Juan Pablo | 5 | Por hacer |
| T310 | HU16 | Registrar producción y coordinar consumo de insumos e ingreso de terminados | Fabián | 7 | En curso |
| T311 | HU16 | Construir interfaz de registro y consulta de producción | Fabián | 5 | En curso |
| T312 | HU17–HU19 | Probar reglas de stock, movimientos y traslados en Inventario | Juan Pablo | 5 | Por hacer |
| T313 | HU16–HU19 | Configurar rutas del Gateway, permisos y contenedores de integración | Juan Pablo | 4 | Por hacer |
| T314 | HU16–HU19 | Probar el flujo completo, los rechazos y los reintentos entre servicios | Fabián | 4 | Por hacer |

**Orden de integración:** acordar contratos → levantar servicios y migraciones → almacenes/saldos → ingresos/egresos/traslados → adaptador de receta → producción → interfaces → rutas y permisos → pruebas completas. Las tareas de ambos pueden avanzar en paralelo usando contratos y respuestas de prueba acordados; el código de integración sustituye esas respuestas por servicios reales antes del cierre.

**Regla de trabajo compartido:** cada tarea pasa por `Por hacer → En curso → En revisión → Terminada`. Actualizar su estado en la tabla y anotar tiempo efectivo, rama/commit y prueba asociada en la bitácora siguiente. Si un cambio modifica un contrato, avisar al otro desarrollador y actualizar la sección 4 antes de integrar. Mantener una sola rama de integración acordada, revisar los cambios del compañero y resolver conflictos antes de probar el conjunto.

| Fecha | Tarea | Responsable | h reales acumuladas | Rama / commit | Evidencia o prueba | Estado |
| --- | --- | --- | ---: | --- | --- | --- |
| 16-11-2026 | T302 | Fabián | Por registrar | `devFabian` / `6bc5997` | Compose validó; `production-db` y `production-service` saludables. `php artisan migrate --force` aplicó la migración solo en `dulce_production`; conteo inicial `produccion/produccion_idempotencia = 0/0`. No se modificaron las bases de Sprint 2. | Terminada |
| 16-11-2026 | T308 | Fabián | Por registrar | `devFabian` / `6bc5997` | Adaptador interno Production → Catalog con validación de receta, vigencia, unidades y decimales. Suite aislada: 3 pruebas, 6 aserciones aprobadas. Consulta real de presentación ficticia #2: receta #1, materia prima #1, `2.000 g` por unidad; sin escritura. | Terminada |
| 16-11-2026 | T304 | Fabián | Por registrar | `devFabian` | Se reutilizaron las vistas de Almacenes y Existencias con un adaptador separado para Gateway/Bearer; filtros por tipo e ID, carga, error y reintento. `npm run build`: 119 módulos; `oxlint`: 0 errores y 2 advertencias de efectos. Pendiente consulta real porque Inventory y la ruta de Gateway aún no están publicados. | En curso |
| 16-11-2026 | T306 | Fabián | Por registrar | `devFabian` | Formulario e historial unificados para ingreso, egreso y traslado; las URL antiguas de creación/detalle redirigen a la vista nueva. Bearer, permisos propuestos e `Idempotency-Key` por contenido, con reintento de la misma solicitud. Build frontend: 109 módulos; `oxlint`: 0 errores y 1 advertencia de efecto. Pendiente API real de Inventory y prueba visual. | En curso |
| 16-11-2026 | T310 | Fabián | Por registrar | `devFabian` | Production crea solicitud `EN_PROCESO` y snapshot decimal, llama a Inventory con ID estable y concilia respuesta incierta. Rutas y permisos locales registrados. Suite aislada SQLite: 8 pruebas/38 aserciones; `dulce_production` permaneció `0/0`. Pendiente Inventory real, Security/Gateway y concurrencia PostgreSQL. | En curso |
| 16-11-2026 | T311 | Fabián | Por registrar | `devFabian` | Listado con filtro, paginación y detalle de estados; formulario selecciona receta activa de Catalog y envía solo presentación, cantidad y observaciones a Production. La clave idempotente se conserva por usuario en el navegador para conciliar reintentos; `EN_PROCESO` nunca se muestra como terminado. Build frontend: 106 módulos; `oxlint`: 0 errores y 1 advertencia de efecto. Pendiente Gateway, permisos `produccion.ver`/`produccion.crear`/`recetas.ver`, Inventory real y recorrido visual PS3-16. | En curso |

### Distribución orientativa de la semana

| Jornada | Foco | Salida verificable esperada |
| --- | --- | --- |
| 1 | Contratos, esquema, servicios y entornos. T301, T302; arranque de T303 y T308. | Compose válido, migraciones propias y contrato de receta comprobado. |
| 2 | Existencias, ingresos y pantallas iniciales. T303–T305 y T304. | Consulta de saldos e ingreso manual por API y React. |
| 3 | Egresos, traslados y adaptación de receta. T306–T309. | Rechazo de stock insuficiente y traslado atómico al mostrador. |
| 4 | Producción, interfaz, Gateway y permisos. T310, T311, T313. | Flujo de elaboración accesible con autorización. |
| 5 | Suites, integración, reintentos, persistencia y revisión. T312, T314. | Evidencia PS3 registrada y demostración del incremento. |

En la Daily Meeting de cada jornada registrar: fecha, asistentes, avance comprobable desde la reunión anterior, trabajo siguiente, impedimento y ajuste del Sprint Backlog. El Scrumboard debe reflejar el estado observado, no el calendario previsto de esta tabla.

### Arranque y verificación de integración

Crear overlays Compose para Inventory y Production con la convención del repositorio (`docker-compose.sprint3.inventory.yml` y `docker-compose.sprint3.production.yml`, si se conserva la nomenclatura de Sprint 2). Primero ejecutar `docker compose` con los archivos base, Sprint 1, los servicios requeridos del Sprint 2 y ambos overlays nuevos usando `config --services`; después levantar **exactamente esa misma combinación** con `up -d --build`. Verificar salud, nombre de las bases y que Gateway enrute las rutas públicas al servicio correcto. Aplicar `php artisan migrate --force` dentro de cada servicio nuevo sobre su propia base y ejecutar solo el seeder de permisos necesario en Security.

Antes de una prueba que escriba, registrar el conteo inicial de saldos, movimientos y producciones. Tras la prueba, contrastar los IDs y cantidades por API y SQL. Las suites automatizadas se ejecutan con configuración aislada y se compara el conteo de las bases de desarrollo antes y después. Reiniciar contenedores **sin borrar volúmenes** para PS3-17. Documentar en el README de cada servicio variables de entorno, migraciones, endpoints públicos/internos, permisos, errores y procedimiento de prueba; no copiar valores secretos ni ejemplos con credenciales reales.

## 7. Plan de pruebas y evidencia

Cada caso se ejecuta en una base de prueba aislada y, cuando corresponda, también contra la integración real con PostgreSQL/MySQL. Registrar **fecha, ambiente, commit, datos de entrada, respuesta, consulta de persistencia y resultado**. No marcar “Aprobada” una prueba preparada pero no ejecutada.

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| PS3-01 | Levantar Compose conjunto y consultar salud de Gateway, Catalog, Inventory y Production. | Servicios disponibles y migraciones aplicadas en las bases correctas. |
| PS3-02 | Consultar almacenes y existencias con/sin filtros. | Se muestra el saldo correcto por artículo y almacén; no se mezclan referencias. |
| PS3-03 | Ingresar materia prima con cantidad válida. | Se crea movimiento y aumenta solo su saldo de materias primas. |
| PS3-04 | Ingresar con cantidad cero/negativa o artículo/almacén inválido. | `422` o `404` según contrato; no cambia ningún saldo. |
| PS3-05 | Egresar una cantidad disponible. | Se crea movimiento y disminuye exactamente el saldo solicitado. |
| PS3-06 | Egresar más de lo disponible, incluidas dos solicitudes concurrentes. | Se rechaza lo que exceda el saldo; nunca aparece stock negativo. |
| PS3-07 | Trasladar terminados del almacén interno al mostrador. | Origen disminuye y destino aumenta por la misma cantidad; movimientos vinculados. |
| PS3-08 | Fallar un traslado o reintentar la misma clave. | No hay traslado parcial ni duplicado. |
| PS3-09 | Producir varias unidades con receta válida e insumos suficientes. | Consumo = receta por unidad × cantidad; se acredita el terminado solo en almacén interno. |
| PS3-10 | Producir con una materia prima insuficiente. | Se rechaza la producción; saldos y movimientos permanecen iguales. |
| PS3-11 | Solicitar producción sin receta vigente, con ingrediente inactivo o dato inválido. | Error controlado; no se aplican movimientos. |
| PS3-12 | Repetir producción con igual clave y cuerpo; repetir la clave con otro cuerpo. | Mismo resultado sin duplicados; el segundo caso devuelve conflicto. |
| PS3-13 | Perder la respuesta de Inventory después de aplicar la operación. | Production queda consultable EN_PROCESO y concilia el mismo ID hasta confirmar una sola vez. |
| PS3-14 | Detener Catalog, Inventory o Security durante una operación. | Error/estado controlado; no se muestra producción completada sin confirmación. |
| PS3-15 | Acceder sin token y con usuario sin permisos. | `401`/`403` según el caso; rutas internas no disponibles desde Gateway. |
| PS3-16 | Recorrer desde React los saldos, ingreso, egreso, producción y traslado. | Todas las llamadas públicas pasan por Gateway con Bearer; la vista refleja los datos persistidos. |
| PS3-17 | Reiniciar servicios y bases sin eliminar volúmenes. | Saldos, movimientos, producciones e idempotencia se conservan. |
| PS3-18 | Ejecutar suites aisladas y verificar conteos de desarrollo antes/después. | Pruebas pasan sin migrar ni vaciar bases de desarrollo. |
| PS3-19 | Lanzar dos producciones simultáneas que compiten por el último insumo disponible. | Solo se confirma la cantidad que puede cubrirse; no hay saldos negativos ni terminado sin consumo. |

**Comprobaciones de base:** comparar saldos con la suma de movimientos por artículo/almacén; comprobar que ninguna existencia es negativa; buscar operaciones duplicadas por clave; confirmar que cada producción completada tiene una aplicación de Inventory y que cada traslado tiene ambos movimientos vinculados. Una prueba de interfaz no sustituye estas comprobaciones.

**Aislamiento de pruebas:** las suites locales pueden usar SQLite en memoria si el servicio lo admite, pero deben impedir explícitamente que `RefreshDatabase` migre una conexión PostgreSQL de desarrollo. Las restricciones específicas y la concurrencia se verifican además en PostgreSQL real. Catalog se prueba mediante contrato y en la integración real con MySQL. No utilizar datos del monolito como prueba del nuevo inventario.

### Registro de resultados

Copiar una fila por ejecución. Mantener los fallos y la evidencia de su corrección; no sobrescribir el primer resultado.

| Fecha/hora | Caso | Commit / ambiente | Datos y acción | Respuesta y verificación de base | Resultado | Responsable |
| --- | --- | --- | --- | --- | --- | --- |
| 16-11-2026 | T302, comprobación técnica previa a PS3-01 | `devFabian`, Docker local | Levantar solo Production/PostgreSQL y migrar la base nueva | Ambos contenedores saludables; migración `[1] Ran`; tablas de negocio `0/0`. PS3-01 completo espera Gateway e Inventory. | Aprobada para T302 | Fabián |
| 16-11-2026 | T308, contrato previo a PS3-09–11 | `devFabian`, Docker local | Suite aislada y GET interno de receta para presentación ficticia #2 | 3 pruebas/6 aserciones; respuesta real normalizada: receta #1, ingrediente #1, `2.000 g` por unidad. `dulce_production` siguió `0/0`. No acredita aún producción ni descuento de insumos. | Aprobada para T308 | Fabián |
| 16-11-2026 | T304, compilación previa a PS3-16 | `devFabian`, frontend local | Adaptación de dos vistas reutilizadas a consultas Gateway/Bearer | Build: 119 módulos; análisis estático: 0 errores. Sin Inventory disponible, no se ejecutó la consulta real ni la prueba visual PS3-16. | Parcial, pendiente integración | Fabián |
| 16-11-2026 | T306, compilación previa a PS3-03–08 y PS3-16 | `devFabian`, frontend local | Formularios de ingreso, egreso y traslado contra el contrato propuesto | Build: 109 módulos; análisis estático: 0 errores. Sin Inventory real no se registraron movimientos ni se ejecutó PS3-16. | Parcial, pendiente integración | Fabián |
| 16-11-2026 | T310, pruebas aisladas previas a PS3-09–14 | `devFabian`, Docker local | Consumir receta simulada y responder a aplicación, rechazo y pérdida de respuesta de Inventory simulado | 8 pruebas/38 aserciones; 0 registros en PostgreSQL local antes y después. No acredita stock real ni concurrencia de PS3-19. | Parcial, pendiente integración | Fabián |
| 16-11-2026 | T311, compilación previa a PS3-16 | `devFabian`, frontend local | Reemplazar listado y formulario legados por rutas de Production, consulta de recetas de Catalog y reintento con clave estable | Build: 106 módulos; análisis estático: 0 errores, 1 advertencia de efecto. Sin Gateway/Inventory/permisos nuevos no se registró una producción real ni se ejecutó PS3-16. | Parcial, pendiente integración | Fabián |

Si el equipo cambia una regla, un endpoint o una estimación, registrar la decisión antes de modificar la implementación:

| Fecha | Decisión o cambio | Motivo | Secciones, tareas y pruebas afectadas | Acordado por |
| --- | --- | --- | --- | --- |
| 16-11-2026 | Se confirmó el JSON real de Catalog y la ausencia de rendimiento y unidad de medida en Presentación. Para `PRESENTACION` se propone `unidad`; los decimales de ingredientes se conservan como texto hasta operar con precisión decimal. | Evitar suposiciones que alteren consumo o saldos al integrar Production e Inventory. | Contrato de Catalog, T308–T310, PS3-09–11 | Propuesta Fabián; revisión pendiente con Juan Pablo |
| 16-11-2026 | T304 propone `almacenes` y `existencias` como arreglos con los campos detallados en la sección 4; las vistas solo consultan saldos. | Evitar rutas legadas, IDs fijos y acciones de stock fuera de T304. | T303–T304, T306, T309, T313, PS3-02 y PS3-16 | Propuesta Fabián; revisión pendiente con Juan Pablo |
| 16-11-2026 | T306/T310 implementan la propuesta detallada de movimientos y aplicación interna, aún sin Inventory publicado. | Mantener una única operación de Inventory por producción, reintentos con el mismo ID y formularios compatibles con el contrato HTTP. | T305–T310, T313–T314, PS3-03–16 | Propuesta Fabián; revisión pendiente con Juan Pablo |

## 8. Criterio de cierre y documentación Scrum

Una historia está terminada cuando su API y su interfaz, si aplica, cumplen los criterios de aceptación; las pruebas automatizadas y la integración real pasan; la autorización, los errores y la persistencia están verificados; el código fue revisado; y el resultado quedó registrado con evidencia. El Sprint Goal se comprueba con PS3-02, PS3-03, PS3-05, PS3-07, PS3-09, PS3-10, PS3-13, PS3-16 y PS3-17, además de la auditoría de movimientos.

Al cerrar cada jornada, actualizar Daily Meeting, Scrumboard y horas efectivas. Para la documentación formal, este archivo aportará datos verificables a **3.4.3 Diagramas de clase e interfaces**, **3.4.4 Daily Meeting**, **3.4.5 Scrumboard**, **3.4.6 Product Increment**, **3.4.7 Burndown y burnup**, **3.4.8 Sprint Review** y **3.4.9 Sprint Retrospective**. Los diagramas y capturas deberán representar la implementación real; la curva se calculará con el avance registrado y no con la distribución orientativa de la sección 6.

En la Sprint Review demostrar el flujo completo con datos ficticios y contrastarlo con el Sprint Goal. En la retrospectiva registrar acciones concretas sobre colaboración, integración y pruebas, con responsable y momento de verificación. Los resultados y las cifras se incorporan solo después de ejecutarlos.
