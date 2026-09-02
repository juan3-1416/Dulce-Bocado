# Plan de Implementación: Configuración Inicial (.env) y CU6 — Asignar Roles y Permisos

Este documento detalla la configuración del entorno (.env) y el plan de desarrollo paso a paso para el **Caso de Uso 6 (CU6): Asignar Roles y Permisos**, respetando estrictamente las directrices del proyecto y el archivo [AGENTS.md](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/AGENTS.md).

---

## 1. Estado Actual y Contexto

- **Casos de uso completados:**
  - CU1: Autenticar Usuario ✅
  - CU2: Gestionar Usuario ✅
  - CU3: Gestionar Rol ✅
  - CU4: Gestionar Permiso ✅
  - CU5: Gestionar Rol-Permiso ✅
- **Caso de uso a implementar:**
  - **CU6: Asignar Roles y Permisos** 🔧

### Modelo RBAC del Sistema
El sistema implementa el siguiente flujo estricto:
```
Usuario ──(1:N)──> UsuarioRolPermiso ──(N:1)──> RolPermiso ──(N:1)──> (Rol + Permiso)
```
- No existe columna de texto para rol en `usuarios`.
- No se crean asignaciones directas `usuario -> rol` ni `usuario -> permiso`.
- Se asigna un registro existente de `rol_permiso` a un `usuario` a través de la tabla intermedia `usuario_rol_permiso`.
- Permiso requerido: `seguridad.asignar_roles_permisos`.

---

## 2. Fase 1: Definición y Creación de Archivos `.env`

Se crearán los archivos de configuración requeridos a partir de sus respectivos `.env.example`:

1. **`.env` (Raíz del proyecto):**
   - Configuración de PostgreSQL para el contenedor Docker (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`).
2. **`backend/.env`:**
   - Configuración de Laravel (App Key, conexión a BD PostgreSQL, dominios stateful de Sanctum, credenciales iniciales del Administrador para seeders).

---

## 3. Fase 2: Backend para CU6 (Asignar Roles y Permisos)

### 3.1. Form Requests (`backend/app/Http/Requests/Seguridad/`)
- `StoreUsuarioRolPermisoRequest.php`:
  - Valida `usuario_id` (requerido, entero, debe existir en `usuarios` y estar `activo = true`).
  - Valida `rol_permiso_id` (requerido, entero, debe existir en `rol_permiso`).
  - Valida unicidad `(usuario_id, rol_permiso_id)` en `usuario_rol_permiso`.
- `AsignarRolAUsuarioRequest.php`:
  - Valida `usuario_id` y `rol_id` para permitir la asignación masiva de todos los `rol_permiso` activos pertenecientes a un rol hacia un usuario.

### 3.2. Controlador (`backend/app/Http/Controllers/Api/Seguridad/UsuarioRolPermisoController.php`)
- `index(Request $request)`:
  - Lista todas las asignaciones o filtra por `usuario_id`.
  - Retorna usuario, rol, permiso y estado.
- `catalogos()`:
  - Retorna lista de usuarios activos (`id_usuario`, `nombre`, `nombre_usuario`).
  - Retorna lista de roles activos (`id_rol`, `nombre`).
  - Retorna lista de relaciones `rol_permiso` disponibles con sus respectivos roles y permisos activos.
- `store(StoreUsuarioRolPermisoRequest $request)`:
  - Asigna una relación individual `rol_permiso` a un usuario.
- `asignarRol(AsignarRolAUsuarioRequest $request)`:
  - Asigna en bloque todos los permisos asociados a un rol a un usuario (utilizando `firstOrCreate` para evitar duplicados).
- `destroy(int $id)`:
  - Elimina una asignación individual (`id_usuario_rol_permiso`).
- `quitarRol(Request $request)`:
  - Permite desasignar todas las relaciones `rol_permiso` de un rol específico a un usuario.

### 3.3. Rutas (`backend/routes/api.php`)
- Grupo protegido bajo middleware `['auth:sanctum', 'permiso:seguridad.asignar_roles_permisos']` con prefijo `/seguridad`:
  - `GET /usuario-rol-permisos` -> `index`
  - `GET /usuario-rol-permisos/catalogos` -> `catalogos`
  - `POST /usuario-rol-permisos` -> `store`
  - `POST /usuario-rol-permisos/asignar-rol` -> `asignarRol`
  - `DELETE /usuario-rol-permisos/{id}` -> `destroy`
  - `POST /usuario-rol-permisos/quitar-rol` -> `quitarRol`

---

## 4. Fase 3: Frontend para CU6

### 4.1. Servicio (`frontend/src/services/usuarioRolPermisoService.js`)
- `listarUsuarioRolPermisos(usuarioId = null)`
- `obtenerCatalogosUsuarioRolPermiso()`
- `asignarUsuarioRolPermiso(usuarioId, rolPermisoId)`
- `asignarRolAUsuario(usuarioId, rolId)`
- `quitarUsuarioRolPermiso(idUsuarioRolPermiso)`
- `quitarRolAUsuario(usuarioId, rolId)`

### 4.2. Vista de Asignaciones (`frontend/src/pages/seguridad/AsignacionesPage.jsx`)
- Selector de Usuario para ver y gestionar sus asignaciones actuales.
- Modal o formulario para:
  1. Asignar un Rol completo a un usuario (asigna todos los permisos del rol).
  2. Asignar o desasignar permisos individuales de un rol.
- Tabla detallada con: ID asignación, Usuario, Rol, Permiso, Descripción y Botón de Quitar/Revocar.
- Filtros por usuario y rol.
- Manejo de estados de carga, confirmaciones de eliminación y feedback visual de errores y éxitos.

### 4.3. Rutas y Navegación
- Reemplazar en `frontend/src/App.jsx` la ruta `/seguridad/asignaciones` para apuntar a `AsignacionesPage` en lugar de `SeguridadPage`.

---

## 5. Plan de Verificación

### Backend
1. Verificar que los Form Requests validen correctamente IDs inexistentes o duplicados (retorno 422).
2. Probar endpoints con usuario autenticado sin permiso `seguridad.asignar_roles_permisos` (retorno 403).
3. Probar endpoints con Administrador:
   - Listar catálogos (200).
   - Asignar un rol completo a un usuario vendedor/producción (200/201).
   - Asignar un permiso específico a un usuario (201).
   - Intentar duplicar asignación (422).
   - Eliminar una asignación (200).

### Frontend
1. Iniciar sesión como Administrador.
2. Navegar a **Seguridad > Asignaciones**.
3. Seleccionar un usuario, asignarle un rol o un permiso específico.
4. Validar que la tabla se actualice inmediatamente.
5. Iniciar sesión con el usuario modificado y comprobar que solo puede ver los módulos y rutas correspondientes a sus permisos asignados.
