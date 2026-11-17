# Sprint 3 — Avance completo de desarrollo e integración

**Proyecto:** Dulce Bocado  
**Fecha de actualización:** 17 de noviembre de 2026  
**Equipo:** Juan Pablo Montoya Salinas / Fabián Cuellar Salvatierra  
**Estado general:** Desarrollo funcional prácticamente concluido. Pendiente cierre integral, evidencias finales y documentación Scrum.

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

| Tarea | Descripción resumida | Estado |
|---|---|---|
| T301 | Base y esquema de Inventory | ✅ Terminada |
| T302 | Base y entorno de Production | ✅ Terminada |
| T303 | Almacenes, existencias y autorización | ✅ Terminada |
| T304 | Interfaz React de almacenes/existencias | ✅ Terminada |
| T305 | Ingresos de inventario | ✅ Terminada |
| T306 | Interfaz React de movimientos | ✅ Terminada |
| T307 | Egresos de inventario | ✅ Terminada |
| T308 | Integración Production → Catalog | ✅ Terminada |
| T309 | Traslados entre almacenes | ✅ Terminada |
| T310 | Integración Production → Inventory | ✅ Terminada |
| T311 | Interfaz React de Producción | ✅ Terminada |
| T312 | Validaciones y pruebas de Inventory | ✅ Terminada |
| T313 | Gateway, permisos e integración final | ✅ Funcionalmente terminada |
| T314 | Conciliación y pruebas aisladas de Production | ✅ Terminada |

> **Nota:** T313 quedó completamente validada funcionalmente. Solo falta registrar el commit final si aún no se hizo.

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

## 15. Resultado final de T313

T313 quedó funcionalmente completada con:

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

## 16. Archivos preparados para el commit de T313

Archivos incluidos:

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

Validación:

```powershell
git diff --cached --check
```

Resultado:

```text
Sin errores
```

Commit propuesto:

```powershell
git commit -m "feat(integration): completar T313 gateway permisos e integracion inventario"
```

---

## 17. Estado actual del Sprint 3

El desarrollo funcional principal puede considerarse prácticamente terminado.

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

Durante el cierre se detectó que determinadas pruebas de Security podían dejar vacía la base de desarrollo.

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

Después de completar las pruebas integrales se debe actualizar:

- Daily Meeting;
- Scrumboard;
- Product Increment;
- Burndown;
- Burnup;
- Sprint Review;
- Sprint Retrospective;
- evidencias de pruebas;
- capturas del frontend;
- resultados de base de datos;
- diagramas que hayan cambiado.

---

## 21. Conclusión

El Sprint 3 llegó a un estado de desarrollo avanzado y funcional.

Los microservicios de **Inventory y Production** ya se comunican correctamente con **Security, Catalog y Gateway**, y la integración interna entre Production e Inventory quedó validada tanto para credenciales correctas como incorrectas.

El flujo de autorización también quedó verificado con el usuario administrador y los cuatro permisos de Inventory.

El trabajo restante corresponde principalmente a:

1. registrar el commit final de T313;
2. ejecutar pruebas integrales de extremo a extremo;
3. comprobar persistencia y concurrencia;
4. validar el flujo completo desde React;
5. documentar Sprint Review, retrospectiva y evidencias finales.

> **Estado final:** Desarrollo del Sprint 3 prácticamente terminado; pendiente cierre integral y documental.
