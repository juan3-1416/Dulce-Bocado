# Dulce Bocado — Cierre Sprint 1 y Plan Sprint 2

**Proyecto:** Sistema de Información Web para la Gestión de Ventas, Pedidos, Producción e Inventario de una Pastelería y Repostería  
**Repositorio:** `Dulce-Bocado`  
**Sprint cerrado:** Sprint 1 — Seguridad e infraestructura base  
**Siguiente Sprint:** Sprint 2 — Clientes, Catálogo, Recetas, Pedidos y Ventas  
**Estado general:** Sprint 1 completado y validado de extremo a extremo.

---

# 1. Objetivo alcanzado en el Sprint 1

El Sprint 1 dejó operativa la infraestructura mínima de microservicios y el módulo completo de Seguridad.

Se completó:

- ejecución de frontend, Gateway, backend legado, `security-service` y bases de datos con Docker Compose;
- autenticación mediante `security-service`;
- emisión de tokens Sanctum tipo Bearer;
- cierre de sesión e invalidación de token;
- gestión de usuarios;
- gestión de roles;
- gestión de permisos;
- asociación Rol-Permiso;
- asignación de accesos a usuarios;
- menú React dinámico según permisos;
- protección de rutas frontend;
- protección de endpoints backend;
- respuestas `401 Unauthorized` cuando no existe autenticación válida;
- respuestas `403 Forbidden` cuando el usuario autenticado no tiene permisos;
- consumo de APIs desde React únicamente mediante el API Gateway;
- persistencia de datos después del reinicio de contenedores.

---

# 2. Arquitectura disponible al cierre del Sprint 1

## 2.1 Componentes

| Componente | Responsabilidad | Puerto host |
|---|---|---:|
| `frontend` | React + Vite + Tailwind | `5173` |
| `gateway` | Nginx API Gateway | `8080` |
| `security-service` | Laravel — Seguridad | `8001` |
| `security-db` | PostgreSQL — `dulce_security` | `5433` |
| `backend` | Backend Laravel legado | `8000` |
| `db` | PostgreSQL legado | `5432` |

Frontend:

```env
VITE_API_URL=http://localhost:8080
```

Flujo:

```text
React
  ↓
Nginx Gateway :8080
  ↓
security-service
  ↓
dulce_security
```

React no debe consumir directamente `localhost:8001`.

## 2.2 Docker Compose

Levantar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d
```

Ver estado:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml ps
```

Si se cambia una configuración copiada dentro de la imagen del Gateway:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d --build --force-recreate gateway
```

---

# 3. Seguridad implementada

## 3.1 Autenticación

Endpoints:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Flujo:

1. Usuario envía `nombre_usuario` y `contrasena`.
2. `security-service` valida credenciales.
3. Se verifica que el usuario esté activo.
4. Se controlan intentos fallidos/bloqueo.
5. Se genera un Personal Access Token de Sanctum.
6. React guarda el token.
7. Las solicitudes protegidas envían:

```http
Authorization: Bearer <token>
```

8. Logout elimina el token actual.

`/api/auth/me` devuelve usuario, roles y permisos efectivos.

## 3.2 Autorización

Permisos administrativos iniciales:

```text
seguridad.gestionar_usuario
seguridad.gestionar_rol
seguridad.gestionar_permiso
seguridad.gestionar_rol_permiso
seguridad.asignar_roles_permisos
```

Roles iniciales:

```text
Administrador
Vendedor
Producción
```

El rol `Administrador` posee los permisos administrativos iniciales.

El modelo `Usuario` utiliza `tienePermiso()` para resolver permisos efectivos desde:

```text
usuario
  ↓
usuario_rol_permiso
  ↓
rol_permiso
  ├── rol
  └── permiso
```

---

# 4. Persistencia de Seguridad

Base:

```text
dulce_security
```

Tablas principales:

```text
usuarios
roles
permisos
rol_permiso
usuario_rol_permiso
personal_access_tokens
```

Reglas validadas:

- nombre de rol único;
- nombre de permiso único;
- usuario y correo únicos;
- contraseñas con hash;
- solo usuarios activos se autentican;
- roles/permisos inactivos no se usan en nuevas asignaciones;
- una relación Rol-Permiso utilizada por usuarios no se elimina accidentalmente;
- no se duplican relaciones de acceso.

---

# 5. API implementada en Sprint 1

## Usuarios

```text
GET         /api/usuarios
POST        /api/usuarios
GET         /api/usuarios/{usuario}
PUT/PATCH   /api/usuarios/{usuario}
PATCH       /api/usuarios/{usuario}/estado
GET         /api/usuarios/{usuario}/accesos
```

Incluye listado, registro, consulta, edición, activación/desactivación, consulta de accesos, rechazo de duplicados e invalidación de tokens al desactivar.

## Roles

```text
GET         /api/roles
POST        /api/roles
GET         /api/roles/{rol}
PUT/PATCH   /api/roles/{rol}
PATCH       /api/roles/{rol}/estado
GET         /api/roles/{rol}/permisos
PUT         /api/roles/{rol}/permisos
```

Incluye CRUD funcional, cambio de estado, protección del rol `Administrador`, consulta y sincronización de permisos.

## Permisos

```text
GET         /api/permisos
POST        /api/permisos
GET         /api/permisos/{permiso}
PUT/PATCH   /api/permisos/{permiso}
PATCH       /api/permisos/{permiso}/estado
```

## Asignaciones

```text
GET         /api/asignaciones
POST        /api/asignaciones
DELETE      /api/asignaciones/{asignacion}
POST        /api/asignaciones/asignar-rol
POST        /api/asignaciones/quitar-rol
```

Los endpoints auxiliares permiten que React asigne o quite un rol completo. Internamente se gestionan varias filas `usuario_rol_permiso`.

---

# 6. API Gateway

Nginx enruta Seguridad:

```text
/api/auth/*
/api/usuarios*
/api/roles*
/api/permisos*
/api/asignaciones*
```

Se corrigió un problema por rutas Nginx con `/` final que generaban redirecciones `301`. Luego se reconstruyó el Gateway.

---

# 7. Frontend completado

## Autenticación

- Login.
- Logout.
- `AuthContext`.
- Persistencia mediante `/api/auth/me`.
- Bearer Token.
- Eliminación del token ante `401`.

## Rutas protegidas

`ProtectedRoute` redirige usuarios no autorizados a:

```text
/acceso-denegado
```

## Menú dinámico

Opciones de Seguridad:

```text
Usuarios
Roles
Permisos
Rol-Permiso
Asignaciones
```

Solo aparecen cuando el usuario cuenta con autorización.

## Gestión de Usuarios

- listar;
- crear;
- editar;
- activar/desactivar;
- validaciones;
- uso del Gateway.

## Gestión de Roles

- listar;
- crear;
- editar;
- activar/desactivar;
- impedir desactivar `Administrador`;
- validar duplicados.

## Gestión de Permisos

- listar;
- crear;
- editar;
- activar/desactivar.

## Rol-Permiso

- seleccionar rol;
- seleccionar permisos disponibles;
- asociar;
- listar relaciones;
- retirar relaciones;
- manejar conflicto cuando la relación está en uso.

## Asignaciones

- seleccionar usuario;
- seleccionar rol;
- asignar rol completo;
- visualizar permisos del rol;
- agrupar por Usuario + Rol;
- filtros;
- quitar rol completo;
- crear rol desde la pantalla.

---

# 8. Services React migrados

Se abandonó el esquema antiguo:

```text
/api/seguridad/...
cookies
CSRF
credentials: include
/sanctum/csrf-cookie
```

Se migró a:

```text
VITE_API_URL
API Gateway
Authorization: Bearer
Sanctum Personal Access Tokens
```

Servicios ajustados:

```text
authService.js
usuarioService.js
rolService.js
permisoService.js
rolPermisoService.js
usuarioRolPermisoService.js
```

---

# 9. Compilación frontend

Ejecutado:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec frontend npm run build
```

Resultado:

```text
✓ built
```

Existe una advertencia por un bundle superior a 500 kB. No bloquea el Sprint y puede optimizarse después con code splitting/dynamic imports.

---

# 10. Incidencias resueltas

## Gateway 301

Causa: configuraciones como:

```text
location /api/usuarios/
```

Solución: ajustar ubicaciones y reconstruir Gateway.

## Cache Laravel

`optimize:clear` intentó usar una tabla `cache` inexistente.

Configuración recomendada:

```env
CACHE_STORE=file
```

## Token inválido

Se validó correctamente el comportamiento `401` y la generación de un nuevo token mediante login.

## 502 tras `docker restart`

Inmediatamente después del reinicio ocurrió temporalmente:

```text
502 Bad Gateway
```

mientras los servicios iniciaban. Luego Gateway y Security respondieron normalmente y los datos persistieron.

---

# 11. Estado final de tareas Sprint 1

| ID | Tarea | Estado |
|---|---|---|
| T01 | Estructura base, frontend, Gateway y contenedores | ✅ DONE |
| T02 | Tablas, relaciones y datos iniciales de Seguridad | ✅ DONE |
| T03 | Autenticación, logout y protección de endpoints | ✅ DONE |
| T04 | Interfaz React login/logout | ✅ DONE |
| T05 | Menú y rutas por permisos | ✅ DONE |
| T06 | API Usuarios | ✅ DONE |
| T07 | UI Usuarios | ✅ DONE |
| T08 | API Roles/Permisos | ✅ DONE |
| T09 | UI Roles/Permisos | ✅ DONE |
| T10 | API Rol-Permiso y asignaciones | ✅ DONE |
| T11 | UI Rol-Permiso y asignaciones | ✅ DONE |
| T12 | Pruebas seguridad/backend | ✅ DONE |
| T13 | Flujo React → Gateway → Security | ✅ DONE |

**SPRINT 1: COMPLETADO.**

---

# 12. Pruebas Sprint 1

| ID | Prueba | Estado |
|---|---|---|
| PS1-01 | Login válido | ✅ |
| PS1-02 | Contraseña incorrecta → 401 | ✅ |
| PS1-03 | Usuario desactivado rechazado | ✅ |
| PS1-04 | Endpoint sin token → 401 | ✅ |
| PS1-05 | Usuario válido sin permiso → 403 | ✅ |
| PS1-06 | Logout invalida token | ✅ |
| PS1-07 | Registrar usuario | ✅ |
| PS1-08 | Usuario/email duplicado rechazado | ✅ |
| PS1-09 | Modificar usuario | ✅ |
| PS1-10 | Desactivar usuario | ✅ |
| PS1-11 | Registrar rol | ✅ |
| PS1-12 | Rol duplicado rechazado | ✅ |
| PS1-13 | Registrar permiso | ✅ |
| PS1-14 | Asociar permiso a rol | ✅ |
| PS1-15 | Retirar permiso del rol | ✅ |
| PS1-16 | Asignar acceso | ✅ |
| PS1-17 | Retirar acceso | ✅ |
| PS1-18 | Menú dinámico | ✅ |
| PS1-19 | React usa Gateway | ✅ |
| PS1-20 | Persistencia después del reinicio | ✅ |

---

# 13. Datos de prueba creados

Durante pruebas se generaron registros como:

```text
Usuario Prueba Modificado
Rol Prueba Modificado
Rol T10 Prueba
prueba.gestionar_modulo
prueba.t10.acceso
```

Antes de producción pueden limpiarse o mantenerse identificados como datos de desarrollo.

---

# 14. Punto de partida para Sprint 2

No reconstruir Seguridad. Reutilizar:

- `security-service`;
- autenticación Sanctum;
- Bearer Token;
- roles/permisos;
- Nginx Gateway;
- Docker Compose;
- React base;
- patrón `VITE_API_URL`;
- manejo `401` / `403`;
- bases independientes por microservicio.

Sprint 2 añadirá:

```text
customer-service
catalog-service
order-service
sales-service
```

---

# 15. Sprint 2 — Objetivo

## Sprint Goal

**Implementar los dominios necesarios para registrar pedidos y ventas utilizando información de clientes y catálogo mediante APIs.**

Historias:

```text
HU7  — Catálogo y presentaciones
HU8  — Clientes
HU9  — Recetas
HU10 — Ventas de mostrador
HU14 — Registro de pedidos
HU15 — Estados y entrega de pedidos
```

La validación/descuento real de stock de HU10 queda para Sprint 3 mediante `inventory-service`.

---

# 16. Arquitectura objetivo del Sprint 2

| Servicio | Responsabilidad | Persistencia |
|---|---|---|
| `customer-service` | Clientes | PostgreSQL `dulce_customers` |
| `catalog-service` | Categorías, productos, presentaciones, materias primas y recetas | MySQL `dulce_catalog` |
| `order-service` | Pedidos, detalle, estados, entrega | PostgreSQL `dulce_orders` |
| `sales-service` | Ventas, detalle, total, estados | PostgreSQL `dulce_sales` |

Todos se publican únicamente por Nginx.

---

# 17. Regla arquitectónica crítica

No crear FK entre bases de microservicios diferentes.

Incorrecto:

```text
dulce_orders.cliente_id
    FK → dulce_customers.clientes
```

Correcto:

```text
order-service
    ↓ REST
GET /api/clientes/{id}
    ↓
customer-service
```

Se almacenan IDs externos y únicamente snapshots necesarios.

---

# 18. Snapshots históricos

Pedidos y ventas deben guardar precios históricos.

Ejemplo:

```text
Precio actual al registrar pedido: Bs 120
Precio del catálogo al día siguiente: Bs 150
Precio histórico del pedido: Bs 120
```

Detalle recomendado:

```text
presentacion_id
nombre_presentacion_snapshot
precio_unitario_snapshot
cantidad
subtotal
```

Nunca recalcular históricos leyendo el precio actual del catálogo.

---

# 19. Sprint Backlog oficial Sprint 2

Capacidad:

```text
80 h totales
78 h planificadas
2 h de reserva
```

## Clientes

| ID | HU | Tarea | Responsable oficial | h |
|---|---|---|---|---:|
| T201 | HU8 | Crear `customer-service`, PostgreSQL y rutas base | Juan Pablo | 5 |
| T202 | HU8 | Implementar API y validaciones de clientes | Juan Pablo | 5 |
| T203 | HU8 | UI React de Gestión de Cliente | Fabián | 4 |

## Catálogo

| ID | HU | Tarea | Responsable oficial | h |
|---|---|---|---|---:|
| T204 | HU7 | Crear `catalog-service` y MySQL | Juan Pablo | 5 |
| T205 | HU7 | Categorías, productos y presentaciones | Juan Pablo | 5 |
| T206 | HU7 | UI React Catálogo | Fabián | 5 |
| T207 | HU9 | Materias primas, recetas y detalle de receta | Juan Pablo | 6 |
| T208 | HU9 | UI React Recetas | Fabián | 6 |

## Pedidos

| ID | HU | Tarea | Responsable oficial | h |
|---|---|---|---|---:|
| T209 | HU14 | Crear `order-service` + PostgreSQL | Juan Pablo | 5 |
| T210 | HU14 | Registro/edición de pedidos y snapshots | Juan Pablo | 5 |
| T211 | HU14 | UI React Pedidos | Fabián | 6 |
| T212 | HU15 | Estados, entrega y reglas del pedido | Juan Pablo | 6 |
| T213 | HU15 | Acciones estado/entrega en React | Fabián | 4 |

## Ventas

| ID | HU | Tarea | Responsable oficial | h |
|---|---|---|---|---:|
| T214 | HU10 | Crear `sales-service` + PostgreSQL | Juan Pablo | 4 |
| T215 | HU10 | Venta, detalle y cálculo del total | Juan Pablo | 3 |
| T216 | HU10 | UI React Ventas | Fabián | 3 |

## Integración

| ID | HU | Tarea | Responsable oficial | h |
|---|---|---|---|---:|
| T217 | HU7-HU15 | Gateway y comunicación REST | Fabián | 3 |
| T218 | HU7-HU15 | Pruebas integrales y documentación | Fabián | 3 |

---

# 20. Orden recomendado Sprint 2

```text
T201 → T202 → T203
Customer

T204 → T205 → T206
Catalog

T207 → T208
Recetas

T209 → T210 → T212 → T211/T213
Pedidos

T214 → T215 → T216
Ventas

T217
Integración Gateway

T218
Pruebas y documentación
```

Pedidos debe comenzar cuando Customer y Catalog tengan contratos estables.

Ventas debe empezar cuando Catalog esté operativo.

---

# 21. Contratos API Sprint 2

## Customer

```text
GET         /api/clientes
POST        /api/clientes
GET         /api/clientes/{id}
PUT/PATCH   /api/clientes/{id}
PATCH       /api/clientes/{id}/estado
```

## Catalog

```text
GET/POST    /api/categorias
GET/POST    /api/productos
GET/POST    /api/presentaciones
GET         /api/presentaciones/{id}
GET/POST    /api/materias-primas
GET/POST    /api/recetas
GET         /api/presentaciones/{id}/receta
```

## Orders

```text
GET/POST    /api/pedidos
GET         /api/pedidos/{id}
PUT         /api/pedidos/{id}
PATCH       /api/pedidos/{id}/estado
POST        /api/pedidos/{id}/entregar
```

## Sales

```text
GET/POST    /api/ventas
GET         /api/ventas/{id}
PUT         /api/ventas/{id}
POST        /api/ventas/{id}/anular
```

---

# 22. Rutas nuevas del Gateway

```text
/api/clientes/*          → customer-service

/api/categorias/*        → catalog-service
/api/productos/*         → catalog-service
/api/presentaciones/*    → catalog-service
/api/materias-primas/*   → catalog-service
/api/recetas/*           → catalog-service

/api/pedidos/*           → order-service
/api/ventas/*            → sales-service
```

React debe seguir usando:

```text
http://localhost:8080/api/...
```

Nunca puertos internos.

---

# 23. Comunicación entre microservicios

## Orders → Customer

```text
GET /api/clientes/{id}
```

Validar existencia, estado activo y datos básicos.

## Orders → Catalog

```text
GET /api/presentaciones/{id}
```

Obtener existencia, precio, datos de presentación y posibilidad de personalización.

## Sales → Customer

Consultar cliente cuando la venta no sea ocasional.

## Sales → Catalog

Consultar presentación y precio vigente antes de crear el snapshot.

## Todos → Security

Reutilizar:

```http
Authorization: Bearer <token>
```

y autorización por permisos.

---

# 24. Dependencias caídas

Si Customer o Catalog no responde:

```text
Pedido/Venta NO debe confirmarse.
```

Debe devolverse un error controlado.

Nunca crear una operación con referencias externas no validadas.

---

# 25. Pruebas oficiales Sprint 2

| ID | Prueba | Resultado esperado |
|---|---|---|
| PS2-01 | Cliente válido | 201 / visible |
| PS2-02 | Cliente desactivado | No disponible para nuevos flujos |
| PS2-03 | Producto/presentación | Persistencia MySQL |
| PS2-04 | Precio negativo | Rechazado |
| PS2-05 | Receta válida | Registrada |
| PS2-06 | Receta inválida | Rechazada |
| PS2-07 | Pedido válido | Total + snapshot |
| PS2-08 | Cliente inexistente | Pedido rechazado |
| PS2-09 | Presentación inexistente | Pedido rechazado |
| PS2-10 | Precio histórico pedido | Conservado |
| PS2-11 | Transición válida | Registrada |
| PS2-12 | Transición inválida | Rechazada |
| PS2-13 | Entrega | Registrada |
| PS2-14 | Venta base válida | Venta + total |
| PS2-15 | Precio histórico venta | Conservado |
| PS2-16 | Servicio dependiente caído | Error controlado |
| PS2-17 | Gateway | React no usa puertos internos |
| PS2-18 | Usuario sin permiso | 403 |
| PS2-19 | Persistencia PostgreSQL | Datos permanecen |
| PS2-20 | Persistencia MySQL | Catálogo/recetas permanecen |

---

# 26. Definition of Done recomendada Sprint 2

Antes de DONE:

```text
[ ] código en repositorio
[ ] migraciones funcionales
[ ] contenedor inicia
[ ] endpoint protegido
[ ] validación de caso exitoso
[ ] validación de caso inválido
[ ] llamada vía Gateway
[ ] interfaz React cuando corresponda
[ ] persistencia verificada
[ ] no existe acceso directo a BD ajena
[ ] no existen puertos internos hardcodeados en React
[ ] evidencia para Sprint Review
```

---

# 27. Permisos sugeridos para Sprint 2

Los nombres concretos deben fijarse antes de implementar. Mantener una convención única.

Opción simple:

```text
clientes.gestionar
catalogo.gestionar
recetas.gestionar
pedidos.gestionar
ventas.gestionar
```

Opción granular:

```text
clientes.ver
clientes.crear
clientes.modificar

catalogo.ver
catalogo.gestionar

recetas.ver
recetas.gestionar

pedidos.ver
pedidos.crear
pedidos.modificar
pedidos.cambiar_estado
pedidos.entregar

ventas.ver
ventas.crear
ventas.modificar
ventas.anular
```

---

# 28. Riesgos Sprint 2

## Demasiados dominios

Prioridad:

```text
Clientes
↓
Catálogo
↓
Pedidos
↓
Ventas base
```

No ampliar Ventas hacia Inventario en Sprint 2.

## Dependencias REST

Definir contratos antes de integrar React.

## Históricos

Snapshots obligatorios para precios de Pedidos/Ventas.

## MySQL vs PostgreSQL

```text
catalog-service  → MySQL
customer-service → PostgreSQL
order-service    → PostgreSQL
sales-service    → PostgreSQL
security-service → PostgreSQL
```

## Bases independientes

No FK entre servicios.

---

# 29. Evidencias requeridas para Sprint Review 2

```text
[ ] customer-service funcionando
[ ] CRUD Clientes desde React
[ ] catalog-service sobre MySQL
[ ] Categorías
[ ] Productos
[ ] Presentaciones
[ ] Materias primas
[ ] Recetas
[ ] order-service registrando pedidos
[ ] Orders consulta Customer por REST
[ ] Orders consulta Catalog por REST
[ ] Snapshot histórico de pedido
[ ] Cambio de estado
[ ] Rechazo de transición inválida
[ ] Entrega del pedido
[ ] sales-service con venta base
[ ] Snapshot histórico de venta
[ ] Gateway con rutas Sprint 2
[ ] Error controlado cuando dependencia está caída
[ ] PS2-01 a PS2-20
[ ] Jira T201-T218 actualizado
```

---

# 30. Criterio de cierre Sprint 2

```text
[ ] Customer Service operativo
[ ] Catalog Service operativo en MySQL
[ ] Recetas operativas
[ ] Order Service operativo
[ ] Orders ↔ Customer/Catalog por REST
[ ] Estados de pedido operativos
[ ] Entrega operativa
[ ] Sales Service base operativo
[ ] Snapshots verificados
[ ] Gateway enruta todos los servicios
[ ] React consume únicamente Gateway
[ ] Seguridad Sprint 1 reutilizada
[ ] Usuario sin permiso obtiene 403
[ ] No hay consultas directas a bases ajenas
[ ] PS2-01 a PS2-20 aprobadas
```

La integración:

```text
Sales → Inventory
```

queda para Sprint 3.

---

# 31. Primera tarea recomendada

Comenzar por:

```text
T201 — Crear customer-service, PostgreSQL y rutas base
```

Secuencia:

1. crear `microservices/customer-service`;
2. preparar Laravel independiente;
3. crear base `dulce_customers`;
4. añadir PostgreSQL propio;
5. añadir contenedores al Compose;
6. configurar `.env`;
7. crear migración/modelo Cliente;
8. crear rutas base;
9. configurar `/api/clientes` en Nginx;
10. integrar seguridad del Sprint 1;
11. probar con PowerShell;
12. continuar con T202.

No comenzar cuatro microservicios simultáneamente sin fijar primero los contratos.

---

# 32. Resumen para continuar en otro chat

```text
PROYECTO: Dulce Bocado

SPRINT 1:
✅ COMPLETADO
✅ T01-T13
✅ PS1-01 a PS1-20

ARQUITECTURA ACTUAL:
- React + Vite
- Nginx Gateway
- Laravel security-service
- PostgreSQL dulce_security
- Sanctum Bearer Token
- Docker Compose

SEGURIDAD:
- Login/logout
- Usuarios
- Roles
- Permisos
- Rol-Permiso
- Asignaciones
- ProtectedRoute
- Menú dinámico
- 401/403
- Gateway
- Persistencia

SPRINT 2:
⬜ T201-T218
⬜ HU7, HU8, HU9, HU10, HU14, HU15
⬜ customer-service
⬜ catalog-service
⬜ order-service
⬜ sales-service
⬜ PS2-01 a PS2-20

SIGUIENTE TAREA:
T201 — customer-service + PostgreSQL + rutas base
```

---

# Estado final

```text
SPRINT 1: ✅ CERRADO
SPRINT 2: ⬜ POR INICIAR
PRÓXIMA TAREA: T201
```
