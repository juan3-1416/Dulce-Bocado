# Resumen Oficial — CU12: Gestionar Pago por Internet

**Estado:** ✅ COMPLETADO FUNCIONALMENTE

Este documento resume la implementación realizada para el Caso de Uso 12 — Gestionar Pago por Internet dentro del sistema de información web de Dulce Bocado.

El CU12 permite iniciar, consultar y procesar transacciones de pago por internet asociadas a ventas, utilizando una pasarela externa simulada para fines académicos.

El sistema diferencia claramente entre una transacción online y un pago financiero real.

Una transacción por internet comienza como:

`PENDIENTE`

y posteriormente puede finalizar como:

- `APROBADO`
- `RECHAZADO`

Solamente una transacción aprobada genera automáticamente un registro financiero en la tabla `pago` con:

`metodo_pago = ONLINE`

Una transacción rechazada conserva su historial, pero no genera ningún pago.

---

## 1. Objetivo del CU12

El objetivo principal del CU12 es administrar el proceso de pago electrónico de una venta mediante un proveedor externo.

El flujo implementado es:

`Venta con saldo pendiente`

→ `Iniciar transacción online`

→ `PENDIENTE`

→ respuesta del proveedor

→ `APROBADO` o `RECHAZADO`

Si es:

`APROBADO`

se genera:

`Pago ONLINE REGISTRADO`

Si es:

`RECHAZADO`

no se genera ningún registro financiero en `pago`.

---

## 2. Separación entre Transacción Online y Pago

Se decidió manejar por separado:

- La transacción con el proveedor.
- El pago financiero confirmado.

La transacción externa se almacena en:

`pago_internet`

El pago financiero se almacena en:

`pago`

Esto permite representar correctamente situaciones como:

- Solicitud enviada.
- Operación pendiente.
- Pago rechazado.
- Pago aprobado.

Una transacción pendiente o rechazada no debe considerarse dinero efectivamente recibido.

---

## 3. Base de Datos

Se creó la tabla:

`pago_internet`

### Campos principales

- `id_pago_internet`
- `id_venta`
- `id_pago`
- `id_usuario`
- `monto`
- `proveedor`
- `referencia_transaccion`
- `estado`
- `motivo_rechazo`
- `respuesta_proveedor`
- `fecha_solicitud`
- `fecha_confirmacion`
- `fecha_creacion`
- `fecha_actualizacion`

---

## 4. Relaciones de la tabla `pago_internet`

Se configuraron las siguientes claves foráneas:

- `id_venta` → `venta.id_venta`
- `id_pago` → `pago.id_pago`
- `id_usuario` → `usuarios.id_usuario`

Las relaciones utilizan restricciones para proteger la integridad de la información histórica.

### Relación con Venta

Una venta puede tener varios intentos de pago por internet.

Ejemplo:

`Venta #10`

- Transacción #1 → RECHAZADO
- Transacción #2 → RECHAZADO
- Transacción #3 → APROBADO

Esto permite conservar todos los intentos realizados.

### Relación con Pago

El campo:

`id_pago`

permanece vacío mientras la transacción no esté aprobada.

Cuando la operación pasa a:

`APROBADO`

se genera un registro en `pago` y su identificador queda almacenado en:

`pago_internet.id_pago`

---

## 5. Restricciones de Unicidad

Se estableció como único:

`referencia_transaccion`

Esto evita registrar dos transacciones con la misma referencia externa.

También se estableció como único:

`id_pago`

por lo que un pago financiero no puede asociarse a más de una transacción online.

---

## 6. Estados de la Transacción

CU12 maneja tres estados:

- `PENDIENTE`
- `APROBADO`
- `RECHAZADO`

El flujo permitido es:

`PENDIENTE → APROBADO`

o:

`PENDIENTE → RECHAZADO`

Una transacción que ya fue procesada no puede confirmarse nuevamente.

---

## 7. Restricción de Consistencia de Estados

Se agregó la restricción:

`chk_pago_internet_consistencia`

Esta garantiza que cada estado tenga información coherente.

### Estado PENDIENTE

Debe cumplir:

- `id_pago = NULL`
- `fecha_confirmacion = NULL`
- `motivo_rechazo = NULL`

### Estado APROBADO

Debe cumplir:

- `id_pago` obligatorio.
- `fecha_confirmacion` obligatoria.
- `motivo_rechazo = NULL`

### Estado RECHAZADO

Debe cumplir:

- `id_pago = NULL`
- `fecha_confirmacion` obligatoria.
- `motivo_rechazo` obligatorio.

De esta manera la propia base de datos también protege la consistencia de las transacciones.

---

## 8. Restricción de Monto

Se agregó:

`chk_pago_internet_monto`

con la regla:

`monto > 0`

Por lo tanto, no pueden iniciarse transacciones con monto cero o negativo.

---

## 9. Modelo Eloquent

Se creó:

`app/Models/PagoInternet.php`

El modelo fue configurado con:

- `$table = 'pago_internet'`
- `$primaryKey = 'id_pago_internet'`
- `$fillable`
- `$casts`
- timestamps personalizados.

### Casts principales

- `monto` → decimal.
- `respuesta_proveedor` → array.
- `fecha_solicitud` → datetime.
- `fecha_confirmacion` → datetime.
- `fecha_creacion` → datetime.
- `fecha_actualizacion` → datetime.

---

## 10. Relaciones del modelo PagoInternet

Se implementaron:

### `venta()`

Relaciona la transacción con su venta.

### `pago()`

Relaciona la transacción aprobada con el pago financiero generado.

### `usuario()`

Relaciona la transacción con el usuario que inició el proceso.

---

## 11. Relaciones agregadas en modelos existentes

### Venta

En el modelo `Venta` se agregó:

`pagosInternet()`

como relación `hasMany`.

Esto permite consultar todos los intentos de pago online realizados sobre una venta.

### Pago

En el modelo `Pago` se agregó:

`pagoInternet()`

como relación `hasOne`.

Esto permite identificar cuándo un pago con método ONLINE fue generado desde CU12.

---

## 12. Seguridad y Permisos

Se creó el permiso:

`pagos.gestionar_pago_internet`

Descripción:

`Permite iniciar, consultar y confirmar pagos por internet.`

El permiso fue asignado a:

- Administrador.
- Vendedor.

También fue propagado a los usuarios que ya tenían dichos roles asignados.

Los endpoints del CU12 están protegidos mediante:

- `auth:sanctum`
- `permiso:pagos.gestionar_pago_internet`

---

## 13. Form Requests

Se crearon:

- `StorePagoInternetRequest`
- `ConfirmarPagoInternetRequest`

No se creó un Request de edición porque las transacciones online no se modifican manualmente después de ser procesadas.

---

## 14. StorePagoInternetRequest

Valida el inicio de una nueva transacción.

Campos principales:

### Venta

`id_venta`

Debe:

- Ser obligatorio.
- Ser entero.
- Existir en la tabla `venta`.

### Monto

`monto`

Debe:

- Ser obligatorio.
- Ser numérico.
- Ser mayor a cero.

El backend posteriormente realiza validaciones adicionales sobre el saldo disponible.

---

## 15. ConfirmarPagoInternetRequest

Se utiliza para procesar el resultado del proveedor.

El campo:

`resultado`

solamente permite:

- `APROBADO`
- `RECHAZADO`

Cuando el resultado sea:

`RECHAZADO`

se exige:

`motivo_rechazo`

con:

- mínimo 5 caracteres,
- máximo 500 caracteres.

---

## 16. Pasarela de Pago Simulada

Se creó:

`app/Services/PagosInternet/PasarelaPagoSimulada.php`

Este servicio representa académicamente la comunicación con un proveedor externo.

El proveedor utilizado es:

`PASARELA_SIMULADA`

La lógica de la pasarela fue separada del controlador para evitar mezclar reglas de negocio con detalles de integración externa.

Conceptualmente:

`React`

→ `PagoInternetController`

→ `PasarelaPagoSimulada`

→ respuesta del proveedor.

---

## 17. Inicio de una operación externa

El servicio:

`PasarelaPagoSimulada::iniciar()`

genera automáticamente una referencia única.

Ejemplo:

`SIM-20260907155319-U7FUZWAC`

Además devuelve:

- Proveedor.
- Referencia.
- Estado PENDIENTE.
- Código simulado.
- Mensaje del proveedor.
- Venta.
- Monto.

La información devuelta se almacena en:

`respuesta_proveedor`

como JSON.

---

## 18. Confirmación simulada

El servicio también implementa:

`confirmar()`

Este método puede simular:

`APROBADO`

o:

`RECHAZADO`

Para aprobación devuelve una respuesta indicando que la transacción fue aceptada.

Para rechazo devuelve:

- estado RECHAZADO,
- motivo,
- código del proveedor,
- mensaje correspondiente.

---

## 19. PagoInternetController

Se creó:

`app/Http/Controllers/Api/PagosInternet/PagoInternetController.php`

El controlador implementa:

- `index()`
- `show()`
- `catalogos()`
- `store()`
- `confirmar()`

También incluye una función interna para calcular el resumen financiero de la venta.

---

## 20. Listado de Transacciones

El método:

`index()`

permite consultar las transacciones online.

Incluye filtros por:

- Estado.
- Búsqueda.

La búsqueda permite localizar información mediante:

- Referencia de transacción.
- Proveedor.
- Nombre del cliente.
- Apellido del cliente.
- CI/NIT.
- Cliente ocasional.

Las relaciones cargadas incluyen:

- Venta.
- Cliente.
- Usuario.
- Pago generado.

---

## 21. Consulta Individual

El método:

`show()`

permite consultar una transacción específica.

Incluye:

- Venta.
- Cliente.
- Detalles de venta.
- Producto.
- Presentación.
- Usuario que inició la transacción.
- Pago financiero generado, si existe.

Si la transacción no existe se devuelve:

`404`

---

## 22. Catálogo de Ventas Disponibles

Se implementó:

`GET /api/pagos-internet/catalogos`

Este endpoint únicamente devuelve ventas que cumplan:

- Estado `REGISTRADA`.
- Saldo pendiente mayor a cero.
- Ninguna transacción online `PENDIENTE`.

Para cada venta se devuelve:

- Total.
- Total pagado.
- Saldo.
- Cliente.
- Fecha.

También se devuelve:

`proveedor = PASARELA_SIMULADA`

---

## 23. Inicio de Pago por Internet

El método:

`store()`

ejecuta la operación mediante:

`DB::transaction()`

y bloquea la venta utilizando:

`lockForUpdate()`

Antes de crear la transacción se valida:

1. Que la venta exista.
2. Que esté REGISTRADA.
3. Que tenga saldo pendiente.
4. Que el monto sea válido.
5. Que el monto no supere el saldo.
6. Que no exista otra transacción online PENDIENTE.

---

## 24. Una sola transacción pendiente por venta

Mientras una venta tenga una transacción:

`PENDIENTE`

no puede iniciarse otra transacción online sobre la misma venta.

Esto evita múltiples procesos simultáneos intentando utilizar el mismo saldo.

Ejemplo:

`Venta saldo Bs 500`

`Transacción A Bs 500 → PENDIENTE`

No se permite:

`Transacción B Bs 500 → PENDIENTE`

hasta que la primera sea resuelta.

---

## 25. Registro de la solicitud

Al iniciar correctamente una transacción se guarda:

- Venta.
- Usuario.
- Monto.
- Proveedor.
- Referencia.
- Estado PENDIENTE.
- Respuesta del proveedor.
- Fecha de solicitud.

En este momento:

`id_pago = NULL`

porque todavía no existe dinero confirmado.

---

## 26. Confirmación de una Transacción

El método:

`confirmar()`

utiliza:

`DB::transaction()`

y:

`lockForUpdate()`

sobre:

- Transacción online.
- Venta.

Esto protege el proceso ante operaciones concurrentes.

---

## 27. Transacción RECHAZADA

Si la pasarela devuelve:

`RECHAZADO`

el sistema actualiza:

- `estado = RECHAZADO`
- `motivo_rechazo`
- `respuesta_proveedor`
- `fecha_confirmacion`

y conserva:

`id_pago = NULL`

Por lo tanto, una transacción rechazada no afecta:

- total pagado,
- saldo,
- pagos financieros.

---

## 28. Transacción APROBADA

Si el proveedor devuelve:

`APROBADO`

el backend vuelve a verificar:

- Estado actual de la venta.
- Total de venta.
- Total pagado.
- Saldo actual.
- Monto de la transacción.

Esto es importante porque el saldo pudo cambiar desde el momento en que la transacción fue iniciada.

---

## 29. Revalidación del saldo al aprobar

El sistema no confía únicamente en el saldo calculado cuando se creó la transacción.

Antes de aprobar calcula nuevamente:

`Saldo actual = Total venta - Pagos REGISTRADOS`

Si:

`monto transacción > saldo actual`

la aprobación es bloqueada.

Esto evita un sobrepago si el estado financiero cambió durante el proceso externo.

---

## 30. Generación Automática de Pago ONLINE

Cuando la transacción se aprueba correctamente se crea automáticamente un registro en:

`pago`

con:

- `id_venta`
- `id_usuario`
- `monto`
- `metodo_pago = ONLINE`
- `referencia`
- `estado = REGISTRADO`
- `fecha_pago`

La referencia utilizada es la misma:

`referencia_transaccion`

de CU12.

---

## 31. Vinculación entre Transacción y Pago

Después de generar el pago se actualiza:

`pago_internet.id_pago`

con el identificador del nuevo pago.

Ejemplo real de la prueba:

`PagoInternet #1`

→ `Pago #6`

De esta forma existe trazabilidad directa entre la operación externa y el movimiento financiero.

---

## 32. Bloqueo de Doble Confirmación

Una transacción que ya se encuentre:

- APROBADA
- RECHAZADA

no puede volver a procesarse.

Si se intenta confirmar nuevamente, el backend responde:

`409 Conflict`

Esto evita generar pagos duplicados.

---

## 33. Integración con CU10 — Gestionar Venta

CU12 introdujo nuevas reglas en CU10.

Mientras una venta tenga una transacción online:

`PENDIENTE`

no puede:

- Editarse.
- Anularse.

Esto evita modificar la venta mientras un proveedor externo está procesando un determinado monto.

Ejemplo:

`Venta Bs 800`

→ `Pago online Bs 500 PENDIENTE`

No se permite modificar la venta mientras la transacción no haya sido resuelta.

---

## 34. Integración con CU11 — Gestionar Pago

También se modificó CU11.

Mientras una venta tenga una transacción online:

`PENDIENTE`

no se permite registrar simultáneamente otro pago manual mediante:

- EFECTIVO.
- QR.

Esto evita utilizar dos veces el mismo saldo.

Una vez que la transacción online pasa a:

- APROBADO
- RECHAZADO

la restricción deja de aplicar.

---

## 35. Rutas API

Se implementaron:

- `GET /api/pagos-internet`
- `POST /api/pagos-internet`
- `GET /api/pagos-internet/catalogos`
- `GET /api/pagos-internet/{id}`
- `PATCH /api/pagos-internet/{id}/confirmar`

Todas están protegidas por:

`auth:sanctum`

y:

`permiso:pagos.gestionar_pago_internet`

---

## 36. Servicio Frontend

Se creó:

`frontend/src/services/pagoInternetService.js`

Incluye:

- `listarPagosInternet()`
- `obtenerPagoInternet()`
- `obtenerCatalogosPagoInternet()`
- `crearPagoInternet()`
- `confirmarPagoInternet()`

Las operaciones de escritura utilizan:

- Sanctum.
- CSRF.
- Cookies de sesión.
- `credentials: 'include'`.

---

## 37. Interfaz Frontend

Se crearon:

- `PagosInternetPage.jsx`
- `PagoInternetModal.jsx`

La interfaz permite:

- Listar transacciones.
- Buscar.
- Filtrar por estado.
- Iniciar una nueva transacción.
- Seleccionar venta.
- Consultar total.
- Consultar total pagado.
- Consultar saldo.
- Definir monto.
- Usar el saldo completo.
- Visualizar proveedor.
- Visualizar referencia.
- Visualizar fechas.
- Aprobar.
- Rechazar.
- Registrar motivo de rechazo.

---

## 38. Estados visuales

El frontend diferencia los estados:

### PENDIENTE

Se muestra como operación todavía sin resolver.

Permite las acciones:

- Aprobar.
- Rechazar.

### APROBADO

Muestra que la operación fue completada.

También muestra el identificador del pago financiero generado.

### RECHAZADO

Muestra:

- Estado rechazado.
- Motivo de rechazo.
- Fecha de confirmación.

No genera pago.

---

## 39. Modal de Nueva Transacción

`PagoInternetModal.jsx`

permite seleccionar únicamente las ventas que el backend considera disponibles.

Al seleccionar una venta muestra:

- Número de venta.
- Total.
- Total pagado.
- Saldo.

También permite:

`Usar saldo completo`

para completar automáticamente el monto pendiente.

---

## 40. Validaciones Frontend

La interfaz verifica:

- Venta seleccionada.
- Monto mayor a cero.
- Monto no superior al saldo.
- Existencia de ventas disponibles.

Estas validaciones mejoran la experiencia del usuario.

Sin embargo, el backend continúa siendo la autoridad final y vuelve a validar todas las reglas.

---

## 41. Confirmación desde Frontend

Para fines académicos se implementaron botones:

- `Aprobar`
- `Rechazar`

Estos simulan la respuesta que normalmente enviaría el proveedor externo.

Al aprobar se muestra una advertencia indicando que se generará automáticamente un pago ONLINE.

Al rechazar se solicita obligatoriamente un motivo.

---

## 42. Consideración de Producción

La aprobación o rechazo manual desde la interfaz corresponde únicamente a la simulación académica implementada para CU12.

En un entorno real, la confirmación debería provenir del proveedor mediante mecanismos como:

- API segura.
- Webhook.
- Callback verificado.

La separación mediante `PasarelaPagoSimulada` permite posteriormente sustituir la simulación por un proveedor real sin rediseñar toda la lógica del módulo.

---

## 43. Routing Frontend

Se agregó la ruta:

`/pagos-internet`

protegida mediante:

`pagos.gestionar_pago_internet`

También se agregó al Sidebar:

`Pagos por Internet`

Los usuarios sin permiso no pueden acceder al módulo.

---

## 44. Prueba Funcional — Venta #4

Para las pruebas se utilizó:

`Venta #4`

con:

`Total = Bs 800.00`

Inicialmente:

`Total pagado = Bs 0.00`

`Saldo = Bs 800.00`

---

## 45. Prueba de Transacción Aprobada

Se inició una transacción por:

`Bs 300.00`

La transacción quedó inicialmente:

`PENDIENTE`

con una referencia generada automáticamente.

Posteriormente se simuló:

`APROBADO`

Resultado:

- Transacción APROBADA.
- Se generó un Pago ONLINE.
- Se vinculó el pago con la transacción.

El pago generado fue:

`Pago #6`

con:

- Venta #4.
- Monto Bs 300.
- Método ONLINE.
- Estado REGISTRADO.

Después:

`Total pagado = Bs 300`

`Saldo = Bs 500`

---

## 46. Prueba de Transacción Rechazada

Se inició posteriormente una segunda transacción por:

`Bs 200.00`

Inicialmente quedó:

`PENDIENTE`

Después se simuló:

`RECHAZADO`

con el motivo:

`Transacción rechazada durante la prueba funcional de CU12.`

Resultado:

- Estado RECHAZADO.
- `id_pago = NULL`.
- No se generó ningún movimiento en la tabla `pago`.

El estado financiero de la venta continuó:

`Total pagado = Bs 300`

`Saldo = Bs 500`

---

## 47. Verificación Final en Base de Datos

Las transacciones de Venta #4 quedaron conceptualmente:

`Transacción #1`

- Bs 300.
- APROBADO.
- Vinculada al Pago #6.

`Transacción #2`

- Bs 200.
- RECHAZADO.
- Sin pago asociado.

En la tabla `pago` solamente existe el movimiento correspondiente a la transacción aprobada:

`Bs 300 | ONLINE | REGISTRADO`

No existe ningún pago financiero por la transacción rechazada.

---

## 48. Resultado Financiero Final

Después de las pruebas:

`Total Venta = Bs 800.00`

`Total Pagado = Bs 300.00`

`Saldo = Bs 500.00`

Esto demuestra que únicamente las transacciones aprobadas afectan el saldo de una venta.

---

## 49. Componentes Implementados

CU12 quedó integrado mediante:

### Base de datos

- `pago_internet`

### Backend

- `PagoInternet.php`
- `StorePagoInternetRequest.php`
- `ConfirmarPagoInternetRequest.php`
- `PasarelaPagoSimulada.php`
- `PagoInternetController.php`
- `PagosInternetInicialSeeder.php`
- Rutas REST.

### Frontend

- `pagoInternetService.js`
- `PagosInternetPage.jsx`
- `PagoInternetModal.jsx`
- Ruta protegida.
- Opción en Sidebar.

---

## 50. Resultado Final del CU12

El sistema permite actualmente:

- Seleccionar una venta con saldo pendiente.
- Iniciar un pago por internet.
- Generar una referencia única.
- Registrar proveedor.
- Mantener una transacción PENDIENTE.
- Consultar transacciones.
- Buscar transacciones.
- Filtrar por estado.
- Aprobar una transacción.
- Rechazar una transacción.
- Registrar motivo de rechazo.
- Registrar fechas de solicitud y confirmación.
- Almacenar respuesta del proveedor.
- Generar automáticamente un Pago ONLINE al aprobar.
- Evitar crear pagos por operaciones rechazadas.
- Impedir doble confirmación.
- Revalidar saldo antes de aprobar.
- Evitar sobrepagos.
- Bloquear pagos manuales mientras exista una transacción pendiente.
- Bloquear edición o anulación de venta mientras exista una transacción pendiente.
- Mantener trazabilidad entre Venta, PagoInternet y Pago.

---

# Conclusión

El Caso de Uso 12 — Gestionar Pago por Internet fue implementado y probado correctamente tanto en backend como en frontend.

La arquitectura separa correctamente la transacción realizada con el proveedor externo del pago financiero definitivo, garantizando que únicamente una operación aprobada sea considerada dinero recibido por Dulce Bocado.

También se implementaron controles de concurrencia, validación de saldo, trazabilidad mediante referencias, integración con CU10 y CU11 y una pasarela simulada que permite demostrar académicamente el proceso completo sin depender de credenciales o servicios bancarios reales.

La estructura desarrollada permite que en una futura implementación productiva la pasarela simulada pueda sustituirse por una integración real mediante API o webhook manteniendo la lógica principal del sistema.

**CU12 — Gestionar Pago por Internet queda COMPLETADO FUNCIONALMENTE.** ✅