# Sprint 4 — Cierre técnico de T402 y T403

Fecha: 2026-11-19. Base recibida: `f0daadf`, integrada mediante `1d6dc70`. Cambios de esta intervención: árbol de trabajo local, todavía sin commit. Responsable de ejecución: Codex, sesión de desarrollo de Fabián.

## Alcance y resultado

**T402 Completado:** servicio y esquema PostgreSQL preparados; imagen Docker construida; migración aplicada; salud HTTP y persistencia tras reinicio comprobadas. Se corrigieron los valores predeterminados de `.env.example` (PostgreSQL, sesiones en archivo, caché en archivo y cola síncrona), se agregó `.dockerignore` y se reemplazó el README de plantilla por instrucciones operativas. PHP 8.4 y Composer se ejecutaron en Docker; Boost se instaló según las instrucciones locales y sus guías generadas se sincronizaron en AGENTS.md y CLAUDE.md.

**T403 Completado en alcance de servicio:** efectivo, parciales, saldo, rechazo de sobrepago e idempotencia verificados con PostgreSQL real. Se corrigió la aceptación de importes con más de dos decimales y notación exponencial para impedir truncamiento monetario silencioso. Se agregaron pruebas de autorización, origen y concurrencia.

Este cierre de tareas técnicas no declara HU11 ni el Sprint aceptados. Security, Sales y Orders están simulados en la suite; faltan la integración REST real, la confirmación de ventas T404, los permisos/enrutamiento completos T406 y la aceptación T407/T414. No se registran horas reales ni aprobación del Product Owner sin evidencia.

## Entorno reproducible

- Stack exclusivo `dulce-payment-check`, definido en `docker-compose.payment-test.yml`.
- PHP 8.4.27, PostgreSQL 16, PHPUnit 12.5.44; imagen construida desde el Dockerfile de Payment y su composer.lock.
- Base `dulce_payment_test`, host `payment-test-db`; red propia, sin puertos publicados ni bases de desarrollo montadas. La suite comprueba entorno, host, motor y nombre antes de migrar o truncar datos.
- Las pruebas limpian exclusivamente los datos ficticios de esa base. No se ejecutaron seeders ni migraciones sobre Security o bases de desarrollo.

Desde la raíz del repositorio:

```powershell
docker compose -p dulce-payment-check -f docker-compose.payment-test.yml build payment-test
docker compose -p dulce-payment-check -f docker-compose.payment-test.yml run --rm payment-test vendor/bin/phpunit --display-warnings
docker compose -p dulce-payment-check -f docker-compose.payment-test.yml down
```

## Evidencia observada

| Verificación | Resultado | Alcance |
| --- | --- | --- |
| Construcción de imagen final | Correcta | Dependencias, extensiones y autoload |
| Suite final desde imagen sin montajes adicionales | 18 pruebas, 93 aserciones, sin fallos | Incluye 16 casos de Payment y 2 pruebas de ejemplo heredadas |
| `php artisan migrate:status` | `create_payment_tables` aplicada, lote 1 | Esquema real PostgreSQL |
| `GET /up` en contenedor Payment | HTTP 200 | Arranque del servicio |
| Consulta antes y después de reiniciar PostgreSQL | 1 pago, suma 40.00 BOB en ambos casos | Persistencia en el contenedor de pruebas; no acredita todavía PS4-19 completo |
| Pint sobre PHP modificado | Correcto | Formato de request, suite y proceso auxiliar |

La primera ejecución detectó tres fallos en las pruebas por acumulación de respuestas HTTP simuladas. Se sustituyó la instancia del cliente entre escenarios y se repitió la suite; no se ocultaron fallos con exclusiones.

## Cobertura respecto de PS4

- PS4-06/07: pagos de 40.00 y 60.00 sobre total 100.00; saldo final 0.00 y dos pagos persistidos.
- PS4-08: rechazo de cero, negativos, exceso del saldo, precisión mayor a dos decimales, notación exponencial y valores fuera de rango. Dos procesos independientes intentan cobrar 70.00 cada uno sobre 100.00: resultados 201/409 y un pago de 70.00.
- PS4-09: reintento reproduce respuesta sin duplicado; contenido distinto con misma clave produce 409. Dos procesos simultáneos con igual clave producen 201/201 y un solo pago.
- PS4-16, cobertura parcial de servicio: 401 sin token/token inválido, 403 sin permiso o acceso al origen; actor interno falsificado no sustituye al actor validado por Security.
- PS4-18, cobertura simulada: Security/origen indisponible produce 503 sin pago; venta en borrador produce 409; origen ausente produce 404.
- Pago de pedido conserva referencia y actor, sin solicitudes de escritura a Orders.
- PS4-01/19/20, cobertura parcial: arranque y persistencia de Payment, y protección de la base de pruebas. Los escenarios integrales de la matriz siguen pendientes.

## Siguiente trabajo

Continuar T404 y T406, coordinando el contrato con Inventario y Security; luego verificar efectivo por Gateway con datos reales de venta confirmada. QR, callbacks, recibos, interfaces y el cierre integral mantienen sus estados en [sprint4.md](sprint4.md). Consultar [README de Payment](../microservices/payment-service/README.md) para contratos y comandos.
