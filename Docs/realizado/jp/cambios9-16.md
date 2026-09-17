# RESUMEN DE CAMBIOS REALIZADOS – SIMPLIFICACIÓN DE FLUJOS Y SEGURIDAD

## Proyecto Dulce Bocado

**Sistema:** Sistema de Información Web para la Gestión de Ventas, Pedidos, Producción e Inventario de una Pastelería y Repostería.

**Objetivo de los cambios:** Simplificar los procesos operativos del sistema sin eliminar funcionalidades existentes, manteniendo la estructura actual de base de datos, el control de acceso RBAC y los módulos ya implementados.

---

## 1. Simplificación del Sidebar de Producción

Se eliminó del Sidebar la opción visible **Consumo, Costo y Desperdicio**, debido a que redirigía a la misma funcionalidad disponible dentro del módulo de Producción.

### Resultado

```text
Producción
└── Producción
```

La funcionalidad del CU17 continúa existiendo internamente. No se eliminaron controladores, servicios, rutas, permisos, tablas ni información histórica.

---

## 2. Decisión sobre Ingresos y Egresos de Inventario

Inicialmente se planteó automatizar los egresos al realizar una producción y los ingresos al completar una producción exitosa.

Después de revisar el alcance, se decidió mantener estos módulos sin cambios.

```text
Ingresos de Inventario → Sin cambios
Egresos de Inventario  → Sin cambios
Producción              → Sin nuevas automatizaciones de inventario
```

---

## 3. Simplificación del Flujo de Ventas

Antes:

```text
Registrar Venta
↓
Ir a Pagos
↓
Buscar la venta
↓
Registrar Pago
↓
Ir a Recibos
↓
Generar Recibo
```

Ahora:

```text
Registrar Venta
↓
Venta creada correctamente
↓
Abrir Procesar Pago automáticamente
↓
Seleccionar la venta recién creada
↓
Registrar Pago
↓
Generar Recibo automáticamente
↓
Mostrar Recibo
↓
Imprimir / Reimprimir
```

---

## 4. Cambios en VentaModal.jsx

Archivo:

```text
frontend/src/pages/ventas/VentaModal.jsx
```

Se modificó el formulario para devolver al componente padre:

- Mensaje del backend.
- Venta creada o editada.
- Tipo de operación realizada.

Solo una venta nueva continúa automáticamente al flujo de pago.

```text
Crear venta → abre proceso de pago
Editar venta → no abre proceso de pago
```

---

## 5. Cambios en PagoModal.jsx

Archivo:

```text
frontend/src/pages/pagos/PagoModal.jsx
```

Se agregó soporte para recibir una venta inicial mediante:

```text
ventaInicialId
```

Cuando el modal se abre después de registrar una venta:

- Selecciona automáticamente la venta recién creada.
- Obtiene su saldo.
- Propone inicialmente el saldo pendiente como monto.
- Permite modificar el monto y mantener pagos parciales.

También se modificó el callback de guardado para devolver el pago creado.

---

## 6. Cambios en VentasPage.jsx

Archivo:

```text
frontend/src/pages/ventas/VentasPage.jsx
```

Se integraron:

```text
VentaModal
PagoModal
ReciboDetalleModal
```

Flujo implementado:

1. Crear la venta.
2. Cargar datos del pago.
3. Identificar la venta recién creada.
4. Abrir PagoModal.
5. Registrar el pago.
6. Obtener el pago creado.
7. Generar automáticamente el recibo.
8. Abrir el detalle del recibo.

Si el pago se registra correctamente pero falla la creación del recibo, no se vuelve a registrar el pago y se informa el error correspondiente.

---

## 7. Pagos Parciales

La funcionalidad de pagos parciales se mantiene.

```text
Venta: Bs 300

Pago 1: Bs 100
Saldo:  Bs 200

Pago 2: Bs 200
Saldo:  Bs 0
```

No se obliga a cancelar el total de la venta en un único pago.

---

## 8. Pagos y Recibos como Módulos Independientes

Aunque el flujo Venta → Pago → Recibo quedó integrado, los módulos de Pagos y Recibos continúan disponibles para:

- Consultas.
- Historial.
- Operaciones manuales cuando corresponda.
- Impresión.
- Reimpresión.
- Anulación cuando corresponda.

---

## 9. Simplificación del Módulo de Seguridad

Antes:

```text
Crear Permiso
↓
Crear Rol
↓
Relacionar Rol-Permiso
↓
Ir a Asignaciones
↓
Seleccionar Usuario
↓
Asignar permisos individualmente
```

Ahora:

```text
Usuarios
→ Crear y administrar usuarios

Asignaciones
→ Asignar un Rol a un Usuario

Rol-Permiso
→ Definir qué permisos tiene cada Rol
```

---

## 10. Nuevo Flujo de Asignaciones

```text
Seleccionar Usuario
↓
Seleccionar Rol
↓
Asignar Rol
↓
El sistema asigna automáticamente
todos los permisos configurados para ese Rol
```

Ejemplo:

```text
Usuario: Juan Pérez
Rol: Vendedor

[Asignar Rol]
```

---

## 11. Estructura RBAC Conservada

Se mantienen las tablas:

```text
usuarios
roles
permisos
rol_permiso
usuario_rol_permiso
```

También se mantienen:

- Laravel Sanctum.
- Middleware de permisos.
- Validación 403.
- Menú dinámico.
- Control de acceso por permisos.
- Relaciones existentes.

No se reemplazó el modelo RBAC por un simple campo de texto dentro de Usuario.

---

## 12. Asignación Automática de Rol

Se reutilizó el endpoint existente:

```text
POST /api/seguridad/usuario-rol-permisos/asignar-rol
```

El método `asignarRol()`:

1. Obtiene los permisos asociados al rol.
2. Busca las relaciones `rol_permiso`.
3. Crea las relaciones en `usuario_rol_permiso`.
4. Evita duplicados mediante `firstOrCreate()`.

---

## 13. Problema Detectado en Rol-Permiso

Se detectó que, si un usuario ya tenía un rol y luego se agregaba un nuevo permiso a ese rol, el usuario no recibía automáticamente el nuevo permiso.

También existía una restricción que impedía quitar una relación Rol-Permiso si ya estaba asignada a usuarios.

---

## 14. Cambios en RolPermisoController.php

Archivo:

```text
backend/app/Http/Controllers/Api/Seguridad/RolPermisoController.php
```

Se modificaron principalmente:

```text
store()
destroy()
```

---

## 15. Sincronización Automática al Agregar un Permiso

Ahora:

```text
Administrador agrega permiso al Rol
↓
Se crea RolPermiso
↓
Se identifican usuarios que ya tienen ese Rol
↓
Se crea UsuarioRolPermiso para cada usuario
↓
Todos reciben el nuevo permiso automáticamente
```

Ejemplo:

```text
Vendedor
├── Ventas
├── Clientes
└── Pagos

Juan  → Vendedor
María → Vendedor
```

Se agrega:

```text
Vendedor → Reportes
```

Resultado:

```text
Juan recibe Reportes
María recibe Reportes
```

---

## 16. Sincronización Automática al Quitar un Permiso

Ahora:

```text
Quitar permiso del Rol
↓
Eliminar UsuarioRolPermiso correspondientes
↓
Eliminar RolPermiso
```

Los usuarios pierden automáticamente ese permiso y el resto de los permisos del rol permanece intacto.

---

## 17. Uso de Transacciones

Las operaciones de sincronización se realizan mediante:

```text
DB::transaction(...)
```

Esto mantiene consistencia entre:

```text
rol_permiso
usuario_rol_permiso
```

---

## 18. Simplificación de AsignacionesPage.jsx

Archivo:

```text
frontend/src/pages/seguridad/AsignacionesPage.jsx
```

Se eliminó de la interfaz normal:

```text
Asignar Permiso Específico
Quitar Permiso Específico
```

La pantalla ahora se centra en:

```text
Usuario
Rol
[Asignar Rol]
```

---

## 19. Agrupación Visual Usuario + Rol

Antes:

```text
Juan | Vendedor | ventas
Juan | Vendedor | clientes
Juan | Vendedor | pagos
Juan | Vendedor | recibos
```

Ahora:

```text
Juan | Vendedor | 4 permisos | Ver permisos | Quitar Rol
```

---

## 20. Ver Permisos del Rol

Desde Asignaciones se puede consultar:

```text
Ver permisos
```

Ejemplo:

```text
Vendedor
4 permisos

Ver permisos
├── ventas.gestionar_venta
├── clientes.gestionar_cliente
├── pagos.gestionar_pago
└── recibos.gestionar_recibo
```

La vista es informativa. Los permisos se administran desde Rol-Permiso.

---

## 21. Quitar Rol Completo

Desde Asignaciones se agregó:

```text
Quitar Rol
```

La operación elimina todas las relaciones correspondientes entre ese usuario y ese rol.

---

## 22. Crear Rol desde Asignaciones

Se agregó:

```text
+ Crear nuevo rol
```

Campos:

```text
Nombre
Descripción
```

Se reutiliza:

```text
crearRol()
POST /api/seguridad/roles
```

---

## 23. Comportamiento Después de Crear un Rol

Después de crear un rol:

1. Se actualiza el catálogo.
2. El rol aparece inmediatamente en el selector.
3. El sistema informa que primero deben configurarse sus permisos.
4. Luego puede asignarse a usuarios.

---

## 24. Regla para Roles Nuevos

```text
Crear Rol ≠ Crear permisos
```

Flujo:

```text
Crear Rol
↓
Rol-Permiso
↓
Configurar permisos
↓
Asignaciones
↓
Asignar Rol al Usuario
```

---

## 25. Responsabilidad Final de Cada Pantalla de Seguridad

### Usuarios

```text
Crear Usuario
Editar Usuario
Activar Usuario
Desactivar Usuario
```

### Asignaciones

```text
Crear Rol
Seleccionar Usuario
Seleccionar Rol
Asignar Rol
Consultar permisos obtenidos
Quitar Rol
```

### Rol-Permiso

```text
Seleccionar Rol
Agregar permisos al Rol
Quitar permisos del Rol
Sincronizar usuarios automáticamente
```

---

## 26. Limpieza del Sidebar de Seguridad

Antes:

```text
Seguridad
├── Usuarios
├── Roles
├── Permisos
├── Rol - Permiso
└── Asignaciones
```

Después:

```text
Seguridad
├── Usuarios
├── Asignaciones
└── Rol - Permiso
```

Se ocultaron del Sidebar:

```text
Roles
Permisos
```

No se eliminaron sus páginas, rutas, servicios, controladores, endpoints, tablas ni permisos.

---

## 27. Sidebar Final

```text
Seguridad
├── Usuarios
├── Asignaciones
└── Rol - Permiso

Producción
└── Producción
```

Las demás opciones continúan filtrándose según los permisos del usuario.

---

## 28. Funcionalidades Conservadas

No se eliminaron:

```text
Gestión de Roles
Gestión de Permisos
Rol-Permiso
Usuario-Rol-Permiso
Pagos
Recibos
Pago por Internet
Ingresos
Egresos
Consumo/Costo/Desperdicio
Middleware RBAC
Sanctum
Menú dinámico
```

El objetivo fue reducir pasos y simplificar la experiencia.

---

## 29. Flujo Final de Seguridad

Para un rol existente:

```text
Usuario
↓
Seleccionar Rol
↓
Asignar Rol
↓
Permisos habilitados automáticamente
```

Para crear un rol nuevo:

```text
Asignaciones
↓
Crear nuevo Rol
↓
Rol-Permiso
↓
Configurar permisos
↓
Asignaciones
↓
Asignar Rol al Usuario
```

Si luego cambia el Rol:

```text
Rol-Permiso
↓
Agregar o quitar permiso
↓
Usuarios del Rol actualizados automáticamente
```

---

## 30. Flujo Final de Ventas

```text
Nueva Venta
↓
Registrar productos
↓
Guardar Venta
↓
Procesar Pago
↓
Registrar Pago
↓
Generar Recibo
↓
Mostrar Recibo
↓
Imprimir / Reimprimir
```

---

## 31. Archivos Principales Modificados

```text
frontend/src/components/Sidebar.jsx
frontend/src/pages/ventas/VentasPage.jsx
frontend/src/pages/ventas/VentaModal.jsx
frontend/src/pages/pagos/PagoModal.jsx
frontend/src/pages/seguridad/AsignacionesPage.jsx
backend/app/Http/Controllers/Api/Seguridad/RolPermisoController.php
```

---

## 32. Servicios Reutilizados

```text
frontend/src/services/ventaService.js
frontend/src/services/pagoService.js
frontend/src/services/reciboService.js
frontend/src/services/usuarioRolPermisoService.js
frontend/src/services/rolService.js
```

También se mantuvo:

```text
backend/app/Http/Controllers/Api/Seguridad/UsuarioRolPermisoController.php
```

---

## 33. Pruebas Funcionales Realizadas

```text
✓ Venta creada correctamente.
✓ Pago abierto automáticamente después de la venta.
✓ Venta seleccionada automáticamente para el pago.
✓ Pago registrado correctamente.
✓ Recibo generado automáticamente.
✓ Recibo visualizado correctamente.
✓ Asignación de Rol completo a Usuario.
✓ Sincronización al agregar permiso a un Rol.
✓ Sincronización al quitar permiso de un Rol.
✓ Creación de nuevo Rol desde Asignaciones.
✓ Nuevo Rol disponible en el selector.
✓ Agrupación visual Usuario + Rol.
✓ Quitar Rol completo.
✓ Limpieza del Sidebar.
```

---

## 34. Resultado Final

### Ventas

Antes:

```text
Venta
→ ir a Pagos
→ buscar Venta
→ registrar Pago
→ ir a Recibos
→ generar Recibo
```

Ahora:

```text
Venta
→ Pago
→ Recibo
```

### Seguridad

Antes:

```text
Crear Rol
→ Crear Permiso
→ Rol-Permiso
→ Usuario
→ Asignar permisos individualmente
```

Ahora:

```text
Rol-Permiso
→ configura qué puede hacer el Rol

Asignaciones
→ Usuario + Rol
```

### Resultado general

```text
VENTAS
Venta → Pago → Recibo

SEGURIDAD
Usuario → Rol

CONFIGURACIÓN
Rol → Permisos

SINCRONIZACIÓN
Cambio en Rol-Permiso
→ Usuarios del Rol actualizados

SIDEBAR
Solo se muestran las opciones necesarias para el trabajo cotidiano
```

La simplificación mantiene la funcionalidad existente, conserva la estructura RBAC, reduce pasos innecesarios y hace que el sistema sea más claro para el usuario administrador.
