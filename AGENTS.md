# AGENTS.md — Dulce Bocado (resumen oficial)

> Versión condensada del AGENTS.md original (~1085 líneas). Contiene solo
> las reglas, decisiones y estado que un agente de IA necesita para no
> desviarse del proyecto. Ante cualquier duda de detalle no cubierto aquí,
> revisar el proyecto real antes de asumir.

## 0. Regla principal

NO ASUMIR QUE EL PROYECTO NECESITA SER REDISEÑADO.

1. Entender la implementación existente antes de tocar código.
2. Extenderla siguiendo exactamente los patrones ya usados.
3. Si una solicitud entra en conflicto con este archivo, **informar el
   conflicto antes de actuar**.
4. Prioridad: consistencia > funcionalidad > claridad > trazabilidad >
   cumplimiento de casos de uso (CU) > preferencias del agente.

## 1. Proyecto

Sistema web académico (Ing. en Sistemas) para gestión de ventas, pedidos,
producción e inventario de una pastelería simulada, **Dulce Bocado**.
Debe ser funcional, modular y comprensible — sin sobrearquitectura
empresarial innecesaria.

## 2. Stack tecnológico INMUTABLE

- **Frontend:** React + Vite + Tailwind CSS + JavaScript
- **Backend:** Laravel (PHP), API REST
- **Base de datos:** PostgreSQL 16
- **Infraestructura:** Docker + Docker Compose
- **Arquitectura:** cliente-servidor, monolito modular, lógica de negocio
  en el backend
- **Auth:** Laravel Sanctum, SPA vía cookies/sesión
- **Control de versiones:** Git / GitHub

**Prohibido sin autorización expresa:**
- Sustituir React→Blade, PostgreSQL→MySQL, REST→GraphQL, Laravel→otro backend.
- Instalar sin aprobación: Spatie Permission, Redux, GraphQL, Firebase,
  Supabase, otro ORM, otro sistema de auth, otro framework frontend,
  microservicios, o cualquier paquete nuevo.
- Si un paquete nuevo parece necesario: **explicar por qué y esperar
  aprobación** antes de instalarlo.

## 3. Estructura del repo (no reorganizar globalmente)

```
Dulce-Bocado/
├── backend/        (app/, routes/, database/, config/)
├── frontend/src/    (components/, contexts/, layouts/, pages/, services/)
├── docker-compose.yml
├── .env.example
├── README.md
└── AGENTS.md
```

## 4. Base de datos y migraciones — REGLA CRÍTICA

**Una migración ya ejecutada nunca se modifica.** Si una tabla necesita
cambiar: crear una migración nueva, aplicar solo el cambio requerido,
mantener compatibilidad con lo existente.

Prohibido: borrar la BD, recrear tablas, editar migraciones históricas,
`migrate:fresh` sin autorización, renombrar campos/tablas existentes por
preferencia personal.

## 5. Seguridad (RBAC)

Tablas: `usuarios`, `roles`, `permisos`, `rol_permiso`, `usuario_rol_permiso`.
No existe columna de rol como texto en `usuarios`.

Flujo conceptual:
```
Usuario → UsuarioRolPermiso → RolPermiso → (Rol + Permiso)
```

- **Roles base** (no reemplazar): Administrador, Vendedor, Producción.
- **Permisos base**: `seguridad.gestionar_usuario`, `seguridad.gestionar_rol`,
  `seguridad.gestionar_permiso`, `seguridad.gestionar_rol_permiso`,
  `seguridad.asignar_roles_permisos`. Módulos nuevos siguen el mismo
  patrón `modulo.accion`.
- **Backend**: middleware `permiso:nombre.del.permiso` sobre `auth:sanctum`.
  No crear un segundo sistema de autorización. El backend siempre tiene
  prioridad sobre cualquier control visual del frontend.
- **Frontend**: `ProtectedRoute` + menú dinámico según permisos. Patrón:
  `Permiso → Middleware Laravel → Endpoint REST → ProtectedRoute → Menú`.
  No romper este patrón.
- `rol_permiso`: no tiene campo `activo`; quitar relación = borrar el
  vínculo; no permitir eliminar una relación en uso por usuarios.
- `usuario_rol_permiso` (CU6, en desarrollo): asigna una `RolPermiso`
  **existente** a un usuario. Nunca crear directamente `usuario→rol` o
  `usuario→permiso`.

## 6. Usuario y login

Campos: `id_usuario, nombre, nombre_usuario, correo_electronico,
contrasena, activo, intentos_fallidos, bloqueado_hasta, fecha_creacion,
fecha_actualizacion`. Contraseña siempre hasheada (nunca texto plano).

Reglas de contraseña (crear/cambiar, **no** en login): mín. 8 caracteres,
1 mayúscula, 1 minúscula, 1 número, 1 carácter especial.

Login por `nombre_usuario` + `contrasena`. Máx. 5 intentos fallidos →
bloqueo 15 min. Login correcto reinicia contador. Usuario inactivo no
puede iniciar sesión.

**Sanctum**: SPA vía `/sanctum/csrf-cookie` + `auth:sanctum`. No migrar a
tokens personales ni tocar su configuración sin autorización.

## 7. Casos de uso oficiales (exactamente 27, no agregar sin autorización)

| CU | Nombre | Estado |
|----|--------|--------|
| CU1 | Autenticar Usuario | ✅ COMPLETADO |
| CU2 | Gestionar Usuario | ✅ COMPLETADO |
| CU3 | Gestionar Rol | ✅ COMPLETADO |
| CU4 | Gestionar Permiso | ✅ COMPLETADO |
| CU5 | Gestionar Rol-Permiso | ✅ COMPLETADO |
| CU6 | Asignar Roles y Permisos | ✅ COMPLETADO |
| CU7 | Gestionar Productos y Presentaciones | ⏳ No iniciado |
| CU8 | Gestionar Cliente | ⏳ No iniciado |
| CU9 | Gestionar Receta | ⏳ No iniciado |
| CU10 | Gestionar Venta | ⏳ No iniciado |
| CU11 | Gestionar Pago | ⏳ No iniciado |
| CU12 | Gestionar Pago por Internet | ⏳ No iniciado |
| CU13 | Gestionar Recibo | ⏳ No iniciado |
| CU14 | Gestionar Pedido | ⏳ No iniciado |
| CU15 | Gestionar Estado y Entrega de Pedido | ⏳ No iniciado |
| CU16 | Gestionar Producción | ⏳ No iniciado |
| CU17 | Registrar Consumo, Costo y Desperdicio | ⏳ No iniciado |
| CU18 | Gestionar Almacenes y Existencias | ⏳ No iniciado |
| CU19 | Gestionar Ingreso de Inventario | ⏳ No iniciado |
| CU20 | Gestionar Egreso de Inventario | ⏳ No iniciado |
| CU21 | Gestionar Ajuste de Inventario | ⏳ No iniciado |
| CU22 | Gestionar Proveedores y Compras | ⏳ No iniciado |
| CU23 | Gestionar Caja y Turnos | ⏳ No iniciado |
| CU24 | Registrar Visitas | ⏳ No iniciado |
| CU25 | Seleccionar Tema | ⏳ No iniciado |
| CU26 | Consultar Dashboard | ⏳ No iniciado |
| CU27 | Generar y Enviar Reportes | ⏳ No iniciado |

**No rehacer CU1–CU5** (cerrados). Antes de tocar CU6, revisar su
implementación actual.

**Eliminados oficialmente — no volver a agregar:** Gestionar Traspaso,
Gestionar Stock Mínimo y Alertas, Buscar Información.

> ⚠️ Actualizar esta tabla cada vez que se cierre un CU (ver sección 15).

## 8. Estado de infraestructura (Etapa 1)

✅ COMPLETADA: PostgreSQL, Laravel, React, Docker Compose, conexión
Laravel↔PostgreSQL, conexión React↔Laravel, proxy Vite, endpoint de salud.

## 9. Reglas de negocio por módulo (resumen)

- **Productos/Presentaciones (CU7):** un producto → varias presentaciones;
  cada una con precio, receta, stock y disponibilidad propios.
  Personalización opcional (decoración, mensaje, costo adicional). No
  fusionar Producto+Presentación en una sola entidad.
- **Recetas (CU9):** materias primas + cantidades por presentación; las
  usa producción.
- **Inventario (CU18–21):** 3 almacenes fijos — Materias Primas,
  Producción, Mostrador. Ventas y entregas consultan Mostrador;
  producción consume materias primas; solo unidades buenas incrementan
  producto terminado; **stock nunca negativo**. Movimientos: ingreso,
  egreso, ajuste +/-, con trazabilidad (usuario, fecha, motivo,
  observación). **Prohibido:** FIFO, LIFO, promedio ponderado.
- **Producción (CU16–17):** seleccionar presentación → consultar receta →
  calcular requerimientos → verificar disponibilidad → registrar
  cantidad/consumo real/costo/desperdicio/unidades buenas, con
  trazabilidad. Operaciones críticas en transacciones DB.
- **Ventas (CU10):** una o varias presentaciones; cliente registrado u
  ocasional; controla cantidades, precios, total, stock de Mostrador y
  usuario responsable. No vender más que el stock disponible.
- **Pagos (CU11–12):** uno o varios pagos por venta/pedido; acumulado ≤
  total; calcular saldo pendiente. Métodos: efectivo, QR, pago por
  internet (transacción con estado PENDIENTE/APROBADO/RECHAZADO,
  referencia, proveedor, fechas). No es un ecommerce público completo.
- **Pedidos (CU14–15):** cliente + productos/presentaciones + precios
  congelados + fecha/hora de entrega + observaciones + personalización
  opcional. **No reserva inventario automáticamente.** Para entregar:
  saldo = 0 y stock suficiente en Mostrador.
- **Recibos (CU13):** generar, consultar, visualizar, imprimir,
  reimprimir, anular. No es facturación electrónica fiscal.
- **Proveedores/Compras (CU22):** proveedor, compra, detalle, materias
  primas, almacén destino, actualización de inventario. Operaciones
  críticas en transacciones.
- **Caja y turnos (CU23):** una sola caja física, un turno abierto a la
  vez; registra usuario, apertura, cierre, ingresos, egresos
  autorizados. No es un sistema contable completo.
- **Visitas (CU24):** contador de visitas visible; maneja ruta, contador,
  actualización.
- **Temas (CU25):** mínimo Claro, Oscuro y Dulce Bocado. Resolver con
  Tailwind/CSS, sin sistemas de theming complejos.
- **Dashboard (CU26):** resumen administrativo. No convertirlo en una
  plataforma de BI externa.
- **Reportes (CU27):** mínimo 3 reportes parametrizados (ventas, pedidos,
  inventario). Puede incluir filtros, PDF, descarga, envío por correo
  (servicio externo).

## 10. Fuera de alcance (no implementar sin pedido expreso)

App móvil nativa, API oficial de WhatsApp, delivery propio, facturación
electrónica fiscal, contabilidad completa, nómina, cuentas por pagar
complejas, MRP avanzado, planificación avanzada de producción, lotes
complejos, conversiones complejas de unidades, FIFO/LIFO/promedio
ponderado, ecommerce público, integración con redes sociales.

## 11. Convenciones de código

**Backend:** Laravel + REST, controladores organizados, Form Requests
para validación, Models Eloquent, JSON consistente, códigos HTTP
correctos (200/201/401/403/404/409/422). No poner lógica en las rutas.
No duplicar lógica existente.

**Frontend:** separar `pages/ components/ services/ contexts/ layouts/`.
Llamadas API en `frontend/src/services/` (no duplicar fetch por página).
Usar `credentials: 'include'` en llamadas con sesión Sanctum. CSRF:
seguir el patrón ya existente en el proyecto.

**Nombres:** dominio de negocio y BD en español. No renombrar campos,
tablas, rutas o clases existentes por preferencia personal.

## 12. Flujo de trabajo obligatorio

Antes de modificar código:
1. Revisar archivos existentes relacionados.
2. Comprender la implementación actual.
3. Identificar exactamente qué archivo necesita cambio.
4. Evitar modificaciones innecesarias.

Al proponer un cambio, indicar: **archivo, ruta exacta, si se crea o
modifica, y motivo.** Reemplazo de archivo → entregar el archivo
completo. Modificación parcial → indicar exactamente dónde colocarla.
Después indicar: comandos exactos, prueba, resultado esperado.

**Desarrollo paso a paso** (no varios CU a la vez):
`Backend → Pruebas backend → Frontend → Pruebas frontend → Cierre del CU`.
No continuar automáticamente al siguiente paso si el desarrollador está
probando el anterior.

## 13. Manejo de errores

**NO:** reinstalar todo automáticamente, borrar `node_modules` sin
diagnóstico, reconstruir la BD, usar `migrate:fresh`, borrar volúmenes
Docker, cambiar arquitectura, reemplazar configuraciones que ya
funcionan.

**SÍ:** leer el error → encontrar la causa → revisar el archivo
involucrado → corregir solo lo necesario → volver a probar.

## 14. Archivos sensibles/compartidos (cuidado especial)

`docker-compose.yml`, `backend/.env`, `backend/config/*`,
`backend/bootstrap/app.php`, `backend/routes/api.php`,
`backend/app/Models/Usuario.php`, archivos de autenticación, middleware
de permisos, configuración Sanctum, `frontend/src/App.jsx`,
`ProtectedRoute`, `AuthContext`, `MainLayout`. Son compartidos por muchos
módulos — no hacer cambios globales sin necesidad.

## 15. Git y trabajo en equipo

No desarrollar directo sobre la rama estable compartida en paralelo.
Usar ramas `feature/cuX-nombre` (ej. `feature/cu7-productos`). Revisar
`git diff main...nombre-rama` antes de merge. No mergear automáticamente
cambios grandes generados por IA sin revisión humana.

Dos desarrolladores no trabajan el mismo CU sin coordinación expresa.
Evitar conflictos en: `routes/api.php`, `App.jsx`, `MainLayout.jsx`,
migraciones, seeders.

**Actualizar este archivo** al completar un CU importante o tomar una
decisión arquitectónica permanente (ver tabla de la sección 7). No
eliminar decisiones anteriores sin autorización.

## 16. Refactorización

No refactorizar globalmente "porque se puede hacer mejor". La
arquitectura ya está aprobada. Prioridad: consistencia, funcionalidad,
claridad, trazabilidad, cumplimiento de CU. No imponer patrones nuevos
innecesarios.

## 17. Checklist antes de escribir código

1. ¿Respeta React + Laravel + REST + PostgreSQL?
2. ¿Mantengo la estructura existente?
3. ¿Reutilizo el sistema de seguridad actual?
4. ¿Evito modificar módulos ya terminados?
5. ¿Creo solo lo necesario?
6. ¿Respeto los casos de uso oficiales?
7. ¿Evito funcionalidades fuera de alcance?
8. ¿Necesito realmente tocar un archivo compartido?
9. ¿Creo una migración nueva en vez de editar una histórica?
10. ¿Puedo probar el cambio sin afectar otros módulos?

Si alguna respuesta genera duda: revisar el proyecto antes de modificar
código.