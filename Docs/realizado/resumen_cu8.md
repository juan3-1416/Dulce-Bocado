# Resumen Oficial — CU8: Gestionar Cliente

**Estado:** ✅ COMPLETADO

Este documento consolida la implementación completa del **Caso de Uso 8 (CU8): Gestionar Cliente**, cumpliendo con la arquitectura monolítica modular, las reglas de negocio de pedidos no presenciales y el control de acceso RBAC definidas en `AGENTS.md`.

---

## 1. Contexto de Negocio y Enfoque del Módulo
- **Compras Presenciales (Mostrador - CU10):** Las ventas directas en mostrador no exigen registro obligatorio de cliente, agilizando el despacho rápido de productos.
- **Clientes Registrados (Pedidos no presenciales - CU14–15):** La tabla `cliente` y sus interfaces están diseñadas primordialmente para registrar a quienes realizan encargos anticipados, reservas y despachos a domicilio.
- **Datos Clave:** Prioridad operativa para **Teléfono / WhatsApp de contacto**, **Dirección / Referencias de entrega**, **Nombre / Razón Social** y un campo flexible de **Observaciones** para notas especiales del pedido.

---

## 2. Base de Datos y Permisos RBAC (Fase 1)
- **Migración incremental:** `2026_09_04_000001_create_cliente_table.php`
  - Tabla `cliente`: `id_cliente` (PK), `nombre`, `apellido` (nullable), `ci_nit` (unique, nullable), `telefono` (nullable), `correo_electronico` (nullable), `direccion` (nullable), `observaciones` (text, nullable), `estado` (boolean, default true), `fecha_creacion` y `fecha_actualizacion`.
- **Seeder:** `ClientesInicialSeeder`
  - Registra el permiso `clientes.gestionar_cliente`.
  - Asigna el permiso a los roles **Administrador** y **Vendedor**.
  - Asigna el permiso a los usuarios existentes en `usuario_rol_permiso`.
  - Registra clientes de prueba orientados a encargos y despachos.
- **Integración:** `DatabaseSeeder` actualizado con la llamada a `ClientesInicialSeeder`.

---

## 3. Modelos Eloquent y Form Requests (Fase 2)
- **Modelo `Cliente.php` (`backend/app/Models/`):**
  - Mapeo a la tabla `cliente` con `$primaryKey = 'id_cliente'`.
  - Timestamps personalizados: `fecha_creacion` y `fecha_actualizacion`.
  - Tipado (`$casts`) para `estado => boolean` y fechas.
  - Accesor `nombre_completo` para presentación en listas y futuras ventas/pedidos.
- **Form Requests (`backend/app/Http/Requests/Clientes/`):**
  - `StoreClienteRequest.php`: Validación de nombre obligatorio, unicidad de CI/NIT y límites de longitud.
  - `UpdateClienteRequest.php`: Excluye el ID del cliente actual al evaluar la unicidad de CI/NIT.
  - `UpdateEstadoClienteRequest.php`: Validación estricta del campo `estado` booleano.

---

## 4. Controladores y Rutas API (Fase 3)
- **Controlador `ClienteController.php` (`backend/app/Http/Controllers/Api/Clientes/`):**
  - `index`: Soporta búsqueda insensible a mayúsculas (`ilike`) por nombre, apellido, CI/NIT, teléfono o dirección, además de filtro por estado lógico.
  - `show`: Obtiene el detalle de un cliente específico.
  - `store`: Creación y retorno con código HTTP 201.
  - `update`: Modificación y retorno con código HTTP 200.
  - `updateEstado`: Cambio rápido de estado activo/inactivo.
- **Rutas API (`backend/routes/api.php`):**
  - Grupo `/api/clientes` protegido globalmente por `auth:sanctum` y validación granular por middleware `permiso:clientes.gestionar_cliente`.
  - Constraint numérico `->whereNumber('id')` en todas las rutas con parámetros de ID.

---

## 5. Frontend, Vistas y Barra Lateral (Fase 4)
- **Servicio `clienteService.js` (`frontend/src/services/`):**
  - Métodos con manejo de cookies de sesión Sanctum y encabezado `X-XSRF-TOKEN`: `listarClientes`, `obtenerCliente`, `crearCliente`, `actualizarCliente`, `cambiarEstadoCliente`.
- **Componentes (`frontend/src/pages/clientes/`):**
  - `ClientesPage.jsx`: Vista principal con métricas (total, activos, con teléfono), buscador reactivo en tiempo real, filtro por estado, tabla responsiva con badges de contacto y soporte para expandir notas de entrega.
  - `ClienteModal.jsx`: Modal responsivo para alta y edición, con énfasis en teléfono/WhatsApp y dirección, capturando errores 422 devueltos por el backend.
- **Navegación:**
  - `Sidebar.jsx`: Sección **Clientes** visible en el menú acordeón bajo el permiso `clientes.gestionar_cliente` con acceso a **Directorio de Clientes**.
  - `App.jsx`: Ruta `/clientes` protegida por `<ProtectedRoute permiso="clientes.gestionar_cliente" />`.

---

## 6. Verificación y Pruebas (Fase 5)
- **Pruebas Automatizadas:** `backend/tests/Feature/ClienteApiTest.php`
  - 8 pruebas ejecutadas con 22 aserciones pasando al 100%:
    - Rechazo 401 a peticiones no autenticadas.
    - Rechazo 403 a usuarios autenticados sin permiso.
    - Listado de clientes autorizados (Admin/Vendedor).
    - Creación con datos específicos de pedidos (201).
    - Validación de CI/NIT duplicado (422).
    - Actualización de datos de entrega y notas (200).
    - Activación y desactivación lógica del cliente (200).
    - Búsqueda reactiva por teléfono / WhatsApp (200).
- **Compilación Frontend:** `vite build` ejecutado exitosamente sin errores de empaquetado ni dependencias rotas.
