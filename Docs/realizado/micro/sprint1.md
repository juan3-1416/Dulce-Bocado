# Guía de instalación, avances y tareas pendientes — Dulce Bocado

## 1. Objetivo de este documento

Este documento resume todo lo implementado hasta el momento en el **Sprint 1 del módulo de Seguridad de Dulce Bocado** y sirve como guía para que otro integrante del equipo pueda:

1. Clonar o actualizar el repositorio.
2. Levantar correctamente todos los servicios.
3. Configurar el `security-service`.
4. Ejecutar las migraciones y datos iniciales.
5. Probar autenticación, permisos y gestión de usuarios.
6. Conocer exactamente qué tareas ya fueron completadas.
7. Continuar con las tareas pendientes sin rehacer trabajo existente.

---

# 2. Estado actual del Sprint 1

Actualmente se encuentran completadas las tareas **T01 a T07**.

| ID | Tarea | Estado |
|---|---|---|
| T01 | Estructura base, frontend, Gateway y contenedores | ✅ Completado |
| T02 | Base de datos de Seguridad, relaciones y datos iniciales | ✅ Completado |
| T03 | Autenticación, logout, tokens y protección de endpoints | ✅ Completado |
| T04 | Interfaz React de Login/Logout | ✅ Completado |
| T05 | Menú y rutas según roles/permisos | ✅ Completado |
| T06 | API de Gestión de Usuarios | ✅ Completado |
| T07 | Interfaz React de Gestión de Usuarios | ✅ Completado |
| T08 | API de Roles y Permisos | ⬜ Pendiente |
| T09 | Interfaz de Roles y Permisos | ⬜ Pendiente |
| T10 | API Rol-Permiso y asignación a usuarios | ⬜ Pendiente |
| T11 | Interfaz de asociaciones y asignaciones | ⬜ Pendiente |
| T12 | Pruebas de reglas de seguridad y permisos | ⬜ Pendiente |
| T13 | Verificación completa React → Gateway | ⬜ Pendiente |

---

# 3. Arquitectura utilizada

El Sprint 1 utiliza la siguiente arquitectura:

- **Frontend:** React + Vite
- **API Gateway:** Nginx
- **Servicio de Seguridad:** Laravel
- **Autenticación:** Laravel Sanctum mediante Personal Access Tokens
- **Base de datos del security-service:** PostgreSQL
- **Backend anterior:** continúa disponible como `legacy_backend`
- **Contenedores:** Docker Compose

Flujo principal:

```text
React
  |
  v
http://localhost:8080
  |
  v
Nginx API Gateway
  |
  +--> /api/auth/*          -> security-service
  +--> /api/usuarios*       -> security-service
  +--> /api/roles*          -> security-service
  +--> /api/permisos*       -> security-service
  +--> /api/asignaciones*   -> security-service
  |
  +--> resto de /api/*      -> backend anterior
```

---

# 4. Requisitos para instalar el proyecto

Se recomienda tener instalados:

- Git
- Docker Desktop
- Docker Compose
- Visual Studio Code
- PowerShell

No es obligatorio instalar PHP, Composer, PostgreSQL o Nginx directamente en Windows si se trabajará completamente con Docker.

Node.js solo es necesario si se desea ejecutar el frontend fuera de Docker.

---

# 5. Obtener el proyecto

Si todavía no tiene el repositorio:

```powershell
git clone <URL_DEL_REPOSITORIO>
cd Dulce-Bocado
```

Si ya tiene el repositorio:

```powershell
git pull
```

Debe asegurarse de estar en la rama donde se encuentran estos cambios antes de continuar.

Ejemplo:

```powershell
git branch
git status
```

---

# 6. Archivos Docker utilizados

Para levantar el Sprint 1 se utilizan conjuntamente:

```text
docker-compose.yml
docker-compose.sprint1.yml
```

Todos los comandos deben ejecutarse desde:

```text
C:\Users\<usuario>\Documents\GitHub\Dulce-Bocado
```

o desde la carpeta raíz equivalente donde haya clonado el repositorio.

---

# 7. Levantar los contenedores

Ejecutar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d --build
```

Luego verificar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml ps
```

Los servicios principales del Sprint 1 deben aparecer activos.

Entre ellos:

```text
frontend
gateway
security-service
security-db
backend
db
```

Puertos utilizados actualmente:

| Servicio | Puerto |
|---|---:|
| Frontend React | 5173 |
| API Gateway | 8080 |
| security-service directo | 8001 |
| PostgreSQL security-db desde Windows | 5433 |
| PostgreSQL interno security-db | 5432 |
| Backend anterior | 8000 |

---

# 8. Configuración del security-service

Archivo:

```text
microservices/security-service/.env
```

La configuración de base de datos debe apuntar a PostgreSQL y NO a SQLite.

Debe quedar equivalente a:

```env
DB_CONNECTION=pgsql
DB_HOST=security-db
DB_PORT=5432
DB_DATABASE=dulce_security
DB_USERNAME=dulce_security_user
DB_PASSWORD=dulce_security_pass
```

También se recomienda mantener los mismos valores en:

```text
microservices/security-service/.env.example
```

Después de cualquier cambio importante de `.env` ejecutar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan optimize:clear
```

---

# 9. Laravel Sanctum

El proyecto utiliza Laravel Sanctum para emitir tokens Bearer.

El modelo:

```text
microservices/security-service/app/Models/Usuario.php
```

utiliza:

```php
use Laravel\Sanctum\HasApiTokens;
```

y:

```php
use HasApiTokens, HasFactory, Notifiable;
```

No se está usando el flujo SPA tradicional de Sanctum con cookies y CSRF.

La autenticación actual funciona con:

```http
Authorization: Bearer <token>
```

Por lo tanto, para este Sprint NO se debe volver a implementar autenticación basada en:

```text
/sanctum/csrf-cookie
X-XSRF-TOKEN
credentials: include
```

---

# 10. Migraciones

Ejecutar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan migrate
```

Debe existir también la tabla:

```text
personal_access_tokens
```

generada por Sanctum.

Para revisar el estado:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan migrate:status
```

IMPORTANTE:

No utilizar:

```powershell
php artisan migrate:fresh
```

sobre una base compartida o con información que se quiera conservar.

---

# 11. Seeders del módulo de Seguridad

El proyecto cuenta con seeders de datos iniciales, entre ellos:

```text
SeguridadInicialSeeder.php
AdministradorInicialSeeder.php
```

Si la base de datos está vacía y `DatabaseSeeder` no los ejecuta automáticamente, pueden correrse manualmente:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan db:seed --class=SeguridadInicialSeeder
```

y:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan db:seed --class=AdministradorInicialSeeder
```

Antes de ejecutar un seeder varias veces, revisar que sea idempotente o que no vaya a generar duplicados.

---

# 12. Usuario administrador de desarrollo

Actualmente existe un administrador de desarrollo:

```text
Usuario: admin
Correo: admin@dulcebocado.local
Contraseña: Cambiar123!
Rol: Administrador
```

Esta credencial es únicamente para desarrollo/local.

No debe utilizarse como contraseña definitiva en producción.

---

# 13. Configuración del API Gateway

Nginx debe enviar las rutas del módulo Seguridad al `security-service`.

La configuración utilizada es equivalente a:

```nginx
events {}

http {
    upstream security_service {
        server security-service:8000;
    }

    upstream legacy_backend {
        server backend:8000;
    }

    server {
        listen 80;

        location = /health {
            add_header Content-Type text/plain;
            return 200 "gateway-ok";
        }

        location /api/auth/ {
            proxy_pass http://security_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/usuarios {
            proxy_pass http://security_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/roles {
            proxy_pass http://security_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/permisos {
            proxy_pass http://security_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/asignaciones {
            proxy_pass http://security_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ {
            proxy_pass http://legacy_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /sanctum/ {
            proxy_pass http://legacy_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

IMPORTANTE:

Las rutas:

```text
/api/usuarios
/api/roles
/api/permisos
/api/asignaciones
```

deben estar definidas SIN `/` final en el `location`.

Anteriormente:

```nginx
location /api/usuarios/ {
```

provocaba:

```text
301 Redirect
```

cuando React o PowerShell consultaban:

```text
/api/usuarios
```

Después de modificar Nginx se debe reconstruir la imagen del Gateway:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d --build --force-recreate gateway
```

Verificar:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec gateway nginx -t
```

Debe indicar:

```text
syntax is ok
test is successful
```

Prueba del Gateway:

```powershell
curl.exe -i http://localhost:8080/health
```

Respuesta esperada:

```text
HTTP/1.1 200 OK
gateway-ok
```

---

# 14. Configuración del frontend

Archivo:

```text
frontend/.env
```

Debe contener:

```env
VITE_API_URL=http://localhost:8080
```

Después de modificar variables de Vite reiniciar el frontend:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml restart frontend
```

---

# 15. Autenticación implementada — T03

Endpoints actuales:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Todos pasan por el Gateway:

```text
http://localhost:8080
```

Ejemplo de login:

```json
{
  "nombre_usuario": "admin",
  "contrasena": "Cambiar123!"
}
```

Respuesta aproximada:

```json
{
  "message": "Autenticación correcta.",
  "token": "ID|TOKEN",
  "token_type": "Bearer",
  "usuario": {
    "id_usuario": 1,
    "nombre": "Administrador Dulce Bocado",
    "nombre_usuario": "admin",
    "correo_electronico": "admin@dulcebocado.local",
    "activo": true,
    "roles": [
      "Administrador"
    ],
    "permisos": [
      "seguridad.gestionar_usuario",
      "seguridad.gestionar_rol",
      "seguridad.gestionar_permiso",
      "seguridad.gestionar_rol_permiso",
      "seguridad.asignar_roles_permisos"
    ]
  }
}
```

Comportamientos ya probados:

- Login válido → 200 + token.
- Contraseña incorrecta → 401.
- Endpoint protegido sin token → 401.
- `/api/auth/me` con token válido → usuario autenticado.
- Logout → elimina el token actual.
- Reutilizar el token después del logout → 401.
- Usuario desactivado → login rechazado.

---

# 16. AuthController implementado

Archivo:

```text
microservices/security-service/app/Http/Controllers/AuthController.php
```

Funciones actuales:

```text
login()
me()
logout()
datosUsuario()
```

`datosUsuario()` devuelve también:

```text
roles
permisos
```

obtenidos mediante:

```text
Usuario
  -> UsuarioRolPermiso
      -> RolPermiso
          -> Rol
          -> Permiso
```

Solo roles y permisos activos son considerados.

---

# 17. Modelo Usuario

Archivo:

```text
microservices/security-service/app/Models/Usuario.php
```

Incluye:

- soporte Sanctum;
- relación `usuarioRolPermisos`;
- `getAuthPassword()`;
- método `tienePermiso()`.

El método:

```php
$usuario->tienePermiso('seguridad.gestionar_usuario')
```

es utilizado por el backend para validar autorización.

---

# 18. Frontend de autenticación — T04

Archivos principales:

```text
frontend/src/services/authService.js
frontend/src/context/AuthContext.jsx
frontend/src/pages/LoginPage.jsx
frontend/src/components/ProtectedRoute.jsx
frontend/src/App.jsx
frontend/src/main.jsx
frontend/src/layouts/MainLayout.jsx
```

El token se almacena actualmente en:

```text
localStorage
```

clave:

```text
dulce_bocado_token
```

El flujo es:

```text
Login
  -> recibe token
  -> guarda token
  -> actualiza AuthContext
  -> entra al sistema
  -> al recargar ejecuta /api/auth/me
```

Logout:

```text
POST /api/auth/logout
  -> elimina token en backend
  -> elimina token local
  -> vuelve a /login
```

---

# 19. Menú y rutas por permisos — T05

El frontend ya utiliza autorización por permisos.

Ejemplo:

```jsx
<ProtectedRoute permiso="seguridad.gestionar_usuario" />
```

El contexto posee:

```javascript
tienePermiso(permiso)
```

que verifica:

```javascript
usuario.permisos.includes(permiso)
```

El `Sidebar.jsx` filtra automáticamente opciones según los permisos recibidos desde `/api/auth/me`.

Actualmente Seguridad contiene:

```text
Usuarios
Roles
Permisos
Rol - Permiso
Asignaciones
```

Permisos asociados:

```text
seguridad.gestionar_usuario
seguridad.gestionar_rol
seguridad.gestionar_permiso
seguridad.gestionar_rol_permiso
seguridad.asignar_roles_permisos
```

Un usuario sin permiso para una ruta es enviado a:

```text
/acceso-denegado
```

---

# 20. API de Usuarios — T06

Archivo:

```text
microservices/security-service/app/Http/Controllers/UsuarioController.php
```

Rutas implementadas:

```text
GET    /api/usuarios
POST   /api/usuarios
GET    /api/usuarios/{usuario}
PUT    /api/usuarios/{usuario}
PATCH  /api/usuarios/{usuario}
PATCH  /api/usuarios/{usuario}/estado
```

No se implementó DELETE físico.

El usuario se activa/desactiva mediante:

```text
PATCH /api/usuarios/{id}/estado
```

Ejemplo:

```json
{
  "activo": false
}
```

Al desactivar un usuario también se eliminan sus tokens activos.

Todos estos endpoints:

1. Exigen `auth:sanctum`.
2. Exigen el permiso:

```text
seguridad.gestionar_usuario
```

---

# 21. Validaciones de Usuarios

Al crear un usuario:

```text
nombre              requerido
nombre_usuario      requerido y único
correo_electronico  requerido, email y único
contrasena          requerida, mínimo 8 caracteres
activo              booleano opcional
```

Las contraseñas se almacenan mediante:

```php
Hash::make(...)
```

Al editar:

- nombre puede modificarse;
- nombre de usuario puede modificarse respetando unicidad;
- correo puede modificarse respetando unicidad;
- contraseña es opcional;
- si contraseña queda vacía no se modifica.

---

# 22. Pruebas completadas de Usuarios

Se validaron correctamente:

### PS1-07 — Registrar usuario

Resultado:

```text
Usuario creado correctamente.
```

### PS1-08 — Usuario duplicado

Se probó:

- nombre_usuario duplicado;
- correo electrónico duplicado.

Resultado:

```text
422 Unprocessable Content
```

### PS1-09 — Modificar usuario

Resultado:

```text
Usuario actualizado correctamente.
```

### PS1-10 — Desactivar usuario

Resultado:

```text
Usuario desactivado correctamente.
```

Después se intentó iniciar sesión con dicho usuario y se obtuvo:

```text
401 Unauthorized
```

---

# 23. Interfaz de Gestión de Usuarios — T07

Archivos principales:

```text
frontend/src/pages/seguridad/UsuariosPage.jsx
frontend/src/services/usuarioService.js
```

La pantalla permite:

- listar usuarios;
- registrar usuario;
- editar usuario;
- activar usuario;
- desactivar usuario;
- visualizar estado;
- mostrar errores de validación;
- impedir confirmaciones de contraseña diferentes.

`usuarioService.js` fue migrado al nuevo esquema Bearer Token.

Ya NO utiliza:

```text
/sanctum/csrf-cookie
X-XSRF-TOKEN
credentials: include
/api/seguridad/usuarios
```

Ahora utiliza:

```text
/api/usuarios
```

con:

```http
Authorization: Bearer <token>
```

La interfaz fue probada desde:

```text
http://localhost:5173/seguridad/usuarios
```

---

# 24. Compilar el frontend

Para verificar que React esté correcto:

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec frontend npm run build
```

Actualmente el proyecto compila correctamente.

Puede aparecer un warning indicando que un bundle supera los 500 kB.

Ejemplo:

```text
Some chunks are larger than 500 kB after minification
```

Esto es únicamente una recomendación de optimización y no impide que el Sprint funcione.

---

# 25. URLs importantes

Frontend:

```text
http://localhost:5173
```

Login:

```text
http://localhost:5173/login
```

Usuarios:

```text
http://localhost:5173/seguridad/usuarios
```

Gateway:

```text
http://localhost:8080
```

Health Gateway:

```text
http://localhost:8080/health
```

Security service directo:

```text
http://localhost:8001
```

Normalmente React debe usar el Gateway y NO acceder directamente a `8001`.

---

# 26. Pruebas rápidas después de instalar

## Gateway

```powershell
curl.exe -i http://localhost:8080/health
```

Debe responder:

```text
gateway-ok
```

## Rutas de Laravel

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan route:list
```

## Usuarios

Debe aparecer al menos:

```text
GET|HEAD   api/usuarios
POST       api/usuarios
GET|HEAD   api/usuarios/{usuario}
PUT|PATCH  api/usuarios/{usuario}
PATCH      api/usuarios/{usuario}/estado
```

## Login

Ingresar desde:

```text
http://localhost:5173/login
```

con:

```text
admin
Cambiar123!
```

Después comprobar que el menú Seguridad muestre:

```text
Usuarios
Roles
Permisos
Rol - Permiso
Asignaciones
```

---

# 27. Tareas realizadas por Juan Pablo

## T01 — Infraestructura base

Realizado:

- estructura de microservicios;
- Docker Compose;
- `security-service`;
- PostgreSQL de Seguridad;
- frontend;
- API Gateway Nginx;
- enrutamiento de Seguridad y backend anterior.

Estado:

```text
DONE
```

---

## T02 — Base de datos de Seguridad

Realizado:

- tablas de usuarios;
- roles;
- permisos;
- rol_permiso;
- usuario_rol_permiso;
- relaciones Eloquent;
- seeders;
- administrador inicial;
- migración de tokens de Sanctum.

Estado:

```text
DONE
```

---

## T03 — Autenticación

Realizado:

- login;
- logout;
- `/api/auth/me`;
- Bearer Token;
- Sanctum;
- endpoints protegidos;
- HTTP 401 en credenciales incorrectas;
- bloqueo de usuario inactivo;
- invalidación del token al cerrar sesión.

Estado:

```text
DONE
```

---

## T04 — Interfaz Login/Logout

Realizado:

- login React conectado al Gateway;
- almacenamiento del token;
- recuperación de sesión;
- logout;
- redirecciones;
- rutas protegidas.

Estado:

```text
DONE
```

---

## T05 — Menú y rutas según permisos

Realizado:

- roles y permisos enviados desde `/api/auth/login` y `/api/auth/me`;
- `tienePermiso()`;
- `ProtectedRoute`;
- Sidebar dinámico;
- acceso denegado para rutas no autorizadas.

Estado:

```text
DONE
```

---

## T06 — API de Usuarios

Realizado:

- listar;
- consultar;
- registrar;
- modificar;
- activar;
- desactivar;
- validación de duplicados;
- autorización por permiso;
- contraseña hash;
- revocación de tokens al desactivar.

Estado:

```text
DONE
```

---

## T07 — Interfaz de Usuarios

Realizado:

- listado React;
- registro;
- edición;
- activar/desactivar;
- manejo de errores;
- validación de contraseña;
- integración completa mediante Gateway.

Estado:

```text
DONE
```

---

# 28. Trabajo pendiente para el compañero

Las tareas siguientes todavía deben desarrollarse.

---

## T08 — API de Roles y Permisos

Debe implementar en `security-service`:

### Roles

```text
GET  /api/roles
POST /api/roles
PUT/PATCH /api/roles/{id}
```

Debe permitir:

- listar roles;
- registrar roles;
- modificar roles;
- activar/desactivar roles;
- rechazar nombres duplicados.

Roles mínimos definidos para el sistema:

```text
Administrador
Vendedor
Producción
```

Pruebas relacionadas:

```text
PS1-11 Registrar rol
PS1-12 Rol duplicado
```

### Permisos

Implementar:

```text
GET  /api/permisos
POST /api/permisos
PUT/PATCH /api/permisos/{id}
```

Debe permitir:

- listar permisos;
- registrar permisos;
- modificar permisos;
- gestionar estado si corresponde;
- impedir duplicados.

Prueba relacionada:

```text
PS1-13 Registrar permiso
```

Todos estos endpoints deben usar:

```text
auth:sanctum
```

y comprobar el permiso correspondiente.

---

# 29. T09 — Interfaz de Roles y Permisos

Ya existen rutas/páginas frontend:

```text
frontend/src/pages/seguridad/RolesPage.jsx
frontend/src/pages/seguridad/PermisosPage.jsx
```

También existen servicios antiguos:

```text
frontend/src/services/rolService.js
frontend/src/services/permisoService.js
```

Antes de utilizarlos debe revisar si todavía usan:

```text
CSRF
cookies
credentials: include
/api/seguridad/...
```

Si es así, deben migrarse al esquema utilizado actualmente:

```http
Authorization: Bearer <token>
```

utilizando:

```text
VITE_API_URL=http://localhost:8080
```

La interfaz debe consumir siempre el Gateway.

---

# 30. T10 — API Rol-Permiso y Asignaciones

Debe implementar:

```text
GET /api/roles/{id}/permisos
PUT /api/roles/{id}/permisos
```

Objetivo:

- consultar permisos asociados a un rol;
- asignar/reemplazar permisos del rol.

También:

```text
GET    /api/usuarios/{id}/accesos
POST   /api/asignaciones
DELETE /api/asignaciones/{id}
```

Objetivo:

- consultar accesos de un usuario;
- asignar una relación rol-permiso a usuario;
- retirar una asignación.

Pruebas:

```text
PS1-14 Asociar permiso a rol
PS1-15 Retirar permiso del rol
PS1-16 Asignar acceso
PS1-17 Retirar acceso
```

---

# 31. T11 — Interfaz de asociaciones y asignaciones

Ya existen páginas:

```text
frontend/src/pages/seguridad/RolPermisoPage.jsx
frontend/src/pages/seguridad/AsignacionesPage.jsx
```

Y servicios:

```text
frontend/src/services/rolPermisoService.js
frontend/src/services/usuarioRolPermisoService.js
```

Deben revisarse y migrarse al nuevo contrato del `security-service` si aún utilizan el backend anterior.

El usuario administrador debe poder:

- elegir rol;
- ver permisos;
- asociar permisos;
- retirar permisos;
- elegir usuario;
- asignar accesos;
- retirar accesos.

---

# 32. T12 — Pruebas de Seguridad

Debe completarse el plan de pruebas del Sprint.

Ya están validadas varias:

```text
PS1-01 Login válido
PS1-02 Contraseña incorrecta
PS1-04 Endpoint sin token
PS1-06 Logout
PS1-07 Registrar usuario
PS1-08 Usuario duplicado
PS1-09 Modificar usuario
PS1-10 Desactivar usuario
PS1-18 Menú dinámico parcialmente
PS1-19 Gateway parcialmente
```

Todavía deben revisarse especialmente:

```text
PS1-03 Usuario desactivado
PS1-05 Usuario autenticado sin permiso -> HTTP 403
PS1-11 Registrar rol
PS1-12 Rol duplicado
PS1-13 Registrar permiso
PS1-14 Asociar permiso a rol
PS1-15 Retirar permiso del rol
PS1-16 Asignar acceso
PS1-17 Retirar acceso
PS1-18 Menú dinámico con distintos usuarios
PS1-19 Todas las rutas mediante Gateway
PS1-20 Persistencia después de reiniciar contenedores
```

Cada prueba debe registrar:

```text
ID
Descripción
Precondición
Resultado esperado
Resultado obtenido
Estado: Aprobado / Observado
```

---

# 33. T13 — Verificación completa React → Gateway

Al finalizar T08-T12 debe probarse todo desde React.

No basta con que funcione usando:

```text
localhost:8001
```

La evidencia final debe usar:

```text
React -> http://localhost:8080 -> Gateway -> security-service
```

Debe poder demostrarse:

1. Login.
2. Logout.
3. Usuario válido.
4. Usuario inactivo.
5. Gestión de usuarios.
6. Gestión de roles.
7. Gestión de permisos.
8. Asociación rol-permiso.
9. Asignación de accesos.
10. Menú dinámico.
11. Rechazo de acceso a usuarios sin permiso.
12. Persistencia después de reiniciar los contenedores.

---

# 34. Regla importante para continuar el desarrollo

No volver a utilizar el antiguo sistema de autenticación basado en:

```text
Laravel session
CSRF cookie
XSRF-TOKEN
credentials: include
```

Para el Sprint 1 de microservicios, Seguridad quedó estandarizada en:

```text
Laravel Sanctum Personal Access Token
Authorization: Bearer <token>
```

Los servicios React deben reutilizar:

```text
frontend/src/services/authService.js
```

especialmente:

```javascript
obtenerToken()
eliminarToken()
ApiError
```

---

# 35. Regla sobre el Gateway

El frontend NO debe llamar directamente:

```text
http://localhost:8001
```

Debe llamar:

```text
http://localhost:8080
```

mediante:

```env
VITE_API_URL=http://localhost:8080
```

El puerto `8001` queda solamente para pruebas directas y diagnóstico.

---

# 36. Comandos útiles

## Ver contenedores

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml ps
```

## Ver logs de security-service

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml logs security-service --tail=100
```

## Ver logs del Gateway

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml logs gateway --tail=100
```

## Limpiar caché Laravel

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan optimize:clear
```

## Ver rutas

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec security-service php artisan route:list
```

## Ver configuración Nginx activa

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec gateway nginx -T
```

## Validar Nginx

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec gateway nginx -t
```

## Build frontend

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml exec frontend npm run build
```

## Reconstruir Gateway

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d --build --force-recreate gateway
```

## Reconstruir todo

```powershell
docker compose -f docker-compose.yml -f docker-compose.sprint1.yml up -d --build
```

---

# 37. Checklist para el compañero

Antes de empezar T08 verificar:

- [ ] Repositorio actualizado.
- [ ] Está trabajando en la rama correcta.
- [ ] Docker Desktop está iniciado.
- [ ] `docker-compose.yml` existe.
- [ ] `docker-compose.sprint1.yml` existe.
- [ ] Todos los contenedores están `Up`.
- [ ] `http://localhost:8080/health` devuelve `gateway-ok`.
- [ ] `security-service` usa PostgreSQL y no SQLite.
- [ ] Migraciones están ejecutadas.
- [ ] Existe `personal_access_tokens`.
- [ ] Puede iniciar sesión como administrador.
- [ ] Login devuelve rol y permisos.
- [ ] Puede entrar a `/seguridad/usuarios`.
- [ ] Puede registrar un usuario.
- [ ] Puede editarlo.
- [ ] Puede desactivarlo y activarlo.
- [ ] El frontend usa `VITE_API_URL=http://localhost:8080`.
- [ ] Las rutas del Gateway para Seguridad no producen `301`.
- [ ] `npm run build` termina correctamente.

Si todo lo anterior está correcto, puede comenzar T08 sin modificar T01-T07.

---

# 38. Resumen para continuar

El bloque desarrollado hasta ahora deja operativo:

```text
Infraestructura
        ↓
PostgreSQL Seguridad
        ↓
Sanctum Bearer Token
        ↓
Login / Logout / Me
        ↓
Roles y permisos en sesión
        ↓
ProtectedRoute
        ↓
Sidebar dinámico
        ↓
API Gestión Usuarios
        ↓
Interfaz Gestión Usuarios
```

El siguiente bloque debe desarrollar:

```text
T08 Roles/Permisos API
        ↓
T09 Roles/Permisos React
        ↓
T10 Rol-Permiso/Asignaciones API
        ↓
T11 Rol-Permiso/Asignaciones React
        ↓
T12 Pruebas de seguridad
        ↓
T13 Verificación completa
```

La recomendación es **no modificar lo ya probado de T01-T07 salvo que una dependencia real de T08-T13 lo requiera**.

---

## Estado de entrega

```text
T01 ✅
T02 ✅
T03 ✅
T04 ✅
T05 ✅
T06 ✅
T07 ✅

T08 ⬜
T09 ⬜
T10 ⬜
T11 ⬜
T12 ⬜
T13 ⬜
```

Documento preparado para transferencia de trabajo del Sprint 1 — Dulce Bocado.
