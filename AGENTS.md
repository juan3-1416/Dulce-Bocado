# AGENTS.md — Dulce Bocado

## 1. Propósito de este archivo

Este archivo contiene las reglas técnicas, arquitectura, convenciones,
estado actual y decisiones oficiales del proyecto universitario
"Dulce Bocado".

Todo agente de IA que trabaje en este repositorio debe leer y respetar
este archivo antes de crear, modificar, eliminar o refactorizar código.

NO rediseñar el proyecto por iniciativa propia.

Si una solicitud entra en conflicto con este archivo, informar el
conflicto antes de realizar cambios.

---

# 2. Proyecto

Nombre oficial:

SISTEMA DE INFORMACIÓN WEB PARA LA GESTIÓN DE VENTAS, PEDIDOS,
PRODUCCIÓN E INVENTARIO DE UNA PASTELERÍA Y REPOSTERÍA

Nombre de la empresa simulada:

Dulce Bocado

Tipo:

Proyecto universitario de Ingeniería en Sistemas.

El objetivo es desarrollar un sistema web académico, funcional,
modular y comprensible.

No se busca sobrearquitectura empresarial innecesaria.

---

# 3. Stack tecnológico INMUTABLE

Frontend:

- React
- Vite
- Tailwind CSS
- JavaScript
- CSS cuando sea necesario

Backend:

- Laravel / PHP
- API REST

Base de datos:

- PostgreSQL 16

Infraestructura:

- Docker
- Docker Compose

Arquitectura:

- Cliente-servidor
- Monolito modular
- Lógica principal de negocio en backend

Autenticación:

- Laravel Sanctum
- SPA mediante cookies/sesión

Control de versiones:

- Git
- GitHub

Despliegue final:

- Nube

NO cambiar estas tecnologías sin autorización expresa.

---

# 4. Tecnologías prohibidas sin autorización

NO sustituir:

- React por Blade
- PostgreSQL por MySQL
- REST por GraphQL
- Laravel por otro backend

NO introducir automáticamente:

- Spatie Permission
- Redux
- GraphQL
- Firebase
- Supabase
- otro sistema de autenticación
- otro ORM
- otro framework frontend
- microservicios
- paquetes nuevos

Si un paquete nuevo parece necesario, explicar primero por qué y esperar
aprobación.

---

# 5. Estructura principal

Repositorio:

Dulce-Bocado/

Estructura general:

Dulce-Bocado/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── README.md
└── AGENTS.md

Backend Laravel:

backend/app/
backend/routes/
backend/database/
backend/config/

Frontend React:

frontend/src/
├── components/
├── contexts/
├── layouts/
├── pages/
├── services/
└── ...

No reorganizar globalmente estas carpetas.

---

# 6. Base de datos y migraciones

Motor oficial:

PostgreSQL 16

REGLA CRÍTICA:

Una migración que ya fue ejecutada NO debe modificarse para agregar
funcionalidades nuevas.

Si la estructura de una tabla necesita cambiar:

1. Crear una migración nueva.
2. Aplicar solamente el cambio requerido.
3. Mantener compatibilidad con la estructura existente.

NO:

- borrar la base de datos
- recrear todas las tablas
- modificar migraciones históricas
- ejecutar migrate:fresh sin autorización
- cambiar nombres existentes arbitrariamente

---

# 7. Seguridad

La seguridad utiliza las tablas:

usuarios
roles
permisos
rol_permiso
usuario_rol_permiso

No existe una columna de rol como texto dentro de usuarios.

Modelo conceptual:

Usuario
    ↓
UsuarioRolPermiso
    ↓
RolPermiso
    ↓
Rol + Permiso

Relaciones:

Rol 1:N RolPermiso

Permiso 1:N RolPermiso

Usuario 1:N UsuarioRolPermiso

RolPermiso 1:N UsuarioRolPermiso

---

# 8. Roles base

Los roles mínimos oficiales son:

- Administrador
- Vendedor
- Producción

No crear roles alternativos para reemplazar estos roles base.

---

# 9. Permisos de seguridad existentes

Actualmente existen como permisos base:

seguridad.gestionar_usuario
seguridad.gestionar_rol
seguridad.gestionar_permiso
seguridad.gestionar_rol_permiso
seguridad.asignar_roles_permisos

Los módulos futuros deberán seguir el mismo patrón de permisos.

---

# 10. Middleware de permisos

El backend utiliza protección mediante middleware:

permiso:nombre.del.permiso

Ejemplo:

auth:sanctum
permiso:seguridad.gestionar_usuario

No crear un segundo sistema de autorización.

La validación de permisos del backend tiene prioridad sobre cualquier
control visual del frontend.

---

# 11. Seguridad frontend

El frontend también utiliza permisos para:

- mostrar u ocultar opciones del menú
- proteger rutas
- controlar acceso funcional

Se utiliza ProtectedRoute.

Patrón esperado:

Permiso
    ↓
Middleware Laravel
    ↓
Endpoint REST
    ↓
ProtectedRoute React
    ↓
Menú dinámico

No romper este patrón.

---

# 12. Usuario

Campos conceptuales oficiales de Usuario:

id_usuario
nombre
nombre_usuario
correo_electronico
contrasena
activo
intentos_fallidos
bloqueado_hasta
fecha_creacion
fecha_actualizacion

La contraseña nunca se almacena en texto plano.

Laravel debe utilizar hashing seguro.

---

# 13. Reglas de contraseña

Al crear o cambiar una contraseña:

- mínimo 8 caracteres
- al menos una mayúscula
- al menos una minúscula
- al menos un número
- al menos un carácter especial

Estas reglas no deben aplicarse como validación de complejidad durante
el login.

---

# 14. Login y bloqueo

Login mediante:

nombre_usuario
contrasena

Reglas:

- usuario inactivo no puede iniciar sesión
- máximo 5 intentos fallidos
- bloqueo durante 15 minutos
- login correcto reinicia intentos fallidos
- contraseñas almacenadas mediante hash

---

# 15. Sanctum

El proyecto usa Laravel Sanctum para SPA mediante cookies.

NO migrar a tokens personales sin autorización.

El flujo actual usa:

/sanctum/csrf-cookie

y luego endpoints protegidos con:

auth:sanctum

No modificar la configuración de Sanctum salvo necesidad comprobada y
autorización.

---

# 16. Casos de uso oficiales

El proyecto tiene exactamente 27 casos de uso:

CU1  Autenticar Usuario
CU2  Gestionar Usuario
CU3  Gestionar Rol
CU4  Gestionar Permiso
CU5  Gestionar Rol-Permiso
CU6  Asignar Roles y Permisos
CU7  Gestionar Productos y Presentaciones
CU8  Gestionar Cliente
CU9  Gestionar Receta
CU10 Gestionar Venta
CU11 Gestionar Pago
CU12 Gestionar Pago por Internet
CU13 Gestionar Recibo
CU14 Gestionar Pedido
CU15 Gestionar Estado y Entrega de Pedido
CU16 Gestionar Producción
CU17 Registrar Consumo, Costo y Desperdicio
CU18 Gestionar Almacenes y Existencias
CU19 Gestionar Ingreso de Inventario
CU20 Gestionar Egreso de Inventario
CU21 Gestionar Ajuste de Inventario
CU22 Gestionar Proveedores y Compras
CU23 Gestionar Caja y Turnos
CU24 Registrar Visitas
CU25 Seleccionar Tema
CU26 Consultar Dashboard
CU27 Generar y Enviar Reportes

No agregar casos de uso nuevos sin autorización.

---

# 17. Casos de uso eliminados

Los siguientes casos de uso fueron eliminados oficialmente:

- Gestionar Traspaso
- Gestionar Stock Mínimo y Alertas
- Buscar Información

NO volver a agregarlos.

---

# 18. Estado actual del desarrollo

ETAPA 1 — Infraestructura:

COMPLETADA.

Funcionan:

- PostgreSQL
- Laravel
- React
- Docker Compose
- conexión Laravel → PostgreSQL
- conexión React → Laravel
- proxy Vite
- endpoint de salud

ETAPA 2 — Seguridad:

CU1 Autenticar Usuario:
COMPLETADO

CU2 Gestionar Usuario:
COMPLETADO

CU3 Gestionar Rol:
COMPLETADO

CU4 Gestionar Permiso:
COMPLETADO

CU5 Gestionar Rol-Permiso:
COMPLETADO

CU6 Asignar Roles y Permisos:
EN DESARROLLO

No rehacer CU1-CU5.

---

# 19. CU5 Rol-Permiso

La tabla:

rol_permiso

relaciona:

Rol + Permiso

Operaciones implementadas:

- listar relaciones
- asignar permiso a rol
- evitar duplicados
- quitar relación
- impedir eliminar una relación utilizada por usuarios
- obtener catálogos de roles/permisos
- frontend React de gestión

No crear campo "activo" en rol_permiso.

Para quitar una relación se elimina exclusivamente el vínculo.

---

# 20. CU6 Asignaciones

La tabla:

usuario_rol_permiso

asigna una relación existente de RolPermiso a un Usuario.

La asignación NO debe crear directamente:

usuario → rol

ni:

usuario → permiso

Debe utilizar:

Usuario
    ↓
UsuarioRolPermiso
    ↓
RolPermiso

CU6 se encuentra actualmente en desarrollo.

Antes de modificar código relacionado con CU6, revisar su implementación
actual.

---

# 21. Productos y presentaciones

Para CU7:

Un producto puede tener varias presentaciones.

Cada presentación puede tener:

- precio propio
- receta propia
- stock propio
- disponibilidad propia

La personalización puede incluir:

- decoración
- mensaje
- costo adicional definido por vendedor

No simplificar Producto + Presentación en una sola entidad si esto
elimina esta relación.

---

# 22. Recetas

Cada presentación puede tener una receta.

La receta contiene:

- materias primas
- cantidades necesarias

Las recetas son utilizadas posteriormente por producción.

---

# 23. Inventario

Almacenes definidos:

- Materias Primas
- Producción
- Mostrador

El stock se controla por almacén.

Reglas:

- ventas consultan Mostrador
- entregas consultan Mostrador
- producción consume materias primas
- solamente unidades buenas incrementan producto terminado
- no permitir stock negativo

Movimientos:

- ingreso
- egreso
- ajuste positivo
- ajuste negativo

Debe existir trazabilidad cuando corresponda:

- usuario
- fecha
- motivo
- observación

---

# 24. Métodos de valoración prohibidos

No implementar:

- PEPS / FIFO
- UEPS / LIFO
- promedio ponderado

No forman parte del alcance.

---

# 25. Producción

Producción debe permitir:

- seleccionar presentación
- consultar receta
- calcular requerimientos
- verificar disponibilidad
- registrar cantidad
- registrar consumo real
- registrar costo
- registrar desperdicio
- registrar unidades buenas
- mantener trazabilidad

Las operaciones críticas deben utilizar transacciones de base de datos.

---

# 26. Ventas

Una venta puede contener una o varias presentaciones.

Puede asociarse a:

- cliente registrado
- cliente ocasional

Debe manejar:

- cantidades
- precios
- total
- stock de Mostrador
- usuario responsable

No permitir vender más unidades que el stock disponible.

---

# 27. Pagos

Una venta o pedido puede tener uno o varios pagos.

Reglas:

- pagos acumulados no pueden superar el total
- calcular saldo pendiente

Métodos contemplados:

- efectivo
- QR
- pago por internet

---

# 28. Pago por Internet

Debe existir una transacción de pago con datos como:

- pago
- estado
- referencia
- proveedor
- fecha de solicitud
- fecha de confirmación

Estados:

PENDIENTE
APROBADO
RECHAZADO

Puede utilizar servicio de pago externo.

No se está construyendo un ecommerce público completo.

---

# 29. Pedidos

Pedido:

- cliente
- uno o varios productos/presentaciones
- precios congelados
- fecha de entrega
- hora de entrega
- observaciones
- personalización opcional

Un pedido NO reserva automáticamente inventario.

Para entregar:

- saldo = 0
- stock suficiente en Mostrador

---

# 30. Recibos

El sistema genera recibos internos.

Debe permitir:

- generar
- consultar
- visualizar
- imprimir
- reimprimir
- anular

No implementar facturación electrónica fiscal.

---

# 31. Proveedores y compras

CU22 comprende:

- proveedor
- compra
- detalle de compra
- materias primas
- almacén destino
- actualización de inventario

Las operaciones críticas deben utilizar transacciones.

---

# 32. Caja y turnos

Existe una sola caja física.

Reglas:

- solamente un turno abierto a la vez
- registrar usuario
- apertura
- cierre
- ingresos
- egresos autorizados

No convertir el módulo en un sistema contable completo.

---

# 33. Visitas

CU24 registra visitas al sistema/página.

Debe existir un contador visible según la interfaz definida.

Puede manejar:

- ruta
- contador
- actualización

---

# 34. Temas visuales

CU25 debe ofrecer al menos:

- Claro
- Oscuro
- Dulce Bocado

No instalar sistemas complejos de theming si Tailwind/CSS resuelve el
requerimiento.

---

# 35. Dashboard

CU26 es principalmente administrativo.

Debe ofrecer información resumida y útil del sistema.

No convertirlo en una plataforma de inteligencia de negocios externa.

---

# 36. Reportes

CU27 debe ofrecer al menos tres reportes parametrizados relacionados con:

- ventas
- pedidos
- inventario

Puede incluir:

- filtros
- consultas
- PDF
- descarga
- envío por correo

El correo puede utilizar un servicio externo.

---

# 37. Alcance excluido

No implementar salvo petición expresa:

- aplicación móvil nativa
- API oficial de WhatsApp
- servicio propio de delivery
- facturación electrónica fiscal
- contabilidad completa
- nómina
- cuentas por pagar complejas
- MRP avanzado
- planificación avanzada de producción
- lotes complejos
- conversiones complejas de unidades
- FIFO
- LIFO
- promedio ponderado
- ecommerce público
- integración con redes sociales

---

# 38. Convenciones backend

Mantener:

- Laravel
- API REST
- controladores organizados
- Form Requests para validación cuando corresponda
- Models Eloquent
- respuestas JSON consistentes
- códigos HTTP apropiados

Ejemplos:

200 OK
201 Created
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity

No colocar toda la lógica en rutas.

No duplicar lógica existente.

---

# 39. Convenciones frontend

Mantener separación entre:

pages/
components/
services/
contexts/
layouts/

Las llamadas API deben ubicarse preferentemente en:

frontend/src/services/

No duplicar funciones fetch en cada página si existe un servicio
correspondiente.

Mantener:

credentials: 'include'

cuando la llamada utiliza sesión Sanctum.

Para mutaciones protegidas por CSRF utilizar el patrón existente del
proyecto.

---

# 40. Nombres

La base de datos y el dominio de negocio utilizan nombres en español.

Mantener convenciones existentes.

No renombrar campos, tablas, rutas o clases existentes solamente por
preferencia personal.

---

# 41. Forma obligatoria de trabajar

Antes de modificar código:

1. Revisar archivos existentes relacionados.
2. Comprender la implementación actual.
3. Identificar exactamente qué archivo necesita cambio.
4. Evitar modificaciones innecesarias.

Al proponer un cambio indicar:

- archivo
- ruta exacta
- si se crea o modifica
- motivo

Si se reemplaza un archivo:

proporcionar el archivo completo.

Si se realiza una modificación parcial:

indicar exactamente dónde colocarla.

Después indicar:

- comandos exactos
- prueba
- resultado esperado

---

# 42. Desarrollo paso a paso

No desarrollar varios casos de uso de golpe.

Secuencia:

1. Backend
2. Pruebas backend
3. Frontend
4. Pruebas frontend
5. Cierre del caso de uso

No continuar automáticamente al siguiente paso si el desarrollador está
probando el anterior.

---

# 43. Manejo de errores

Si aparece un error:

NO:

- reinstalar todo automáticamente
- eliminar node_modules sin diagnóstico
- reconstruir toda la base de datos
- usar migrate:fresh
- borrar Docker volumes
- cambiar arquitectura
- reemplazar configuraciones que ya funcionan

Primero:

1. Leer el error.
2. Encontrar la causa.
3. Revisar el archivo involucrado.
4. Corregir solamente lo necesario.
5. Volver a probar.

---

# 44. Archivos sensibles/compartidos

Modificar con especial cuidado:

docker-compose.yml

backend/.env
backend/config/*
backend/bootstrap/app.php
backend/routes/api.php

backend/app/Models/Usuario.php

archivos de autenticación
middleware de permisos
configuración Sanctum

frontend/src/App.jsx
ProtectedRoute
AuthContext
MainLayout

Estos archivos pueden ser compartidos por muchos módulos.

No hacer cambios globales sin necesidad.

---

# 45. Git y trabajo entre desarrolladores

Nunca desarrollar directamente sobre una rama estable compartida si
se está trabajando en paralelo.

Usar ramas feature.

Ejemplos:

feature/cu7-productos
feature/cu8-clientes
feature/cu9-recetas

Antes de hacer merge revisar:

git diff main...nombre-rama

No hacer merge automático de cambios grandes generados por IA sin
revisión humana.

---

# 46. Trabajo paralelo

Dos desarrolladores NO deben trabajar simultáneamente en el mismo caso
de uso salvo coordinación expresa.

Si CU6 está siendo desarrollado por otra persona, escoger otro CU que
no modifique las mismas tablas/controladores/páginas.

Evitar conflictos especialmente en:

routes/api.php
App.jsx
MainLayout.jsx
migraciones
seeders

---

# 47. Refactorización

No realizar refactorizaciones globales porque "se puede hacer mejor".

Este es un proyecto académico que ya tiene una arquitectura aprobada.

La prioridad es:

- consistencia
- funcionalidad
- claridad
- trazabilidad
- cumplimiento de casos de uso

No imponer patrones nuevos innecesarios.

---

# 48. Antes de escribir código

Todo agente debe preguntarse:

1. ¿Esto respeta React + Laravel + REST + PostgreSQL?
2. ¿Estoy manteniendo la estructura existente?
3. ¿Estoy reutilizando el sistema actual de seguridad?
4. ¿Estoy evitando modificar módulos terminados?
5. ¿Estoy creando solo lo necesario?
6. ¿Estoy respetando los casos de uso oficiales?
7. ¿Estoy evitando funcionalidades fuera de alcance?
8. ¿Necesito realmente modificar un archivo compartido?
9. ¿Estoy creando una nueva migración en vez de editar una histórica?
10. ¿Puedo probar el cambio sin afectar otros módulos?

Si alguna respuesta genera duda, revisar el proyecto antes de modificar
código.

---

# 49. Regla principal para agentes de IA

NO ASUMIR QUE EL PROYECTO NECESITA SER REDISEÑADO.

Primero entender la implementación existente.

Después extenderla siguiendo exactamente los patrones ya utilizados.

La consistencia con el proyecto tiene mayor prioridad que las
preferencias arquitectónicas del agente.

---

# 50. Actualización de este archivo

Cuando se complete un CU importante o se tome una decisión arquitectónica
permanente, actualizar AGENTS.md.

Ejemplo:

CU6 Asignar Roles y Permisos — COMPLETADO

Así los futuros agentes conocen siempre el estado real del proyecto.

NO eliminar decisiones anteriores sin autorización.