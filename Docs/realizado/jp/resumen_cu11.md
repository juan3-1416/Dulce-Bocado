# Resumen Oficial — CU11: Gestionar Pago

**Estado:** ✅ COMPLETADO FUNCIONALMENTE

Este documento resume la implementación realizada para el Caso de Uso 11 — Gestionar Pago dentro del sistema de información web de Dulce Bocado.

El CU11 permite registrar, consultar y anular pagos asociados a ventas, controlar pagos parciales, múltiples pagos por una misma venta, calcular el total pagado y el saldo pendiente, e impedir que los pagos registrados superen el total de la venta.

También se integró este caso de uso con CU10 — Gestionar Venta para evitar inconsistencias financieras al editar o anular ventas que ya tienen pagos registrados.

---

## 1. Objetivo del CU11

El objetivo principal de este caso de uso es permitir el control de los pagos realizados por los clientes sobre una venta.

Una venta puede pagarse:

- En un solo pago.
- Mediante varios pagos parciales.
- Utilizando diferentes métodos de pago.

Ejemplo:

Venta total:

`Bs 600.00`

Pagos registrados:

- Pago 1: Bs 200.00
- Pago 2: Bs 300.00
- Pago 3: Bs 100.00

Resultado:

`Total pagado = Bs 600.00`

`Saldo = Bs 0.00`

Cuando el saldo llega a cero, la venta se considera completamente pagada.

---

## 2. Regla para el cálculo del saldo

No se creó una columna física denominada `saldo` dentro de la tabla `venta`.

El saldo se calcula dinámicamente mediante:

`Saldo = Total de la venta - Total de pagos registrados`

Únicamente se consideran los pagos cuyo estado sea:

`REGISTRADO`

Los pagos anulados dejan de formar parte del total pagado.

Esto evita almacenar información redundante y reduce el riesgo de inconsistencias entre el total de la venta, los pagos y el saldo.

---

## 3. Base de Datos

Se creó la tabla:

`pago`

### Campos principales

- `id_pago`
- `id_venta`
- `id_usuario`
- `monto`
- `metodo_pago`
- `referencia`
- `estado`
- `observaciones`
- `fecha_pago`
- `id_usuario_anulacion`
- `motivo_anulacion`
- `fecha_anulacion`
- `fecha_creacion`
- `fecha_actualizacion`

---

## 4. Relaciones de la tabla `pago`

Se implementaron las siguientes claves foráneas:

- `id_venta` → `venta.id_venta`
- `id_usuario` → `usuarios.id_usuario`
- `id_usuario_anulacion` → `usuarios.id_usuario`

Las relaciones utilizan `ON DELETE RESTRICT` para impedir eliminar registros que forman parte del historial financiero de una venta.

La relación principal es:

`Venta 1 : N Pago`

Esto significa que una venta puede tener uno o varios pagos.

---

## 5. Métodos de Pago

La base de datos permite los siguientes métodos:

- `EFECTIVO`
- `QR`
- `ONLINE`

En CU11 se utilizan directamente:

- Efectivo.
- QR.

El método:

`ONLINE`

queda integrado posteriormente con CU12 — Gestionar Pago por Internet.

En CU12 una transacción aprobada genera automáticamente un registro en `pago` con:

`metodo_pago = ONLINE`

---

## 6. Estados del Pago

Los pagos manejan los siguientes estados:

- `REGISTRADO`
- `ANULADO`

No se eliminan pagos físicamente de la base de datos.

Si un pago fue registrado de forma incorrecta, debe anularse.

Flujo:

`REGISTRADO → ANULADO`

Una vez anulado, el pago deja de afectar el saldo de la venta.

---

## 7. Restricciones de Base de Datos

Se agregaron restricciones para garantizar la consistencia de los pagos.

### Monto

El monto debe cumplir:

`monto > 0`

No pueden existir pagos con monto cero o negativo.

### Método de pago

Solo se permiten:

- EFECTIVO
- QR
- ONLINE

### Estado

Solo se permiten:

- REGISTRADO
- ANULADO

### Auditoría de anulación

La restricción:

`chk_pago_auditoria_anulacion`

garantiza que:

Si el pago está:

`REGISTRADO`

entonces:

- `id_usuario_anulacion` debe ser NULL.
- `motivo_anulacion` debe ser NULL.
- `fecha_anulacion` debe ser NULL.

Si el pago está:

`ANULADO`

entonces deben existir obligatoriamente:

- Usuario que anuló.
- Motivo de anulación.
- Fecha de anulación.

---

## 8. Modelo Eloquent

Se creó:

`app/Models/Pago.php`

El modelo está configurado con:

- `$table = 'pago'`
- `$primaryKey = 'id_pago'`
- `$fillable`
- `$casts`
- timestamps personalizados.

### Relaciones del modelo Pago

Se implementaron:

`venta()`

Relaciona el pago con la venta correspondiente.

`usuario()`

Relaciona el pago con el usuario que lo registró.

`usuarioAnulacion()`

Relaciona el pago con el usuario que realizó la anulación.

Posteriormente también se integró:

`pagoInternet()`

para conocer si un pago con método ONLINE fue generado desde CU12.

---

## 9. Relación agregada en Venta

En el modelo:

`Venta`

se agregó:

`pagos()`

como relación `hasMany`.

Esto permite realizar consultas como:

`$venta->pagos`

y operaciones para calcular el total pagado.

Ejemplo conceptual:

`SUM(pago.monto) WHERE estado = REGISTRADO`

---

## 10. Seguridad y Permisos

Se creó el permiso:

`pagos.gestionar_pago`

Descripción:

`Permite registrar, consultar y anular pagos.`

El permiso fue asignado a los roles:

- Administrador.
- Vendedor.

También se propagó a los usuarios que ya tenían dichos roles asignados mediante las relaciones de seguridad existentes.

Todos los endpoints de CU11 están protegidos mediante:

- `auth:sanctum`
- `permiso:pagos.gestionar_pago`

---

## 11. Validación mediante Form Requests

Se crearon:

`StorePagoRequest`

y:

`AnularPagoRequest`

No se creó un `UpdatePagoRequest`.

Esto se hizo intencionalmente porque un pago financiero registrado no debe modificarse directamente.

Si existe un error:

`Pago incorrecto → Anular → Registrar nuevo pago`

Esto mantiene la trazabilidad financiera.

---

## 12. Validaciones de registro

`StorePagoRequest` valida:

- Venta obligatoria.
- Venta existente.
- Monto obligatorio.
- Monto mayor a cero.
- Método de pago válido.
- Referencia opcional.
- Observaciones opcionales.

En CU11 los métodos permitidos desde el formulario son:

- `EFECTIVO`
- `QR`

El método ONLINE es generado automáticamente por CU12.

---

## 13. Validación de anulación

`AnularPagoRequest` exige:

- Motivo obligatorio.
- Mínimo 5 caracteres.
- Máximo 500 caracteres.

El usuario que anula y la fecha son determinados automáticamente por el backend.

---

## 14. PagoController

Se creó:

`app/Http/Controllers/Api/Pagos/PagoController.php`

El controlador implementa:

- `index()`
- `show()`
- `catalogos()`
- `store()`
- `anular()`

También incluye una función interna para calcular el resumen financiero de una venta.

---

## 15. Listado de Pagos

El método:

`index()`

permite:

- Listar todos los pagos.
- Buscar por cliente.
- Buscar por CI/NIT.
- Buscar por referencia.
- Filtrar por estado.
- Filtrar por método de pago.

Las relaciones cargadas incluyen:

- Venta.
- Cliente.
- Usuario que registró.
- Usuario que anuló.

---

## 16. Consulta individual

El método:

`show()`

permite consultar un pago específico.

Incluye información de:

- Venta.
- Cliente.
- Productos vendidos.
- Usuario que registró el pago.
- Usuario que anuló el pago.
- Datos del pago.

Si el pago no existe, devuelve:

`404`

---

## 17. Catálogo de ventas cobrables

Se implementó:

`GET /api/pagos/catalogos`

Este endpoint únicamente devuelve ventas que:

- Estén `REGISTRADA`.
- Tengan saldo pendiente mayor a cero.

Para cada venta devuelve:

- Total.
- Total pagado.
- Saldo.

También devuelve los métodos de pago disponibles:

- EFECTIVO.
- QR.

Una venta completamente pagada deja de aparecer automáticamente en el catálogo.

---

## 18. Registro de Pagos

El método:

`store()`

utiliza:

`DB::transaction()`

y:

`lockForUpdate()`

sobre la venta.

Esto permite proteger el cálculo financiero ante operaciones concurrentes.

Durante el registro se verifica:

1. Que la venta exista.
2. Que la venta esté REGISTRADA.
3. Que tenga saldo pendiente.
4. Que el monto sea mayor a cero.
5. Que el monto no exceda el saldo.
6. Que no exista una transacción online pendiente de CU12.

Luego se registra el pago con el usuario autenticado.

---

## 19. Pagos Parciales

El sistema permite registrar pagos inferiores al total.

Ejemplo:

Venta:

`Bs 600`

Primer pago:

`Bs 200`

Resultado:

`Total pagado = Bs 200`

`Saldo = Bs 400`

Luego puede registrarse otro pago.

---

## 20. Múltiples Pagos

Se permite registrar varios pagos sobre una misma venta.

Ejemplo:

Venta:

`Bs 600`

Pagos:

- Bs 200 EFECTIVO.
- Bs 300 QR.

Resultado:

`Total pagado = Bs 500`

`Saldo = Bs 100`

Posteriormente puede registrarse el pago restante.

---

## 21. Control de Sobrepago

El backend impide que un pago supere el saldo pendiente.

Ejemplo:

Venta:

`Bs 600`

Ya pagado:

`Bs 500`

Saldo:

`Bs 100`

Intento:

`Nuevo pago = Bs 150`

Resultado:

`422`

con un mensaje indicando que el monto supera el saldo pendiente.

Esto evita:

`Total pagado > Total venta`

---

## 22. Venta completamente pagada

Cuando:

`Total pagado = Total venta`

el saldo pasa a:

`Bs 0.00`

y se considera:

`pagada_completa = true`

Después de esto:

- La venta desaparece del catálogo de ventas cobrables.
- No pueden registrarse nuevos pagos sobre ella.

---

## 23. Anulación de Pago

El método:

`anular()`

permite cambiar:

`REGISTRADO → ANULADO`

La operación se ejecuta dentro de una transacción y utiliza:

`lockForUpdate()`

Se registran simultáneamente:

- Estado ANULADO.
- Usuario que anuló.
- Motivo.
- Fecha de anulación.

Un pago que ya está anulado no puede volver a anularse.

---

## 24. Recálculo de saldo después de una anulación

Los pagos anulados dejan de contabilizarse.

Ejemplo:

Venta:

`Bs 600`

Pagos:

- Bs 200 REGISTRADO.
- Bs 300 ANULADO.
- Bs 100 REGISTRADO.

Total válido:

`Bs 300`

Saldo:

`Bs 300`

Esto se calcula automáticamente sin modificar manualmente la venta.

---

## 25. Integración con CU10 — Gestionar Venta

Después de implementar CU11 se agregaron reglas adicionales en CU10.

Si una venta tiene al menos un pago:

`REGISTRADO`

no puede:

- Editarse.
- Anularse.

El sistema devuelve:

`409 Conflict`

La razón es evitar inconsistencias como:

Venta original:

`Bs 500`

Pago registrado:

`Bs 400`

Editar posteriormente la venta a:

`Bs 200`

Este escenario dejaría el sistema financieramente inconsistente.

Por lo tanto, antes de modificar o anular la venta deben anularse los pagos vigentes.

---

## 26. Integración posterior con CU12

CU11 también quedó integrado con:

`CU12 — Gestionar Pago por Internet`

Si una venta tiene una transacción online:

`PENDIENTE`

no se permite registrar simultáneamente un pago manual.

Esto evita que mientras una pasarela está procesando un pago también se registre otro pago sobre el mismo saldo.

Cuando una transacción de CU12 es aprobada, se genera automáticamente un registro en `pago` con:

`metodo_pago = ONLINE`

De esta manera todos los pagos financieros quedan centralizados en la tabla `pago`.

---

## 27. Rutas API

Se configuraron las siguientes rutas:

- `GET /api/pagos`
- `POST /api/pagos`
- `GET /api/pagos/catalogos`
- `GET /api/pagos/{id}`
- `PATCH /api/pagos/{id}/anular`

Todas están protegidas mediante:

`auth:sanctum`

y:

`permiso:pagos.gestionar_pago`

No existe:

`PUT /api/pagos/{id}`

porque los pagos no se editan.

---

## 28. Servicio Frontend

Se creó:

`frontend/src/services/pagoService.js`

Incluye:

- `listarPagos()`
- `obtenerPago()`
- `obtenerCatalogosPago()`
- `crearPago()`
- `anularPago()`

Las operaciones de escritura utilizan:

- Sanctum.
- CSRF.
- Cookies de sesión.
- `credentials: 'include'`.

---

## 29. Interfaz Frontend

Se crearon:

- `PagosPage.jsx`
- `PagoModal.jsx`

La interfaz permite:

- Listar pagos.
- Buscar pagos.
- Filtrar por estado.
- Filtrar por método de pago.
- Registrar nuevos pagos.
- Seleccionar una venta cobrable.
- Ver total de venta.
- Ver total pagado.
- Ver saldo.
- Registrar EFECTIVO.
- Registrar QR.
- Agregar referencia QR.
- Agregar observaciones.
- Anular pagos.
- Registrar motivo de anulación.
- Mostrar pagos anulados.

---

## 30. Validaciones visuales

El frontend también ayuda a prevenir errores antes de enviar la solicitud.

Por ejemplo:

- No permite monto cero.
- No permite monto negativo.
- Muestra el saldo máximo.
- Permite utilizar el saldo completo.
- Evita visualmente registrar más dinero que el saldo disponible.

Sin embargo, el backend continúa siendo la autoridad final para validar el monto.

---

## 31. Routing Frontend

Se agregó la ruta:

`/pagos`

protegida mediante:

`pagos.gestionar_pago`

También se agregó la opción:

`Pagos`

en el Sidebar.

Solo los usuarios autorizados pueden acceder al módulo.

---

## 32. Pruebas realizadas

Se realizaron pruebas completas sobre una venta real de:

`Bs 600.00`

### Primer pago

`Bs 200 EFECTIVO`

Resultado:

`Total pagado = Bs 200`

`Saldo = Bs 400`

### Segundo pago

`Bs 300 QR`

Resultado:

`Total pagado = Bs 500`

`Saldo = Bs 100`

### Intento de sobrepago

Se intentó registrar:

`Bs 150`

cuando el saldo era:

`Bs 100`

El backend rechazó correctamente la operación.

### Pago final

Se registró:

`Bs 100`

Resultado:

`Total pagado = Bs 600`

`Saldo = Bs 0`

La venta dejó de aparecer en el catálogo de pagos.

### Anulación

Se anuló el pago QR de:

`Bs 300`

Entonces los pagos vigentes quedaron:

- Bs 200.
- Bs 100.

Nuevo resultado:

`Total pagado = Bs 300`

`Saldo = Bs 300`

La venta volvió automáticamente al catálogo de ventas cobrables.

---

## 33. Verificación de consistencia con Venta

Durante las pruebas también se verificó que una venta con pagos registrados no pudiera:

- Editarse.
- Anularse.

El backend devolvió correctamente:

`409 Conflict`

Esto confirmó la integración entre CU10 y CU11.

---

## 34. Resultado Final

CU11 permite actualmente:

- Registrar pagos.
- Asociarlos a ventas.
- Registrar pagos parciales.
- Registrar múltiples pagos.
- Utilizar efectivo.
- Utilizar QR.
- Guardar referencias.
- Calcular total pagado.
- Calcular saldo pendiente.
- Detectar ventas completamente pagadas.
- Impedir sobrepagos.
- Impedir nuevos pagos sobre ventas saldadas.
- Consultar pagos.
- Buscar y filtrar pagos.
- Anular pagos.
- Registrar auditoría.
- Recuperar saldo después de una anulación.
- Proteger ventas con pagos vigentes.
- Integrarse con CU12 para pagos ONLINE.

---

# Conclusión

El Caso de Uso 11 — Gestionar Pago fue implementado y probado de forma completa en backend y frontend.

La solución mantiene trazabilidad financiera, evita la modificación directa de pagos ya registrados, permite pagos parciales y múltiples y calcula dinámicamente los saldos pendientes.

También se incorporaron reglas para impedir inconsistencias entre ventas y pagos, además de dejar preparado el módulo para su integración con los pagos por internet del CU12.

**CU11 — Gestionar Pago queda COMPLETADO FUNCIONALMENTE.** ✅