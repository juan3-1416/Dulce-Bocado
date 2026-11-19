# Sprint 3 — Consolidación de avance y evidencia para el cierre

**Proyecto:** Dulce Bocado  
**Fecha de actualización:** 17 de noviembre de 2026  
**Equipo:** Juan Pablo Montoya Salinas / Fabián Cuellar Salvatierra  
**Estado al 17-11-2026:** tareas T301–T314 implementadas en código; pruebas aisladas aprobadas. La aceptación integral, la evidencia de persistencia/concurrencia y el cierre Scrum siguen pendientes. **Este archivo es una base de documentación, no un acta de Sprint Review ni una declaración de Sprint terminado.**

### Cómo leer la evidencia

- **Implementada:** existe código en la rama integrada. No equivale por sí solo a una historia aceptada.
- **Prueba aislada:** suite con SQLite en memoria y dobles HTTP; no demuestra comunicación real ni comportamiento concurrente en PostgreSQL.
- **Prueba de integración reportada:** resultado anotado por el desarrollador en este archivo. Se conserva como antecedente; debe repetirse con fecha, commit, datos y comprobación de base para el cierre oficial.
- **Cierre pendiente:** falta ejecutar y registrar los criterios PS3 aplicables, actualizar el Sprint Backlog y realizar Sprint Review y Retrospective.

**Fuentes de contraste:** `Docs/SPRINT_3_PLAN_DESARROLLO_Y_PRUEBAS.md` (Sprint Backlog, PS3-01–PS3-19 y Definition of Done), `Docs/RESUMEN_AVANCE_SPRINT_3_FABIAN.md` (trabajo de Production y frontend al 16-11-2026), código y commits de `dev-jp` incorporados a `devFabian` por avance rápido el 17-11-2026. El plan conserva estados anteriores a esa integración y requiere conciliación; no usar su columna «Por hacer» como estado actual sin revisarla.

---

## 1. Objetivo del Sprint 3

El Sprint 3 se enfocó en completar el flujo de **Inventario y Producción**, integrando los nuevos microservicios con Security, Catalog, Inventory, Production, API Gateway y el frontend React.

El objetivo funcional es permitir el siguiente recorrido:

1. Registrar o consultar materias primas.
2. Ingresar existencias al almacén de materias primas.
3. Consultar existencias.
4. Registrar egresos manuales.
5. Registrar una producción.
6. Obtener la receta desde Catalog.
7. Calcular el consumo de insumos.
8. Aplicar el consumo de materias primas en Inventory.
9. Ingresar automáticamente el producto terminado al almacén `PRODUCCION`.
10. Trasladar productos terminados desde `PRODUCCION` hacia `MOSTRADOR`.
11. Mantener trazabilidad, idempotencia, permisos y consistencia de stock.

---

## 2. Estado general de las tareas

| Tarea | Entregable en código | Evidencia disponible | Estado para documentación oficial |
|---|---|---|---|
| T301 | Base y esquema de Inventory | Migración y Compose presentes; suite aislada de Inventory. | Implementada; verificar migración y persistencia PostgreSQL. |
| T302 | Base y entorno de Production | Compose y migración; evidencia previa en el plan. | Implementada; integrar en PS3-01/17. |
| T303 | Almacenes, existencias y autorización | Código, pruebas aisladas y consulta manual de almacenes reportada. | Implementada; completar PS3-02 y autorización real. |
| T304 | Vista React de almacenes y existencias | Componentes presentes; build aprobado. | Implementada; falta PS3-16 visual. |
| T305 | Ingresos de inventario | Servicio, ruta y pruebas aisladas. | Implementada; faltan PS3-03/04 con PostgreSQL. |
| T306 | Vista React de movimientos | Componentes presentes; build aprobado. | Implementada; falta PS3-16 visual. |
| T307 | Egresos de inventario | Servicio, ruta y pruebas aisladas. | Implementada; faltan PS3-05/06 con PostgreSQL y concurrencia. |
| T308 | Production → Catalog | Adaptador y evidencia previa de consulta real de receta. | Implementada; verificar dentro de PS3-09/11. |
| T309 | Traslados | Servicio, ruta y pruebas aisladas. | Implementada; faltan PS3-07/08 con PostgreSQL. |
| T310 | Production → Inventory | Coordinación, contrato y pruebas aisladas; conectividad y clave manualmente reportadas. | Implementada; falta flujo real PS3-09–14. |
| T311 | Vista React de Producción | Componentes presentes; build aprobado. | Implementada; falta PS3-16 visual. |
| T312 | Validaciones de Inventory | 51 pruebas aisladas, 246 aserciones aprobadas en esta consolidación. | Prueba aislada aprobada; faltan restricciones/concurrencia reales. |
| T313 | Gateway, permisos e integración | Commit `e016d72`; pruebas manuales parciales reportadas en secciones 12–15. | Implementada; falta aceptación integral PS3-01/15/16. |
| T314 | Conciliación y pruebas de Production | 13 pruebas aisladas, 79 aserciones aprobadas en esta consolidación. | Prueba aislada aprobada; faltan PS3-10–14/17 reales. |

**Criterio de estado:** «Implementada» describe el código entregado. Ninguna fila acredita por sí sola el Definition of Done de las historias HU16–HU19 ni el cierre del Sprint Goal.

---

## 3. Trabajo realizado en Inventory

### 3.1 Estructura del microservicio

Se trabajó sobre `inventory-service` con PostgreSQL independiente.

Se crearon y utilizaron las siguientes tablas principales:

1. `almacen`
2. `existencia`
3. `movimiento`
4. `inventario_idempotencia`
5. `produccion_operacion`

Se mantuvo la arquitectura de microservicios sin claves foráneas entre bases de datos externas.

### 3.2 Almacenes definidos

| ID | Nombre | Tipo |
|---|---|---|
| 1 | Materias primas | `MATERIAS_PRIMAS` |
| 2 | Producción | `PRODUCCION` |
| 3 | Mostrador | `MOSTRADOR` |

Estos almacenes fueron comprobados posteriormente mediante Gateway y usuario autenticado.

### 3.3 Tipos de artículo

Inventory maneja dos tipos:

- `MATERIA_PRIMA`
- `PRESENTACION`

Las referencias se guardan por tipo de artículo e ID proveniente de Catalog. No se agregaron FK entre Inventory y Catalog.

### 3.4 Consulta de almacenes y existencias

Se implementaron endpoints protegidos para:

- consultar almacenes;
- consultar existencias;
- consultar movimientos.

Permiso requerido:

```text
inventario.ver
```

### 3.5 Ingresos

Se implementó el registro de ingresos con:

- validación de artículo;
- validación de almacén;
- cantidad positiva;
- consulta a Catalog;
- cálculo decimal exacto;
- transacción local;
- bloqueo del saldo cuando corresponde;
- trazabilidad mediante movimiento;
- idempotencia.

Permiso requerido:

```text
inventario.ingresar
```

### 3.6 Egresos

Se implementó el egreso garantizando que:

- el stock nunca quede negativo;
- la operación sea transaccional;
- el saldo insuficiente devuelva un error definitivo;
- el resultado sea idempotente.

Permiso requerido:

```text
inventario.egresar
```

El rechazo por stock insuficiente utiliza:

```text
409 STOCK_INSUFICIENTE
```

### 3.7 Traslados

Se implementaron traslados de productos terminados con la regla:

```text
PRODUCCION → MOSTRADOR
```

Características:

- solo aplica a `PRESENTACION`;
- cantidad entera;
- transacción atómica;
- no se modifica el destino si el origen no tiene stock;
- idempotencia;
- validación con Catalog;
- respuesta exitosa HTTP 201.

Permiso requerido:

```text
inventario.trasladar
```

---

## 4. Contrato interno Production → Inventory

### Aplicar una producción

```http
POST /internal/producciones/aplicar
```

Payload principal:

```json
{
  "operacion_id": "uuid",
  "presentacion_id": 1,
  "receta_id": 1,
  "cantidad_producida": "10",
  "almacen_insumos_tipo": "MATERIAS_PRIMAS",
  "almacen_terminados_tipo": "PRODUCCION",
  "ingredientes": [
    {
      "materia_prima_id": 1,
      "cantidad": "2.000",
      "unidad": "g"
    }
  ]
}
```

Headers internos:

```text
X-Internal-Service-Key
X-Actor-User-Id
```

### Consultar resultado de una producción

```http
GET /internal/producciones/{operacion_id}
```

Resultados previstos:

- `APLICADA`
- `RECHAZADA`
- `404` si la operación no existe todavía.

### Reglas de integración

- El mismo `operacion_id` debe conservarse en todo el flujo.
- Production no genera un ID nuevo al reintentar una operación incierta.
- Inventory aplica débitos de materias primas y crédito del terminado dentro de una misma transacción.
- No se permite mutación parcial.
- Una producción aplicada acredita el producto terminado en `PRODUCCION`, no directamente en `MOSTRADOR`.

---

## 5. Middleware interno de Inventory

Se implementó autorización para llamadas entre microservicios.

| Caso | Resultado |
|---|---|
| Falta configuración de clave interna | 503 |
| Clave incorrecta | 403 |
| Actor inválido o ausente | 422 |
| Clave y actor válidos | Continúa la operación |

La clave se recibe mediante:

```text
X-Internal-Service-Key
```

---

## 6. Production Service

Production utiliza PostgreSQL independiente y tiene configuración para comunicarse con Security, Catalog e Inventory.

Configuración observada:

```text
SECURITY_SERVICE_URL=http://security-service:8000
CATALOGO_SERVICE_URL=http://catalog-service:8000
INVENTORY_SERVICE_URL=http://inventory-service:8000
```

Las claves internas permanecen únicamente en `.env` y no se registran en Git.

### 6.1 Production → Catalog

Production obtiene desde Catalog:

- presentación;
- receta;
- detalles de receta;
- materias primas;
- cantidades;
- unidades;
- estado de cada referencia.

Los decimales se manejan como texto con precisión controlada.

### 6.2 Production → Inventory

Production envía a Inventory:

- `operacion_id`;
- presentación;
- receta;
- cantidad producida;
- ingredientes calculados;
- tipos de almacén.

La lógica contempla:

- éxito;
- stock insuficiente;
- respuesta inválida;
- timeout;
- respuesta con `operacion_id` distinto;
- conciliación posterior.

### 6.3 Estados de conciliación

Si Production no puede confirmar el resultado de Inventory, conserva una operación pendiente y la consulta posteriormente.

Principio aplicado:

```text
No marcar producción como completada sin confirmación de Inventory.
```

También se configuró el comando de conciliación periódica mediante scheduler.

---

## 7. Corrección del Dockerfile de Production

Durante la integración apareció el error:

```text
The /var/www/html/bootstrap/cache directory must be present and writable.
```

El build fallaba durante:

```text
composer dump-autoload
```

Se corrigió `microservices/production-service/Dockerfile` creando explícitamente:

```text
bootstrap/cache
storage/framework/cache/data
storage/framework/sessions
storage/framework/views
storage/logs
```

y aplicando permisos:

```dockerfile
chmod -R 775 bootstrap/cache storage
```

También se agregó:

```text
bootstrap/cache/.gitignore
```

con:

```gitignore
*
!.gitignore
```

De esta forma Laravel puede regenerar `packages.php` y `services.php` sin agregarlos al repositorio.

---

## 8. Integración del API Gateway

Se agregó Inventory al Gateway:

```nginx
set $inventory_target inventory-service:8000;
```

Rutas públicas:

```text
/api/almacenes
/api/existencias
/api/movimientos
/api/ingresos
/api/egresos
/api/traslados
```

El Gateway conserva:

```text
Authorization
Idempotency-Key
```

pero elimina encabezados internos que pudieran venir desde el navegador:

```text
X-Internal-Service-Key
X-Actor-User-Id
```

### 8.1 Protección de rutas internas

Se agregó:

```nginx
location ^~ /internal/ {
    return 404;
}
```

Esto evita exponer públicamente las rutas internas entre microservicios.

La comprobación externa devolvió correctamente `404`.

### 8.2 Validación de Nginx

Se ejecutó:

```powershell
docker exec dulce_bocado_gateway nginx -t
```

Resultado:

```text
syntax is ok
test is successful
```

---

## 9. Permisos de Security para Inventory

Se creó:

```text
microservices/security-service/database/seeders/InventoryPermisosSeeder.php
```

Permisos creados:

```text
inventario.ver
inventario.ingresar
inventario.egresar
inventario.trasladar
```

Roles configurados:

- `Administrador`
- `Producción`

El usuario inicial `admin` recibe explícitamente los permisos del rol Administrador.

### 9.1 Idempotencia del seeder

El seeder utiliza operaciones idempotentes como:

```text
updateOrCreate
firstOrCreate
```

Se ejecutó varias veces sin crear duplicados ni producir errores.

### 9.2 Registro en DatabaseSeeder

Se actualizó:

```text
microservices/security-service/database/seeders/DatabaseSeeder.php
```

para incluir:

```php
InventoryPermisosSeeder::class
```

después de:

```php
AdministradorInicialSeeder::class
```

Con esto una instalación nueva crea también los permisos de Inventory.

---

## 10. Configuración de claves entre servicios

### Production → Inventory

```text
Production INVENTORY_SERVICE_KEY
=
Inventory INVENTORY_INTERNAL_KEY
```

### Production / Inventory → Security

```text
INTERNAL_SERVICE_KEY
```

debe coincidir con la clave interna de Security.

### Production / Inventory → Catalog

```text
CATALOGO_SERVICE_KEY
=
Catalog CATALOG_INTERNAL_KEY
```

Las claves utilizadas son de 64 caracteres y permanecen fuera de Git.

---

## 11. Problema de conexión de Inventory a PostgreSQL

Durante una prueba directa Production → Inventory se recibió `500` con el error:

```text
fe_sendauth: no password supplied
```

La solicitud ya había llegado correctamente a Inventory y había superado la autenticación interna, pero Inventory no lograba consultar PostgreSQL.

Se verificó:

```text
Inventory service DB_PASSWORD longitud: 26
Inventory DB POSTGRES_PASSWORD longitud: 26
COINCIDEN: True
```

Luego se recreó únicamente `inventory-service` para asegurar que el contenedor cargara nuevamente las variables de entorno.

Posteriormente:

```text
db_host => inventory-db
db_database => dulce_inventory
db_password_length => 26
db_ok => true
```

Problema resuelto.

---

## 12. Validación directa Production → Inventory

Se realizó una consulta interna desde Production a:

```text
/internal/producciones/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
```

con clave válida.

Resultado:

```text
status => 404
message => Operación no encontrada.
```

Esto confirmó:

- resolución DNS;
- conectividad Docker;
- URL interna;
- clave interna;
- middleware;
- conexión de Inventory con PostgreSQL.

El `404` era el resultado esperado porque el UUID de prueba no existía.

### 12.1 Prueba con clave inválida

Se repitió la solicitud usando una clave incorrecta.

Resultado:

```text
403
```

Código:

```text
SERVICIO_INTERNO_NO_AUTORIZADO
```

Mensaje:

```text
El servicio llamante no está autorizado.
```

Esto confirmó que Inventory no acepta servicios internos con credenciales inválidas.

---

## 13. Validación Gateway → Security → Inventory

Se inició sesión como `admin` y se obtuvo un token Bearer válido.

Luego:

```http
GET /api/almacenes
```

a través de:

```text
http://localhost:8080
```

Resultado final:

```json
{
  "almacenes": [
    {
      "id_almacen": 1,
      "nombre": "Materias primas",
      "tipo": "MATERIAS_PRIMAS",
      "activo": true
    },
    {
      "id_almacen": 2,
      "nombre": "Producción",
      "tipo": "PRODUCCION",
      "activo": true
    },
    {
      "id_almacen": 3,
      "nombre": "Mostrador",
      "tipo": "MOSTRADOR",
      "activo": true
    }
  ]
}
```

Esto validó conjuntamente:

```text
Cliente
→ Gateway
→ Inventory
→ Security introspection
→ permisos
→ PostgreSQL Inventory
```

---

## 14. Incidente con Security durante pruebas

Después de ejecutar pruebas de Security apareció:

```text
401 Unauthenticated
```

incluso con un token recién generado.

Se comprobó inicialmente:

```text
token_existe => false
total_tokens => 0
```

Luego se inspeccionó Security:

```text
usuarios => 0
tokens => 0
```

La configuración del Gateway era correcta y el contenedor resolvía:

```text
security-service → 172.19.0.13
```

igual que el contenedor esperado.

La causa real fue que la base de desarrollo de Security había quedado vacía.

### 14.1 Restauración de Security

Las migraciones seguían aplicadas:

```text
usuarios
roles
permisos
rol_permiso
usuario_rol_permiso
personal_access_tokens
```

Se ejecutó:

```powershell
php artisan db:seed --force
```

Seeders ejecutados correctamente:

```text
SeguridadInicialSeeder
ClientesPermisosSeeder
CatalogoPermisosSeeder
VentasPermisosSeeder
PedidosPermisosSeeder
AdministradorInicialSeeder
InventoryPermisosSeeder
```

Después:

```text
usuarios => 1
admin_existe => true
permisos_inventory => 4
```

### 14.2 Nueva autenticación

Se generó un token nuevo.

Resultado:

```text
token_existe => true
total_tokens => 1
```

Posteriormente:

```http
GET /api/auth/me
```

devolvió correctamente el usuario administrador y todos sus permisos, incluidos:

```text
inventario.ver
inventario.ingresar
inventario.egresar
inventario.trasladar
```

---

## 15. Avance implementado y reportado de T313

El código de T313 está incorporado. El desarrollador reportó las siguientes configuraciones y comprobaciones locales; las pruebas de aceptación integral siguen identificadas en las secciones 17–18:

- Inventory registrado en Gateway.
- Rutas públicas de Inventory.
- Bloqueo externo de `/internal/*`.
- Propagación de Bearer.
- Propagación de `Idempotency-Key`.
- Eliminación de headers internos provenientes del navegador.
- Seeder de permisos de Inventory.
- Integración del seeder al `DatabaseSeeder`.
- Configuración de claves Production ↔ Inventory.
- Configuración Security.
- Configuración Catalog.
- Validación Production → Inventory.
- Validación de clave correcta.
- Validación de clave incorrecta.
- Validación Gateway → Inventory con usuario autorizado.
- Corrección del build de Production.
- Corrección del entorno de PostgreSQL de Inventory.
- Restauración de Security después de quedar vacía la base de desarrollo.

---

## 16. Commit y trazabilidad de T313

El commit **`e016d72`** (`feat(integration): completar T313 gateway permisos e integracion inventario`) ya existe en `dev-jp` y fue incorporado a `devFabian` por avance rápido el 17-11-2026. Contiene:

```text
gateway/nginx.conf
microservices/production-service/Dockerfile
microservices/production-service/bootstrap/cache/.gitignore
microservices/security-service/database/seeders/DatabaseSeeder.php
microservices/security-service/database/seeders/InventoryPermisosSeeder.php
```

Estadística observada:

```text
5 files changed
131 insertions(+)
3 deletions(-)
```

Validación registrada durante su preparación:

```powershell
git diff --cached --check
```

Resultado:

```text
Sin errores
```

No queda un commit de T313 por crear. La aceptación funcional completa aún requiere las pruebas de cierre del Sprint.

---

## 17. Estado actual del Sprint 3

Los componentes principales están implementados en código. El Sprint 3 permanece **pendiente de aceptación integral y cierre Scrum**.

Los componentes principales ya existen:

- Inventory Service;
- Production Service;
- integración con Catalog;
- integración con Security;
- integración Production → Inventory;
- Gateway;
- frontend de inventario;
- frontend de producción;
- permisos;
- idempotencia;
- conciliación;
- scheduler;
- persistencia separada.

### 17.1 Evidencia contrastada el 17-11-2026

| Fuente | Resultado observado | Alcance de la evidencia |
|---|---|---|
| Código integrado en `devFabian` | `git merge --ff-only origin/dev-jp` avanzó de `2fe6102` a `803bd0d`, incorporando ocho commits sin conflictos. `e016d72` contiene T313. | Presencia de entregables en el repositorio; no prueba su operación conjunta. Los ocho commits aún no se habían publicado en `origin/devFabian` al realizar esta revisión. |
| Inventory aislado | Imagen construida desde `microservices/inventory-service`; **51 pruebas, 246 aserciones, 0 fallos/advertencias**. | SQLite en memoria y HTTP simulado, contenedor desechable sin red; no se usó `dulce_inventory`. |
| Production aislado | Imagen construida desde `microservices/production-service`; **13 pruebas, 79 aserciones, 0 fallos/advertencias**. | SQLite en memoria y HTTP simulado, contenedor desechable sin red; no se usó `dulce_production`. |
| React | Imagen construida desde `frontend`; `npm run build` aprobó, **106 módulos transformados**. | Compilación de componentes y rutas; no prueba navegación, permisos, datos ni solicitudes reales desde el navegador. |
| Integración manual relatada en secciones 12–13 | Production → Inventory devolvió `404` para operación inexistente con clave válida y `403` con clave inválida; Gateway → Inventory devolvió tres almacenes con administrador autenticado. | Evidencia reportada por el desarrollador. No se repitió en esta consolidación ni acredita el flujo de producción/stock completo. |
| Preparación local del conjunto | `docker compose ... config --quiet` con todos los overlays falló porque falta el `.env` local, ignorado por Git, de `inventory-service`. | Se requiere configurar el entorno antes de repetir PS3-01–17/19. No indica un fallo de la suite aislada. |

Comandos usados para las verificaciones aisladas (el `.env` temporal se crea **dentro** de cada contenedor desechable):

```powershell
docker build -t dulce-bocado-inventory-service:audit microservices/inventory-service
docker run --rm --network none dulce-bocado-inventory-service:audit sh -c 'cp .env.example .env && php artisan test --compact'
docker build -t dulce-bocado-production-service:audit microservices/production-service
docker run --rm --network none dulce-bocado-production-service:audit sh -c 'cp .env.example .env && php artisan test --compact'
docker build -t dulce-bocado-frontend:audit frontend
docker run --rm --network none dulce-bocado-frontend:audit npm run build
```

### 17.2 Matriz para la aceptación oficial

Los identificadores y resultados esperados pertenecen a `Docs/SPRINT_3_PLAN_DESARROLLO_Y_PRUEBAS.md`, sección 7. Registrar allí cada ejecución con fecha, ambiente, commit, datos ficticios, respuesta, consulta de persistencia y responsable. No convertir una prueba aislada o un reporte manual en «PS3 aprobada» sin esa evidencia.

| Casos | Evidencia actual | Para cerrar |
|---|---|---|
| PS3-01–02 | Servicios/rutas y consulta manual de almacenes reportados; consultas de existencias probadas aisladamente. | Arranque conjunto reproducible, salud y migraciones; saldos/filtros contra PostgreSQL real. |
| PS3-03–08 | Ingreso, egreso y traslado cubiertos por la suite aislada de Inventory. | Ejecutar altas, rechazos, reintentos y concurrencia con movimientos/saldos reales; comprobar atomicidad. |
| PS3-09–14 | Production e Inventory tienen suites aisladas y prueba manual de conectividad/clave. | Recorrer producción real con receta, insumos, consumo, terminado, rechazos, respuesta perdida y caídas; cotejar ambos servicios y bases. |
| PS3-15 | `403` con clave interna inválida y acceso autorizado a almacenes reportados. | Registrar también `401/403` públicos por permiso y bloqueo de rutas internas vía Gateway. |
| PS3-16 | React compila. | Recorrer y capturar todo el flujo desde navegador → Gateway → servicios con Bearer. |
| PS3-17 | Sin evidencia de reinicio y recuperación. | Reiniciar sin borrar volúmenes y verificar saldos, movimientos, producciones e idempotencia. |
| PS3-18 | Suites aisladas aprobadas en contenedores sin red. | Comparar y registrar conteos antes/después de bases de desarrollo; revisar especialmente aislamiento de Security. |
| PS3-19 | Sin evidencia de dos producciones simultáneas reales. | Ejecutar competencia por último insumo en PostgreSQL y auditar saldos y terminados. |

---

## 18. Pruebas de cierre todavía pendientes

### 18.1 Flujo completo

Debe probarse con datos ficticios:

```text
Ingreso de materia prima
→ consulta de existencia
→ producción
→ consumo automático de insumos
→ ingreso de terminado a PRODUCCION
→ traslado a MOSTRADOR
```

### 18.2 React completo

Recorrer desde el navegador:

- almacenes;
- existencias;
- ingresos;
- egresos;
- movimientos;
- producción;
- traslado.

Todas las solicitudes deben entrar por Gateway con Bearer.

### 18.3 Persistencia

Reiniciar servicios y bases de datos sin eliminar volúmenes.

Comprobar que sobrevivan:

- existencias;
- movimientos;
- producciones;
- resultados idempotentes.

### 18.4 Concurrencia

Ejecutar dos producciones simultáneas que compitan por el último insumo disponible.

Resultado esperado:

- solo se confirma lo que puede cubrir el stock;
- ninguna existencia queda negativa;
- no se acredita producto terminado si no se consumieron correctamente los insumos.

### 18.5 Auditoría de datos

Comprobar:

- ninguna existencia negativa;
- saldo consistente con movimientos;
- ninguna operación idempotente duplicada;
- cada producción aplicada tiene su registro en Inventory;
- cada traslado tiene los movimientos correspondientes;
- ninguna producción marcada como completada sin confirmación de Inventory.

---

## 19. Observación importante sobre las pruebas de Security

Durante pruebas previas se observó que determinadas ejecuciones de la suite de Security podían dejar vacía la base de desarrollo. La suite de Security **no se repitió** en la verificación aislada del 17-11-2026.

Por seguridad, antes de repetir la suite completa se debe revisar:

- `phpunit.xml`;
- variables de entorno de testing;
- conexión utilizada por `RefreshDatabase`;
- uso de SQLite en memoria o una base de testing independiente.

No se debe permitir que una prueba automatizada migre, vacíe o reinicialice:

```text
dulce_security
```

de desarrollo.

---

## 20. Pendientes de documentación Scrum

Este archivo aporta hechos técnicos para la documentación oficial. Faltan los siguientes registros del equipo; **no inventar horas, fechas de reuniones, aceptación del Product Owner ni resultados de pruebas**:

| Artefacto | Datos que deben incorporarse |
|---|---|
| Daily Meeting | Fechas, participantes, avance, impedimentos y acuerdos reales de cada reunión. |
| Scrumboard / Sprint Backlog | Conciliar T301–T314 en `SPRINT_3_PLAN_DESARROLLO_Y_PRUEBAS.md`; registrar responsables, estados de revisión, horas reales, commits y evidencia de aceptación. |
| Product Increment y diagramas | Arquitectura implementada, contratos y pantallas reales; señalar funciones disponibles y límites verificados. Actualizar diagramas de clases, interfaces y secuencia que hayan cambiado. |
| Burndown y Burnup | Tomar datos diarios del tablero/Jira; no calcular curvas con horas estimadas ni con esta tabla de código implementado. |
| Sprint Review | Demostración del flujo completo, casos PS3 aprobados/fallidos, comentarios del Product Owner y decisión de aceptación. |
| Sprint Retrospective | Hechos observados, mejoras, responsables y fecha de seguimiento. |
| Anexos de prueba | Registro PS3-01–PS3-19, capturas de React/Gateway, respuestas anonimizadas, conteos/consultas de base y evidencia de reinicio/concurrencia. |

---

## 21. Conclusión

El Sprint 3 tiene Inventory, Production, Gateway, permisos y vistas React implementados. La verificación de esta consolidación aprobó las suites aisladas y la compilación; las secciones 12–13 conservan pruebas manuales de conectividad y autorización reportadas por el desarrollador. Falta repetir y registrar el flujo completo con datos y bases reales para decidir la aceptación de HU16–HU19.

Próximas acciones para un cierre verificable:

1. Configurar el `.env` local de Inventory y comprobar el conjunto de Compose, salud y migraciones sin reinicializar bases existentes.
2. Ejecutar PS3-01–PS3-19 según aplique, con datos ficticios y evidencia de API, frontend y persistencia; registrar también los fallos.
3. Probar reinicio, concurrencia y conciliación de Production ↔ Inventory en PostgreSQL.
4. Conciliar el Sprint Backlog del plan con los commits ya integrados, incluidos `e016d72` de T313 y las horas reales.
5. Completar Sprint Review, Retrospective y los demás artefactos Scrum con resultados observados y decisión del Product Owner.

> **Estado de consolidación:** implementación avanzada y pruebas aisladas aprobadas; **Sprint 3 aún no cerrado oficialmente**.
