# Guía de pruebas del pago QR con teléfono — Dulce Bocado

## Objetivo

Esta guía permite probar el flujo de pago QR desde una computadora y un teléfono conectados a la misma red Wi‑Fi.

El flujo esperado es:

```text
PC
→ Iniciar sesión en Dulce Bocado
→ Registrar una venta
→ Seleccionar método de pago QR
→ Generar QR

TELÉFONO
→ Escanear QR
→ Abrir enlace público
→ Confirmar pago

PC
→ Detectar pago aprobado
→ Registrar pago
→ Recuperar recibo generado
→ Mostrar recibo automáticamente
```

> Importante: el QR implementado es una **simulación académica**. El escaneo desde el teléfono representa la confirmación del proveedor de pagos. No existe conexión real con un banco.

---

## 1. Requisitos previos

Antes de comenzar verificar que:

- Docker Desktop esté iniciado.
- El proyecto Dulce Bocado esté actualizado.
- Los contenedores del proyecto estén funcionando.
- La computadora y el teléfono estén conectados a la **misma red Wi‑Fi**.
- El frontend use el puerto `5173`.
- El backend use el puerto `8000`.

Ubicarse en la raíz del proyecto:

```powershell
cd C:\Users\TU_USUARIO\Documents\GitHub\Dulce-Bocado
```

Comprobar los contenedores:

```powershell
docker compose ps
```

Debe aparecer al menos:

```text
backend
frontend
db
```

y deben estar en estado `Up` o `healthy`.

---

## 2. Obtener la IP local de la computadora

Abrir PowerShell o CMD y ejecutar:

```powershell
ipconfig
```

Buscar:

```text
Wireless LAN adapter WiFi
```

y dentro de esa sección:

```text
IPv4 Address
```

Ejemplo:

```text
IPv4 Address . . . . . . . . . . . : 192.168.1.18
```

En este ejemplo la IP de la computadora sería:

```text
192.168.1.18
```

### No utilizar

No usar direcciones correspondientes a:

- WSL
- Docker
- VirtualBox
- Loopback

Por ejemplo:

```text
172.x.x.x
192.168.56.x
127.0.0.1
```

Cada computadora puede tener una IP diferente.

---

## 3. Autorizar la IP en Laravel Sanctum

Abrir:

```text
backend/.env
```

Buscar:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

Agregar la IP local de la computadora con el puerto `5173`.

Ejemplo:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,192.168.1.18:5173
```

### No modificar

Mantener estas configuraciones como estén actualmente:

```env
APP_URL=http://localhost:8000
SESSION_DOMAIN=null
```

Cada integrante debe colocar **su propia IP local**, no copiar necesariamente `192.168.1.18`.

---

## 4. Limpiar la configuración de Laravel

Después de modificar `.env`, ejecutar:

```powershell
docker compose exec backend php artisan config:clear
```

También se puede usar:

```powershell
docker compose exec backend php artisan optimize:clear
```

Verificar que Laravel cargó la nueva IP:

```powershell
docker compose exec backend php artisan tinker --execute="dump(config('sanctum.stateful'));"
```

La IP local debe aparecer en la lista.

Ejemplo:

```text
192.168.1.18:5173
```

---

## 5. Verificar la excepción CSRF del QR público

El archivo:

```text
backend/bootstrap/app.php
```

debe conservar la configuración de Sanctum:

```php
$middleware->statefulApi();
```

y además debe incluir la excepción únicamente para la confirmación pública del QR:

```php
$middleware->validateCsrfTokens(except: [
    'api/pago-qr/*/confirmar',
]);
```

La sección debe quedar conceptualmente así:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();

    $middleware->validateCsrfTokens(except: [
        'api/pago-qr/*/confirmar',
    ]);

    $middleware->alias([
        'permiso' => \App\Http\Middleware\VerificarPermiso::class,
    ]);
})
```

### Importante

No desactivar CSRF para todo el sistema.

La excepción solamente corresponde a:

```text
POST /api/pago-qr/{token}/confirmar
```

porque el cliente que escanea el QR no inicia sesión en Dulce Bocado.

---

## 6. Verificar las rutas del QR

Ejecutar:

```powershell
docker compose exec backend php artisan route:list --path=pago-qr
```

Deben existir:

```text
GET       api/pago-qr/{token}
POST      api/pago-qr/{token}/confirmar
```

---

## 7. Probar que el teléfono puede acceder a la computadora

La computadora y el teléfono deben estar conectados a la misma red Wi‑Fi.

Desde el navegador del teléfono escribir:

```text
http://IP_DE_LA_PC:5173
```

Ejemplo:

```text
http://192.168.1.18:5173
```

Si aparece Dulce Bocado, la comunicación funciona.

No es necesario iniciar sesión desde el teléfono.

---

## 8. Abrir Dulce Bocado desde la IP local en la computadora

En la computadora evitar entrar mediante:

```text
http://localhost:5173
```

Abrir en cambio:

```text
http://IP_DE_LA_PC:5173
```

Ejemplo:

```text
http://192.168.1.18:5173
```

Luego iniciar sesión normalmente.

Esto es importante porque el QR utiliza:

```js
window.location.origin
```

para construir la URL pública.

Si se entra al sistema desde:

```text
http://192.168.1.18:5173
```

el QR generado tendrá una URL similar a:

```text
http://192.168.1.18:5173/pago-qr/TOKEN
```

que sí puede ser abierta desde el teléfono.

---

## 9. Realizar una prueba completa

En la computadora:

```text
Ventas
→ Nueva Venta
→ Registrar Venta
→ Procesar Pago
→ Método de pago: QR
→ Generar QR
```

Debe aparecer:

```text
Pago mediante QR
Venta #...
Bs ...
Esperando pago...
```

El QR tendrá una vigencia aproximada de 5 minutos.

---

## 10. Escanear el QR con el teléfono

Abrir la cámara del teléfono y escanear el código.

El enlace debe tener una estructura similar a:

```text
http://192.168.1.18:5173/pago-qr/TOKEN
```

El teléfono debería mostrar primero:

```text
Confirmando pago...
```

y luego:

```text
Pago confirmado correctamente.
```

También debe indicar que:

```text
El sistema registró el pago y generó el recibo automáticamente.
```

---

## 11. Resultado esperado en la computadora

Después de confirmar desde el teléfono, la PC debe detectar el cambio automáticamente.

Flujo esperado:

```text
Esperando pago...
→ Pago confirmado
→ Pago registrado
→ Recibo generado
→ Recibo mostrado automáticamente
```

No debe ser necesario ingresar manualmente a la página de pagos por internet.

---

## 12. Verificar el resultado en la base de datos

Si se quiere comprobar que el pago y el recibo fueron creados, ejecutar:

```powershell
docker compose exec db psql -U dulce_bocado -d dulce_bocado -P pager=off -c "SELECT pi.id_pago_internet, pi.id_venta, pi.estado AS estado_qr, pi.id_pago, r.id_recibo, r.estado AS estado_recibo FROM pago_internet pi LEFT JOIN pago p ON p.id_pago = pi.id_pago LEFT JOIN recibo r ON r.id_pago = p.id_pago AND r.estado = 'EMITIDO' ORDER BY pi.id_pago_internet DESC LIMIT 1;"
```

Resultado esperado:

```text
estado_qr      APROBADO
id_pago        <número>
id_recibo      <número>
estado_recibo  EMITIDO
```

---

# Solución de problemas

## Error: `Session store not set on request`

Causa habitual:

La IP local no está incluida en:

```env
SANCTUM_STATEFUL_DOMAINS
```

Solución:

Agregar:

```text
IP_DE_LA_PC:5173
```

Ejemplo:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,192.168.1.18:5173
```

y ejecutar:

```powershell
docker compose exec backend php artisan config:clear
```

---

## Error: `CSRF token mismatch`

Verificar que `backend/bootstrap/app.php` incluya:

```php
$middleware->validateCsrfTokens(except: [
    'api/pago-qr/*/confirmar',
]);
```

Después ejecutar:

```powershell
docker compose exec backend php artisan optimize:clear
```

---

## El teléfono no abre `http://IP:5173`

Primero comprobar que:

- PC y teléfono estén en el mismo Wi‑Fi.
- La IP utilizada sea la del adaptador Wi‑Fi.
- Docker y el frontend estén ejecutándose.
- El puerto `5173` esté expuesto.

Ejecutar:

```powershell
docker compose ps
```

El frontend debería mostrar algo similar a:

```text
0.0.0.0:5173->5173/tcp
```

Si sigue sin funcionar, Windows Firewall puede estar bloqueando el acceso al puerto.

---

## El QR abre `localhost:5173`

Significa que el QR fue generado mientras Dulce Bocado estaba abierto desde:

```text
http://localhost:5173
```

Cerrar esa pestaña y abrir:

```text
http://IP_DE_LA_PC:5173
```

Después generar un **QR nuevo**.

---

## El QR aparece vencido

Los códigos son temporales.

Simplemente generar un nuevo QR desde el sistema.

---

## El teléfono confirma el pago pero la PC no muestra el recibo

Primero comprobar en la base de datos:

```powershell
docker compose exec db psql -U dulce_bocado -d dulce_bocado -P pager=off -c "SELECT pi.id_pago_internet, pi.id_venta, pi.estado AS estado_qr, pi.id_pago, r.id_recibo, r.estado AS estado_recibo FROM pago_internet pi LEFT JOIN pago p ON p.id_pago = pi.id_pago LEFT JOIN recibo r ON r.id_pago = p.id_pago AND r.estado = 'EMITIDO' ORDER BY pi.id_pago_internet DESC LIMIT 1;"
```

Si aparece:

```text
APROBADO
id_pago con valor
id_recibo con valor
EMITIDO
```

entonces el backend funcionó correctamente y el problema estaría únicamente en la apertura automática del recibo en el frontend.

---

# Checklist rápido

Antes de probar:

- [ ] Docker Desktop iniciado.
- [ ] `docker compose ps` correcto.
- [ ] PC y teléfono en el mismo Wi‑Fi.
- [ ] IP local identificada con `ipconfig`.
- [ ] IP agregada a `SANCTUM_STATEFUL_DOMAINS`.
- [ ] `config:clear` ejecutado.
- [ ] Excepción CSRF pública del QR configurada.
- [ ] `GET /api/pago-qr/{token}` disponible.
- [ ] `POST /api/pago-qr/{token}/confirmar` disponible.
- [ ] El teléfono abre `http://IP_PC:5173`.
- [ ] La PC usa `http://IP_PC:5173` y no `localhost`.
- [ ] Se genera un QR nuevo.
- [ ] El teléfono confirma el pago.
- [ ] La PC detecta `APROBADO`.
- [ ] Se genera el pago.
- [ ] Se genera el recibo.
- [ ] El recibo se abre automáticamente.

---

## Nota para cada integrante

La IP local puede cambiar cuando la computadora se conecta a otra red Wi‑Fi o cuando el router asigna una nueva dirección.

Si deja de funcionar:

```powershell
ipconfig
```

y volver a verificar la IPv4 del adaptador Wi‑Fi.

Luego actualizar:

```env
SANCTUM_STATEFUL_DOMAINS
```

con la nueva IP y ejecutar:

```powershell
docker compose exec backend php artisan config:clear
```
