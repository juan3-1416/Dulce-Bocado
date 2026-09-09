# Resumen de Ejecución: Configuración .env y CU6 (Asignar Roles y Permisos)

## 1. Archivos de Entorno Creados
- **`.env` (Raíz):** Configuración de variables PostgreSQL para los contenedores Docker (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`).
- **`backend/.env`:** Configuración completa de Laravel (conexión `pgsql`, Sanctum stateful domains para Vite en puerto 5173, credenciales del seeder administrador).

## 2. Backend Desarrollado (CU6)
- **Form Requests (`backend/app/Http/Requests/Seguridad/`):**
  - `StoreUsuarioRolPermisoRequest.php`: Valida `usuario_id` (activo), `rol_permiso_id` (activo) y previene duplicados con regla unique.
  - `AsignarRolAUsuarioRequest.php`: Valida `usuario_id` y `rol_id` para asignación en bloque de todos los permisos del rol.
  - `QuitarRolDeUsuarioRequest.php`: Valida `usuario_id` y `rol_id` para revocación en bloque.
- **Controlador (`backend/app/Http/Controllers/Api/Seguridad/`):**
  - `UsuarioRolPermisoController.php`:
    - `index()`: Consulta y lista asignaciones con filtrado opcional por usuario.
    - `catalogos()`: Retorna usuarios activos, roles activos y relaciones rol-permiso disponibles.
    - `store()`: Asigna un permiso individual de un rol a un usuario.
    - `asignarRol()`: Asigna todos los permisos activos de un rol a un usuario.
    - `destroy()`: Elimina una asignación individual.
    - `quitarRol()`: Revoca todos los permisos de un rol específico a un usuario.
- **Rutas (`backend/routes/api.php`):**
  - Grupo de rutas bajo `/api/seguridad` protegido con middleware `['auth:sanctum', 'permiso:seguridad.asignar_roles_permisos']`.

## 3. Frontend Desarrollado (CU6)
- **Servicio (`frontend/src/services/`):**
  - `usuarioRolPermisoService.js`: Funciones con protección CSRF y credenciales de sesión Sanctum para comunicarse con la API.
- **Vista (`frontend/src/pages/seguridad/`):**
  - `AsignacionesPage.jsx`: Interfaz completa con:
    1. Formulario 1: Asignar Rol Completo.
    2. Formulario 2: Asignar Permiso Específico.
    3. Filtros combinados por Usuario y Rol.
    4. Botón para revocar el rol completo del usuario filtrado.
    5. Tabla responsiva con estados, detalles y botón de eliminación individual con confirmación.
- **Enrutamiento (`frontend/src/App.jsx`):**
  - Conexión de `/seguridad/asignaciones` a `AsignacionesPage` protegida con el permiso correspondiente.

## 4. Estado en AGENTS.md
- Se actualizó la tabla de Casos de Uso marcando el **CU6 como COMPLETADO ✅**.
