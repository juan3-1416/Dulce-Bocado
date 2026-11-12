# T203 — Interfaz de gestión de clientes

**Fecha:** 12-11-2026

**Rama:** `devFabian`
**Estado:** implementado en código; verificación funcional pendiente.

## Punto de partida

`dev-jp` entregó T201–T202: `customer-service` sobre PostgreSQL, rutas `/api/clientes`, autorización con permisos `clientes.ver`, `clientes.crear`, `clientes.modificar` y `clientes.cambiar_estado`, además de enrutamiento por Gateway. La pantalla React existente todavía utilizaba cookies, CSRF y el permiso `clientes.gestionar_cliente` del backend legado.

## Cambio realizado

- `clienteService.js` usa `VITE_API_URL`, Gateway y token Bearer para listar, consultar, crear, modificar y cambiar estado.
- La ruta y el menú usan `clientes.ver`; las acciones de la pantalla se muestran según su permiso específico.
- El filtro de estado envía correctamente `0` para inactivos y `1` para activos.
- El formulario conserva los campos admitidos por Customer. La edición no cambia el estado; esa operación usa exclusivamente `PATCH /api/clientes/{id}/estado`.
- Los errores de validación `422` se muestran por campo y los errores generales se muestran en la pantalla o formulario.

## Verificación y pendientes

`git diff --check` no reportó errores en los cambios. La compilación y las pruebas React → Gateway → Customer están pendientes: el equipo local no tiene `vite` instalado y la instalación de dependencias no completó por falta de acceso efectivo al registro. Tampoco hay contenedor frontend del proyecto en ejecución. Antes de marcar T203 como terminada, ejecutar `npm ci && npm run build` en `frontend/` y probar con un usuario autorizado: lista, búsqueda, filtro inactivo, alta, edición, desactivación/reactivación, validación `422` y acceso con permisos de solo lectura.

**Siguiente dependencia del Sprint 2:** T204–T205, Catalog real. Después corresponde T206 en React y completar T216 de Ventas con Catalog integrado.
