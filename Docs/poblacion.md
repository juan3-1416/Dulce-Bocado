# Dulce Bocado — Correcciones recientes y ejecución de pobladas demo

## 1. Objetivo

Este documento resume las correcciones realizadas recientemente en el proyecto **Dulce Bocado** y explica cómo otro integrante del equipo puede ejecutar las **pobladas demo** necesarias para dejar todos los módulos con información de prueba.

Repositorio esperado:

```text
C:\Users\<usuario>\Documents\GitHub\Dulce-Bocado
```

Rama de trabajo usada durante estas correcciones:

```text
dev-jp
```

---

# 2. Correcciones realizadas

## 2.1. Dashboard administrativo

Se corrigió el Dashboard para que funcione con la arquitectura actual basada en:

```text
Frontend React
    ↓ Bearer Token
API Gateway
    ↓
Backend legacy
    ↓
Security Service
```

### Problema original

El Dashboard presentaba varios problemas:

- No aparecía en el Sidebar del administrador.
- El permiso `dashboard.consultar` no existía en Security Service.
- La ruta del Dashboard seguía utilizando `auth:sanctum` del backend legacy.
- El frontend del Dashboard no enviaba el Bearer Token.
- El backend legacy no tenía configurada la comunicación con `security-service`.
- La sección de próximos pedidos mostraba pedidos antiguos.

---

## 2.2. Permiso `dashboard.consultar`

Se creó el permiso:

```text
dashboard.consultar
```

y se asignó al rol:

```text
Administrador
```

Además, se vinculó al usuario administrador.

Se agregó un seeder específico:

```text
microservices/security-service/database/seeders/DashboardPermisosSeeder.php
```

El objetivo es que el permiso pueda regenerarse de forma idempotente en otros ambientes.

---

## 2.3. Sidebar y acceso al Dashboard

El frontend ya tenía preparado el acceso mediante:

```text
dashboard.consultar
```

en:

```text
frontend/src/components/Sidebar.jsx
frontend/src/App.jsx
frontend/src/pages/InicioPage.jsx
```

Una vez agregado el permiso en Security Service, el Dashboard apareció correctamente para el administrador.

---

## 2.4. Autenticación del Dashboard

### Frontend

Se modificó:

```text
frontend/src/services/dashboardService.js
```

para obtener el token mediante:

```js
obtenerToken()
```

y enviar:

```http
Authorization: Bearer <token>
```

La lógica quedó alineada con servicios como:

```text
pagoService.js
ventas
pedidos
inventario
producción
```

---

## 2.5. Backend legacy y Security Service

Se modificó:

```text
backend/app/Http/Middleware/VerificarPermiso.php
```

para que valide el Bearer Token contra:

```text
POST http://security-service:8000/api/internal/introspect
```

utilizando:

```http
Authorization: Bearer <token>
X-Internal-Service-Key: <clave interna>
```

El middleware valida:

- token existente;
- usuario activo;
- lista de permisos;
- permiso requerido;
- comunicación correcta con Security Service.

Para el Dashboard se valida:

```text
dashboard.consultar
```

---

## 2.6. Ruta del Dashboard

Antes estaba protegida con:

```php
'auth:sanctum',
'permiso:dashboard.consultar',
```

Esto era incorrecto porque `auth:sanctum` correspondía al backend legacy y el token actual pertenece a Security Service.

Se corrigió en:

```text
backend/routes/api.php
```

dejando:

```php
Route::prefix('dashboard')
    ->middleware([
        'permiso:dashboard.consultar',
    ])
    ->group(function () {
        Route::get('/resumen', [DashboardController::class, 'index']);
    });
```

La ruta debe mostrar:

```text
GET|HEAD api/dashboard/resumen
⇂ api
⇂ App\Http\Middleware\VerificarPermiso:dashboard.consultar
```

y ya no debe aparecer:

```text
Authenticate:sanctum
```

---

## 2.7. Configuración de Security Service en backend legacy

Se agregó configuración en:

```text
backend/config/services.php
```

con:

```php
'security' => [
    'url' => env(
        'SECURITY_SERVICE_URL',
        'http://security-service:8000'
    ),
    'key' => env('INTERNAL_SERVICE_KEY'),
    'timeout' => (int) env('SECURITY_TIMEOUT', 3),
],
```

El archivo local:

```text
backend/.env
```

debe contener:

```env
SECURITY_SERVICE_URL=http://security-service:8000
INTERNAL_SERVICE_KEY=<MISMA CLAVE INTERNA DE SECURITY SERVICE>
SECURITY_TIMEOUT=3
```

> IMPORTANTE: `backend/.env` no debe subirse a Git.

Verificar:

```powershell
git check-ignore backend/.env
```

Debe devolver:

```text
backend/.env
```

---

## 2.8. Próximos pedidos del Dashboard

El Dashboard mostraba pedidos antiguos como si fueran próximas entregas.

Se corrigió:

```text
backend/app/Http/Controllers/Api/Dashboard/DashboardController.php
```

agregando filtro por fecha:

```php
->whereDate('fecha_entrega', '>=', $ahora->toDateString())
```

De esta forma, la tabla:

```text
Próximas Entregas de Pedidos
```

solo devuelve pedidos de hoy en adelante.

---

# 3. Pobladas demo implementadas

Las pobladas fueron separadas por microservicio para respetar la arquitectura.

Actualmente existen las siguientes:

```text
CatalogDemoSeeder
CustomerDemoSeeder
InventoryDemoSeeder
ProductionDemoSeeder
SalesDemoSeeder
OrderDemoSeeder
PaymentDemoSeeder
DashboardDemo2026Seeder
```

El orden es importante porque algunos módulos dependen de información creada previamente.

Orden correcto:

```text
1. Catalog
2. Customer
3. Inventory
4. Production
5. Sales
6. Order
7. Payment
8. Dashboard legacy
```

---

# 4. Script automático para todas las pobladas

Se creó:

```text
scripts/seed-demo.ps1
```

Este script:

- verifica los archivos Docker Compose;
- ejecuta los seeders en orden;
- evita usar el seeder legacy general antiguo;
- ejecuta validaciones rápidas;
- puede volver a ejecutarse sin inflar los principales datos demo.

---

# 5. Cómo ejecutar las pobladas

## Paso 1 — Entrar al repositorio

Ejemplo:

```powershell
cd C:\Users\<usuario>\Documents\GitHub\Dulce-Bocado
```

---

## Paso 2 — Levantar Docker

Usar todos los Compose del proyecto:

```powershell
$composeArgs = @(
  "-f", "docker-compose.yml",
  "-f", "docker-compose.sprint1.yml",
  "-f", "docker-compose.sprint2.catalog.yml",
  "-f", "docker-compose.sprint2.customer.yml",
  "-f", "docker-compose.sprint2.order.yml",
  "-f", "docker-compose.sprint2.sales.yml",
  "-f", "docker-compose.sprint3.inventory.yml",
  "-f", "docker-compose.sprint3.production.yml",
  "-f", "docker-compose.sprint4.payment.yml"
)
```

Luego:

```powershell
docker compose @composeArgs up -d
```

Verificar:

```powershell
docker compose @composeArgs ps
```

Los servicios principales deben aparecer como:

```text
Up
```

o:

```text
healthy
```

---

## Paso 3 — Ejecutar todas las pobladas

Desde la raíz del repositorio:

```powershell
powershell.exe `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File ".\scripts\seed-demo.ps1"
```

Al finalizar debe aparecer:

```text
POBLACION DEMO COMPLETADA CORRECTAMENTE
```

---

# 6. Qué información genera cada poblada

## CatalogDemoSeeder

Genera datos de:

```text
categorías
productos
presentaciones
materias primas
recetas
detalle de recetas
```

Valores aproximados esperados:

```text
categorias: 6
productos: 19
presentaciones: 49
materias_primas: 16
recetas: 49
detalle_recetas: 233
```

---

## CustomerDemoSeeder

Genera aproximadamente:

```text
100 clientes demo
```

más los clientes existentes.

---

## InventoryDemoSeeder

Genera:

```text
almacenes
existencias
movimientos
stock crítico
```

Valores demo usados durante validación:

```text
almacenes: 3
existencias_total: 114
movimientos_demo: 135
stock_critico: 8
```

---

## ProductionDemoSeeder

Genera órdenes de producción demo.

Distribución aproximada:

```text
COMPLETADAS: 80
EN_PROCESO: 10
RECHAZADAS: 6
```

---

## SalesDemoSeeder

Genera aproximadamente:

```text
400 ventas demo
```

Distribución:

```text
CONFIRMADAS: 350
CANCELADAS: 30
BORRADOR: 20
```

También genera detalles de venta.

---

## OrderDemoSeeder

Genera aproximadamente:

```text
100 pedidos demo
```

Distribución:

```text
ENTREGADO: 55
CANCELADO: 15
EN_PROCESO: 15
PROGRAMADO: 15
```

---

## PaymentDemoSeeder

Genera pagos asociados a ventas y pedidos.

Incluye:

```text
pagos en efectivo
pagos QR demo
intentos QR
eventos QR
recibos
recibos anulados demo
```

Importante:

Los QR demo son locales y determinísticos.

```text
NO llaman a Libélula real.
```

Valores usados durante validación:

```text
pagos_demo: 483
efectivo_demo: 354
qr_demo: 129
intentos_qr_demo: 137
qr_rechazados_demo: 8
recibos_demo: 483
```

---

## DashboardDemo2026Seeder

Genera datos específicos para que el Dashboard muestre actividad en noviembre de 2026.

Incluye:

```text
80 ventas
25 pedidos
30 producciones
visitas
datos de rentabilidad
datos para gráficos
```

Después de ejecutarlo, para el período mensual se validaron aproximadamente:

```text
ventas: 76
ventas_total: Bs 33.527
ganancia_bruta: Bs 15.126,15
pedidos_activos: 51
produccion_activa: 10
alertas_stock: 4
```

---

# 7. Seeder que NO debe ejecutarse

No volver a ejecutar manualmente:

```text
backend/database/seeders/DemoDataSeeder.php
```

Ese seeder pertenece a una etapa anterior del backend monolítico y puede introducir información duplicada o incompatible con la nueva población separada por microservicios.

Usar siempre:

```text
scripts/seed-demo.ps1
```

---

# 8. Las pobladas pueden ejecutarse más de una vez

Los seeders demo fueron preparados para permitir reejecución.

Se validó ejecutando nuevamente:

```powershell
powershell.exe `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File ".\scripts\seed-demo.ps1"
```

sin incrementar incorrectamente los principales registros demo.

Por tanto, si un compañero necesita reconstruir o validar el ambiente, puede volver a correr el script.

---

# 9. Verificación rápida del Dashboard

Después de ejecutar las pobladas, iniciar sesión como administrador.

El usuario debe tener:

```text
dashboard.consultar
```

Luego ingresar a:

```text
/dashboard
```

La petición:

```text
GET /api/dashboard/resumen?periodo=mes
```

debe devolver:

```text
HTTP 200
```

La respuesta contiene:

```json
{
  "periodo": {},
  "kpis": {},
  "graficos": {},
  "tablas": {}
}
```

---

# 10. Si el Dashboard devuelve 401

Primero comprobar que exista el token en el navegador:

```javascript
localStorage.getItem('dulce_bocado_token')
```

Debe devolver un token.

Luego revisar:

```text
frontend/src/services/dashboardService.js
```

Debe utilizar:

```js
import { obtenerToken } from './authService'
```

y enviar:

```js
const token = obtenerToken()

if (token) {
  headers.Authorization = `Bearer ${token}`
}
```

Si el archivo está correcto pero el navegador sigue ejecutando una versión vieja:

```powershell
docker restart dulce_bocado_frontend
```

Luego en el navegador:

```text
F12
Network
Disable cache
Ctrl + Shift + R
```

---

# 11. Validar configuración del backend legacy

Ejecutar:

```powershell
docker exec dulce_bocado_backend `
  php artisan config:clear
```

Luego:

```powershell
docker exec dulce_bocado_backend `
  php artisan tinker `
  --execute="dump([
    'security_url' => config('services.security.url'),
    'security_key_configurada' => !empty(config('services.security.key')),
    'security_timeout' => config('services.security.timeout'),
  ]);"
```

Resultado correcto:

```text
security_url => "http://security-service:8000"
security_key_configurada => true
security_timeout => 3
```

Nunca imprimir el contenido de:

```text
INTERNAL_SERVICE_KEY
```

---

# 12. Validar ruta del Dashboard

```powershell
docker exec dulce_bocado_backend `
  php artisan route:list -v --path=dashboard
```

Debe aparecer:

```text
GET|HEAD api/dashboard/resumen
⇂ api
⇂ App\Http\Middleware\VerificarPermiso:dashboard.consultar
```

No debe aparecer:

```text
Authenticate:sanctum
```

---

# 13. Reglas importantes para Git

Nunca subir:

```text
backend/.env
microservices/*/.env
credenciales
INTERNAL_SERVICE_KEY
AppKey de Libélula
QR reales
URLs temporales de túneles
```

Antes de hacer commit revisar:

```powershell
git status --short
```

y agregar archivos explícitamente.

Evitar:

```powershell
git add .
```

si todavía existen archivos temporales, credenciales o pruebas locales.

---

# 14. Resumen para el compañero

Para levantar rápidamente un ambiente demo:

```powershell
cd C:\Users\<usuario>\Documents\GitHub\Dulce-Bocado
```

Configurar los `.env` correspondientes.

Luego:

```powershell
$composeArgs = @(
  "-f", "docker-compose.yml",
  "-f", "docker-compose.sprint1.yml",
  "-f", "docker-compose.sprint2.catalog.yml",
  "-f", "docker-compose.sprint2.customer.yml",
  "-f", "docker-compose.sprint2.order.yml",
  "-f", "docker-compose.sprint2.sales.yml",
  "-f", "docker-compose.sprint3.inventory.yml",
  "-f", "docker-compose.sprint3.production.yml",
  "-f", "docker-compose.sprint4.payment.yml"
)

docker compose @composeArgs up -d
```

Después:

```powershell
powershell.exe `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File ".\scripts\seed-demo.ps1"
```

Finalmente:

```powershell
docker compose @composeArgs ps
```

y abrir:

```text
http://localhost:5173
```

Iniciar sesión como administrador y validar:

```text
Dashboard
Ventas
Pedidos
Inventario
Producción
Pagos
Recibos
Clientes
Catálogo
```

Con esto el ambiente debe quedar completamente poblado para demostraciones, pruebas y defensa del proyecto.
