**# Roadmap de desarrollo — Sprint 2: microservicio de Ventas**



**\*\*Estado:\*\*** ejecución en curso. T214–T215 están implementados y probados en aislamiento; T201–T202 de Customer ya están disponibles e integrados con Sales y Gateway. Catalog real, la creación/edición completa de ventas y la evidencia integral siguen pendientes.

**\*\*Foco del equipo:\*\*** \`sales-service\` y su integración mínima.

**\*\*Sprint Goal de referencia:\*\*** registrar pedidos y ventas usando información de clientes y catálogo mediante APIs. El backlog oficial del Sprint 2 contiene Customer, Catalog, Orders y Sales; este roadmap cubre **\*\*solo Ventas\*\***. No marcar el Sprint 2 completo como cerrado por terminar este servicio.



**## Registro de avance obligatorio**



Actualizar esta tabla **\*\*en el mismo cambio\*\*** que completa cada paso. Usar \`EN CURSO\` mientras se implementa y \`HECHO\` solo cuando la comprobación de salida tenga resultado y evidencia. Si una prueba falla, mantener \`EN CURSO\` y anotar el fallo; \`BLOQUEADO\` exige causa y dependencia concreta. No marcar \`HECHO\` por compilar o por redactar código.



\| Paso | Estado | Evidencia y resultado | Siguiente acción |

\|---|---|---|---|

\| 0. Baseline | **\*\*HECHO (inventario)\*\*** | Revisión de código y contratos documentada en sección 1. No se ejecutaron servicios. | Cerrar acuerdos de la sección 3 con responsables propietarios. |

\| 1. Seguridad compartida | **\*\*HECHO (base de autorización)\*\*** | 11-11-2026: introspección interna, permisos y middleware Sales. 12-11-2026: Customer reutiliza Security por introspección; permisos \`clientes.ver\`, \`clientes.crear\`, \`clientes.modificar\`, \`clientes.cambiar_estado\` creados y asignación efectiva validada para admin. Gateway público mantiene bloqueada la introspección interna. | Mantener regresión de Security y repetir autorización real de Sales en la integración final con Catalog. |

\| 2. Esqueleto y DB | **\*\*HECHO (T214, infraestructura local)\*\*** | 11-11-2026: Laravel independiente, \`dulce_sales\`, migración y modelos locales. Compose válido; Sales y PostgreSQL \`healthy\`; migración aplicada en PostgreSQL; venta sintética sobrevivió reinicio de DB y luego se retiró. Pruebas de plantilla: 2/2, solo smoke. Ver evidencia T214 debajo. | La migración adicional de idempotencia del paso 5 también está aplicada; conservar volumen y migrar sin \`migrate:fresh\`. |

\| 3. Cliente REST | **\*\*HECHO (adaptador + integración real)\*\*** | 11-11-2026: 12 pruebas simuladas. 12-11-2026: T201–T202 Customer disponibles; contrato interno confirmado y probado desde Sales. Cliente activo validado, ocasional evita llamada y cliente inactivo produce \`409 CLIENTE_INACTIVO\`. Gateway Customer validado con \`401\` sin token, \`403\` sin permiso y \`200\` con admin autorizado. | Mantener contrato; completar T203 de Customer por separado. Para Sales, continuar con Catalog real antes de habilitar creación/edición completa. |

\| 4. Catálogo REST | **\*\*HECHO (adaptador aislado)\*\*** | 11-11-2026: adaptador HTTP y contrato propuesto, 14 pruebas Catalog simuladas; suite Sales 35/35 (71 aserciones). Catalog real aún no existe ni se ha acordado costo de personalización. Ver evidencia paso 4. | Confirmar contrato con responsable de Catalog (T204–T205), probar contenedores reales y fijar costo adicional antes de habilitar personalización. |

\| 5. API de ventas | **\*\*HECHO (T215 aislado; Customer real integrado)\*\*** | 11-11-2026: cinco rutas protegidas, cálculo decimal, snapshots, transacciones, edición/cancelación de borrador e idempotencia; suite 48/48 (138 aserciones) con Customer/Catalog simulados. 12-11-2026: Customer real conectado y validado. Catalog sigue simulado, por lo que no se declara creación/edición de venta integrada. | Integrar Catalog real T204–T205 y repetir creación/edición con dependencias reales. |

\| 6. Gateway | **\*\*HECHO (parte Sales de T217)\*\*** | Ruta explícita \`/api/ventas\` a \`sales-service\` validada previamente con Bearer. 12-11-2026 también se agregó \`/api/clientes\` → \`customer-service\`; configuración efectiva \`nginx -T\` confirmada y la ruta pública Customer devuelve \`401/403/200\` según autenticación/autorización. Headers internos de Customer se limpian en Gateway. | Conservar precedencia sobre fallback legado y repetir PS2-17 cuando React de Ventas pueda crear/editar con Catalog real. |

\| 7. React | **\*\*EN CURSO (T216 parcial)\*\*** | \`ventaService.js\` ya usa Bearer y \`VITE_API_URL\`; listado, detalle y anulación apuntan al nuevo Sales. \`VentasPage.jsx\` quedó en modo transitorio y creación/edición están deshabilitadas hasta disponer de Customer/Catalog reales; Customer ya está disponible, Catalog no. Permiso de menú/ruta actualizado a \`ventas.ver\`. | Mantener creación/edición deshabilitadas hasta integrar Catalog; después validar React → Gateway → Sales para alta/edición. |

\| 8. Integración y evidencia | **\*\*EN CURSO\*\*** | Ya existen pruebas unitarias/de contrato de Sales, autorización y comunicación real con Customer; Gateway Sales/Customer está publicado. Aún no pueden cerrarse PS2-14 a PS2-17 de forma integral porque Catalog real y el flujo React de creación/edición siguen pendientes. | Completar Catalog, ejecutar matriz PS2-14 a PS2-19 aplicable a Sales y actualizar Jira/Sprint Review. |



Por cada cambio de estado registrar: fecha, responsable, rama/commit, comandos ejecutados, resultado observado, pruebas aprobadas/fallidas, enlaces de evidencia o ruta de logs y limitaciones. Una marca \`HECHO\` parcial debe nombrar exactamente qué quedó probado.



**## 1. Fuentes y estado comprobado**



\- \`GUIA_GENERAL_DULCE_BOCADO.md\`: arquitectura de microservicios, HU10, contratos y decisiones de la sección 17. Es la referencia principal.

\- \`Docs/realizado/micro/cierresprint1y2.md\`: T214 (crear Sales/PostgreSQL, 4 h), T215 (venta, detalle y total, 3 h), T216 (React, 3 h), más la parte de Ventas de T217–T218 (Gateway, integración y pruebas). Las horas son las estimaciones oficiales, no una promesa de duración.

\- \`backup_antes_demo_20260924.sql\` y las migraciones/modelos/controlador de Ventas de \`backend/\`: referencia **\*\*histórica\*\*** para campos, restricciones y reglas. No copiar la arquitectura monolítica, sus FK entre dominios, su acceso directo a otras tablas ni sus estados sin contrastarlos con la guía nueva. El respaldo es anterior a algunas migraciones posteriores.

\- Estado del repositorio en el **\*\*baseline inicial del 11-11-2026\*\***, antes de T214: existía \`microservices/security-service\`, no existían aún \`customer-service\`, \`catalog-service\`, \`order-service\` ni \`sales-service\`; el Gateway conservaba una ruta general al backend legado. \`frontend/src/services/ventaService.js\` usaba cookies/CSRF, mientras Security S1 entregaba Bearer Token. Los avances posteriores están en el registro y evidencias de este archivo.



**### Paso 0 ejecutado: inventario verificable del repositorio**



\| Elemento | Evidencia concreta | Implicación para Sales |

\|---|---|---|

\| Rama y cambios | Rama \`devFabian\`. Al revisar había eliminaciones sin confirmar bajo \`Docs/realizado/\` y este roadmap sin seguimiento; no se modificaron esas eliminaciones. | Antes de crear rama, commit o merge, revisar \`git status\` y coordinar esos cambios existentes. |

\| Security | \`microservices/security-service/routes/api.php\` expone login, me, logout y gestión de seguridad. \`AuthController\` emite Personal Access Token y \`/api/auth/me\` devuelve permisos efectivos. No hay endpoint de introspección entre servicios en las rutas revisadas. | La autorización de Sales depende de implementar y probar ese contrato compartido. |

\| Customer/Catalog | No hay directorios \`microservices/customer-service\` ni \`microservices/catalog-service\` al momento de esta revisión. | Sus rutas/respuestas figuran en documentos, pero todavía no hay contrato implementado que se pueda consumir. |

\| Orders/Sales | No hay directorios \`microservices/order-service\` ni \`microservices/sales-service\`. | No confundir API monolítica existente con avance de T214–T215. |

\| Persistencia y contenedores | \`docker-compose.yml\` conserva DB/backend/frontend legados; \`docker-compose.sprint1.yml\` añade Security, su PostgreSQL y Gateway. | Crear una extensión Compose para Sprint 2; conservar DB y volumen propios de Sales. |

\| Gateway | \`gateway/nginx.conf\` enruta Security explícitamente y manda el resto de \`/api/\` al backend legado. | Antes de probar Sales integrado, agregar ruta \`/api/ventas\` con precedencia sobre el fallback. |

\| React | \`authService.js\` usa \`VITE_API_URL\` y Bearer; \`ventaService.js\`, \`VentasPage.jsx\` y \`VentaModal.jsx\` usan contrato legado, cookies/CSRF, \`/api/ventas/catalogos\` y flujos de pagos. \`vite.config.js\` envía \`/api\` al backend legado en desarrollo. | Unificar la API de Ventas con el Gateway. Revisar Vite proxy para que una ruta relativa no evite el Gateway; retirar de esta pantalla las acciones S3. |

\| Datos heredados | \`backup_antes_demo_20260924.sql\` contiene \`venta\`/\`detalle_venta\`; las migraciones posteriores agregan estado de pago y costo de producción. | Usar solo como referencia de reglas; diseñar esquema propio S2 sin FK externas ni estados de pago del monolito. |



**\*\*Comprobación de baseline reproducible (solo lectura):\*\***



\`\`\`powershell

git status --short --branch

rg --files microservices

rg -n "location /api/|location /api/ventas" gateway/nginx.conf

rg -n "auth|introspec|ventas" microservices/security-service/routes/api.php

rg -n "VITE_API_URL|csrf-cookie|Authorization" frontend/src/services/authService.js frontend/src/services/ventaService.js frontend/vite.config.js

\`\`\`



**\*\*Resultado del paso 0:\*\*** inventario del código completado; contratos de integración y reparto de archivos compartidos **\*\*pendientes de acordar\*\***. No hay evidencia de ejecución de contenedores ni de pruebas funcionales nuevas. El siguiente paso es cerrar los contratos de la sección 3 con los responsables de Customer, Catalog y Security; no iniciar T214 sobre supuestos de payload.



**\*\*Entorno de ejecución detectado:\*\*** \`docker --version\` funcionó (Docker 29.6.2); \`docker compose -f docker-compose.yml -f docker-compose.sprint1.yml config --quiet\` terminó sin errores. \`php -v\` y \`composer -V\` no se reconocieron en Windows, pero el \`Dockerfile\` de Security ya incluye PHP 8.4 y copia Composer 2 al contenedor. **\*\*Esto no bloquea la creación de \`sales-service\`\*\***: PHP, Composer, Artisan y PHPUnit se ejecutan dentro de su contenedor. No instalar herramientas en el host por defecto. La instrucción de arranque de \`microservices/security-service/AGENTS.md\` aplica cuando se modifique ese servicio; resolver su flujo local antes de editarlo, sin trasladar Laravel Boost como dependencia obligatoria de Sales.



**\*\*Ruta de trabajo independiente:\*\*** desarrollar el esqueleto, migraciones, modelos y pruebas locales de Sales en \`microservices/sales-service/\`, con PostgreSQL propio. Mientras Customer, Catalog y la introspección de Security no estén disponibles, usar dobles HTTP de contrato para pruebas de Sales; mantener las rutas de negocio protegidas y sin publicación funcional por Gateway. La integración real requiere reemplazar los dobles, ejecutar pruebas de comunicación y autorización, y solo entonces marcar los pasos 1, 3, 4, 5 y 6 como \`HECHO\`. Ningún doble de prueba debe activarse en producción.



**### Evidencia T214 — 11-11-2026**



\- **\*\*Creado:\*\*** \`microservices/sales-service/\` con Laravel 13, Dockerfile, migración \`2026_11_11_000001_create_ventas_tables.php\`, modelos \`Venta\`/\`DetalleVenta\` y README; \`docker-compose.sprint2.sales.yml\` con PostgreSQL y volumen exclusivos.

\- **\*\*Arranque:\*\*** \`docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml config --quiet\` salió 0. \`up -d --build sales-db sales-service\` terminó; ambos servicios quedaron \`healthy\`. No se levantaron ni modificaron los servicios legados para esta prueba.

\- **\*\*Migración PostgreSQL:\*\*** \`exec -T sales-service php artisan migrate --force\` creó \`migrations\`, \`venta\` y \`detalle_venta\`; \`migrate:status\` reportó \`[1] Ran\`. Se inspeccionaron las restricciones y la única FK de negocio es \`detalle_venta_id_venta_foreign\`, interna a Sales.

\- **\*\*Persistencia:\*\*** se insertó una venta sintética con detalle, se reinició solo \`sales-db\`, se verificó el mismo ID/total/snapshot (\`900000001\`, \`10.00\`, \`Presentacion de prueba\`) y se borró la venta de prueba. No se borró el volumen.

\- **\*\*Smoke:\*\*** \`exec -T sales-service php artisan test\` devolvió 2 pruebas de plantilla aprobadas. Estas **\*\*no\*\*** verifican reglas de negocio ni seguridad; esas pruebas se crearán en los pasos 1, 3–5 y 8.

\- **\*\*Incidencia resuelta:\*\*** el primer build falló por \`403\` de repositorios Debian por HTTP; el Dockerfile del nuevo servicio usa HTTPS y el segundo build terminó correctamente.

\- **\*\*Pendiente al cierre de T214:\*\*** no había endpoints de Ventas, introspección Security, llamadas a Customer/Catalog ni ruta pública Gateway. El paso 1 posterior añadió introspección; T214 terminado no equivale a HU10 terminada.



**### Evidencia paso 1 — Seguridad compartida, 11-11-2026**



\- **\*\*Contrato interno:\*\*** \`POST http\://security-service:8000/api/internal/introspect\`, disponible solo en la red Docker. Headers: \`Authorization: Bearer \<token_usuario>\`, \`X-Internal-Service-Key: \<credencial_servicio>\`, \`Accept: application/json\`. No enviar la credencial en el body ni en logs. Un \`200\` devuelve \`{"usuario":{"id_usuario":17,"activo":true,"permisos":["ventas.crear"]}}\`; \`401\` indica token ausente/inválido/expirado/revocado o usuario inactivo; \`403\` indica credencial de servicio ausente o incorrecta. La ausencia de credencial configurada también falla cerrado con \`403\`.

\- **\*\*Consumidor Sales:\*\*** \`AutorizarPermisoVentas\` envía ambos headers, usa timeout configurable de 3 s, valida forma de respuesta y el permiso pedido; coloca \`id_usuario_autenticado\` en atributos de la petición. Devuelve \`401\` sin token o con token rechazado, \`403\` sin permiso y \`503\` si Security no responde, responde mal o la clave interna no está configurada. No acepta \`id_usuario\` del navegador como identidad.

\- **\*\*Permisos:\*\*** \`ventas.ver\`, \`ventas.crear\`, \`ventas.modificar\`, \`ventas.anular\`. \`VentasPermisosSeeder\` crea relaciones con Administrador y Vendedor. Dos ejecuciones en la base local dieron cuatro permisos y ocho relaciones, sin duplicados. Las asignaciones \`usuario_rol_permiso\` de usuarios ya existentes no se crean por el seeder; deben revisarse/otorgarse explícitamente según el flujo de Seguridad.

\- **\*\*Pruebas:\*\*** en DB aislada \`dulce_security_test\`, \`php artisan test --filter=IntrospeccionTest\` pasó 6/6 (20 aserciones): credencial de servicio, token válido/revocado/expirado, usuario inactivo, rol/permiso inactivo y regresión login/me/logout. Suite completa Security: 8/8 (22 aserciones). En Sales, \`php artisan test --filter=AutorizarPermisoVentasTest\` pasó 7/7 (10 aserciones): identidad, \`401\`, \`403\`, \`503\` y fallo cerrado; suite completa Sales: 9/9. Los tests Sales usan respuestas HTTP simuladas para los casos de token válido y errores.

\- **\*\*Comunicación real:\*\*** petición desde \`sales-service\` a \`security-service\` con credencial local e identificador de token inválido respondió \`HTTP/1.1 401 Unauthorized\`. El primer intento dio \`500\` porque \`.env\` web seguía en SQLite; se alinearon los \`.env\` locales y ejemplos con PostgreSQL, se reiniciaron ambos procesos y el resultado fue \`401\`. Las migraciones de Security se aplicaron en su base local nueva; no se ejecutó \`migrate:fresh\`.

\- **\*\*Gateway y puertos:\*\*** \`nginx -t\` aprobó. Una instancia temporal de Nginx en \`127.0.0.1:8089\` respondió \`404\` a \`POST /api/internal/introspect\` y se detuvo después de la prueba. Security expone los puertos de diagnóstico \`8001\` y \`5433\` solo en loopback; se recreó únicamente \`security-db\` conservando su volumen. La credencial interna sigue siendo obligatoria.

\- **\*\*Actualización paso 5:\*\*** el middleware ya protege las cinco rutas de Ventas; falta una prueba extremo a extremo con usuario autorizado real y dependencias Customer/Catalog reales. No se declara HU10 terminada.



**### Evidencia paso 3 — Cliente REST aislado + integración real, 11–12-11-2026**



\- **\*\*Código Sales:\*\*** \`app/Services/Clientes/ClienteService.php\` y \`ClienteServiceException.php\`; \`config/services.php\` usa \`CUSTOMER_SERVICE_URL\`, \`CUSTOMER_SERVICE_KEY\` y \`CUSTOMER_TIMEOUT\`. Sales no tiene conexión SQL ni modelo hacia la base de Customer.

\- **\*\*Customer T201:\*\*** 12-11-2026: \`microservices/customer-service/\` funciona como Laravel independiente con PostgreSQL \`dulce_customers\`, volumen propio y migración \`cliente\`. \`customer-db\` y \`customer-service\` quedaron \`healthy\`; la migración está aplicada y la conexión comprobada contra la base/usuario propios.

\- **\*\*Customer T202 CRUD:\*\*** cinco rutas reales: \`GET/POST /api/clientes\`, \`GET/PUT /api/clientes/{id}\` y \`PATCH /api/clientes/{id}/estado\`. Se ejecutó alta, lectura, edición y cambio de estado sobre el cliente de prueba #1. El contrato de lista conserva \`{"clientes":[...]}\` y el detalle \`{"cliente":{...}}\` para compatibilidad con React.

\- **\*\*Contrato interno confirmado:\*\*** \`GET http\://customer-service:8000/api/clientes/{id}\` con \`X-Internal-Service-Key\`, \`X-Actor-User-Id\` y \`Accept: application/json\`. Sales no reenvía el Bearer del navegador. Customer valida la credencial de servicio y confía el actor solo cuando dicha credencial es correcta. La respuesta mínima usada por Sales mantiene \`id_cliente\` entero y \`estado\` booleano.

\- **\*\*Prueba real Sales → Customer:\*\*** desde \`sales-service\`, el cliente #1 inactivo respondió \`200\` con \`estado=false\` y el adaptador real \`validarParaVenta(1, null, 1)\` produjo \`409 CLIENTE_INACTIVO\`. Tras activarlo, el mismo adaptador devolvió \`{"id_cliente":1,"nombre_cliente_ocasional":null}\`. El flujo ocasional \`validarParaVenta(null, "Cliente Ocasional", 1)\` devolvió referencia ocasional sin llamar a Customer.

\- **\*\*Seguridad Customer:\*\*** middleware \`AutorizarPermisoClientes\` consulta la introspección de Security para peticiones de usuario. Se crearon \`clientes.ver\`, \`clientes.crear\`, \`clientes.modificar\` y \`clientes.cambiar_estado\`; se verificó que los permisos efectivos dependen de \`usuario_rol_permiso\` y se sincronizaron para el admin sin borrar asignaciones previas.

\- **\*\*Gateway Customer:\*\*** Nginx tiene \`upstream customer_service\` y rutas explícitas \`/api/clientes\` y \`/api/clientes/\`, con limpieza de \`X-Internal-Service-Key\` y \`X-Actor-User-Id\` en el borde público. \`nginx -t\` y \`nginx -T\` confirmaron la configuración efectiva. Pruebas: sin token → \`401 TOKEN_REQUERIDO\`; usuario autenticado sin permiso → \`403 PERMISO_DENEGADO\`; admin con \`clientes.ver\` → \`200\` y listado real.

\- **\*\*Pruebas aisladas previas:\*\*** \`ClienteServiceTest\` conserva 12 escenarios con \`Http::fake()\` dentro de la suite Sales. La integración real añade evidencia sobre activo/inactivo/ocasional; no sustituye todavía la matriz completa T218.

\- **\*\*Pendiente:\*\*** T203 (React de Clientes) sigue pendiente y no bloquea el contrato interno ya usado por Sales. Para cerrar creación/edición real de Ventas falta Catalog T204–T205; por tanto no marcar PS2-14/15/17 como integrales ni HU10 como terminada.



**### Evidencia paso 4 — Catalog REST aislado, 11-11-2026**



\- **\*\*Código:\*\*** \`app/Services/Catalogo/CatalogoService.php\` y \`CatalogoServiceException.php\` dentro de Sales; \`config/services.php\` y \`.env.example\` añaden \`CATALOGO_SERVICE_URL\`, \`CATALOGO_SERVICE_KEY\` y \`CATALOGO_TIMEOUT\`. No se agregó conexión MySQL en Sales ni dependencia Composer nueva.

\- **\*\*Contrato propuesto para confirmar con Catalog:\*\*** \`GET http\://catalog-service:8000/api/presentaciones/{id}\`. Headers internos \`X-Internal-Service-Key: \<clave_catalogo>\` y \`X-Actor-User-Id: \<id_usuario_validado_por_security>\`; \`Accept: application/json\`. Catalog debe autenticar al servicio llamante. Respuesta mínima esperada: \`{"presentacion":{"presentacion_id":15,"nombre":"Torta mediana","precio":"120.00","moneda":"BOB","disponible":true,"permite_personalizacion":true}}\`. \`presentacion_id\` identifica la **\*\*variante vendible de producto\*\***, no solo el tipo/tamaño de presentación del esquema monolítico. Este JSON y la credencial **\*\*aún no están confirmados por el servicio propietario\*\***.

\- **\*\*Validación local:\*\*** precio decimal no negativo como cadena exacta con dos decimales y máximo diez dígitos enteros; ID coincidente, nombre no vacío de hasta 200 caracteres, moneda BOB y booleanos estrictos. Sales conserva nombre y precio para el snapshot sin convertir a \`float\`. \`disponible\` significa disponibilidad comercial consolidada por Catalog; **\*\*no es stock\*\***. Una personalización solicitada cuando no está permitida se rechaza.

\- **\*\*Errores:\*\*** \`404 PRESENTACION_NO_ENCONTRADA\`; \`409 PRESENTACION_NO_DISPONIBLE\` o \`PERSONALIZACION_NO_PERMITIDA\`; \`422\` para IDs locales inválidos; \`503\` ante caída/timeout, \`401/403/5xx\` remotos, falta de credencial o JSON inválido. Timeout total 3 s y conexión 1 s, sin reintento automático. No se confirma ninguna venta con referencia no validada.

\- **\*\*Pruebas:\*\*** \`docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec -T sales-service php artisan test\` pasó 35/35 (71 aserciones), de las cuales 14 son casos de \`CatalogoServiceTest\` con \`Http::fake()\` y bloqueo de llamadas imprevistas. No hay llamada real a Catalog ni prueba de stock en este paso.

\- **\*\*Decisión pendiente:\*\*** acordar quién determina el **\*\*costo adicional de personalización\*\*** y si aplica por línea o por unidad. El monolito lo sumaba por línea, pero su formulario aceptaba un importe del navegador; Sales nuevo no debe confiar en ese importe. T215 rechaza \`detalle_personalizacion\` y todo importe enviado por el cliente hasta que exista contrato y prueba; no ofrece una venta personalizada a costo cero por accidente.

\- **\*\*Pendiente de integración:\*\*** T204–T205 deben publicar el contrato definitivo en MySQL y la credencial interna. Repetir éxito, \`404\`, no disponible y caída entre contenedores reales. T215 ya conecta el adaptador a creación/edición, con prueba aislada de no persistencia parcial; \`CATALOGO_SERVICE_KEY\` sin configurar provoca \`503\`.



**### Evidencia paso 5 — API de ventas T215 aislada, 11-11-2026**



\- **\*\*Código:\*\*** \`routes/api.php\`, \`VentaController\`, \`GuardarVentaRequest\`, \`AnularVentaRequest\` y \`VentaService\`. Todas las rutas llaman a \`AutorizarPermisoVentas\` antes de buscar la venta. \`GET /api/ventas\` acepta \`estado\` y \`per_page\` (máximo 100); \`GET /api/ventas/{id}\` incluye detalles. \`POST\` crea un \`BORRADOR\`; \`PUT\` reemplaza cliente, detalles y total solo si sigue en borrador; \`POST /{id}/anular\` exige motivo y registra actor/fecha. No hay cobro ni stock.

\- **\*\*Entrada y cálculo:\*\*** \`POST\` y \`PUT\` aceptan exactamente un cliente registrado (\`id_cliente\`) o un nombre ocasional, \`items\` de 1 a 50 con \`presentacion_id\` único y \`cantidad\` positiva (máximo 10000), más observaciones. La identidad viene de Security. Sales consulta Catalog por cada ítem, calcula con BCMath a dos decimales y rechaza totales fuera de \`decimal(12,2)\`. Nombre y precio se guardan en el detalle como snapshot y las lecturas no vuelven a consultar Catalog. Se rechazan precio, subtotal, total, actor, estado y personalización enviados por el cliente (\`422\`).

\- **\*\*Idempotencia y atomicidad:\*\*** cada escritura exige \`Idempotency-Key\` alfanumérica de 16–128 caracteres (admite \`\_\` y \`-\`). Nueva migración \`2026_11_11_000002_create_venta_idempotencia_table.php\`, clave única por operación y ruta, hash de entrada validada, actor, código y respuesta. Mismo actor/clave/payload recupera la respuesta; payload distinto o actor distinto → \`409\`. La operación y su registro se escriben en una transacción PostgreSQL; las consultas HTTP a Customer/Catalog se hacen antes, y un fallo remoto no deja venta ni clave parcial. La edición/cancelación bloquea la fila y vuelve a comprobar \`BORRADOR\`.

\- **\*\*Pruebas:\*\*** \`docker compose -f docker-compose.yml -f docker-compose.sprint1.yml -f docker-compose.sprint2.sales.yml exec -T -e DB_CONNECTION=pgsql -e DB_DATABASE=dulce_sales_test sales-service php artisan test --compact\` aprobó 48/48 (138 aserciones), incluidas 13 de \`VentaApiTest\`. Cubren alta de dos ítems, total exacto, actor de Security, listado/detalle, snapshot tras cambio simulado de precio, edición, cancelación auditada, repetición de clave, conflictos, \`401/403/422/503\`, cliente inactivo, caída de Customer/Catalog, exceso de importe y ausencia de escritura parcial. Los HTTP de usuario autorizado y de Customer/Catalog fueron simulados; la base de prueba fue PostgreSQL aislado. \`php artisan migrate:status\` confirmó la migración nueva aplicada en \`dulce_sales\` sin borrar datos. \`php artisan route:list --path=api/ventas\` mostró cinco rutas. \`git diff --check\` salió sin errores.

\- **\*\*Límites actualizados al 12-11-2026:\*\*** Customer ya existe como servicio real y su credencial interna está configurada en Sales; la validación activo/inactivo/ocasional fue comprobada entre contenedores. El Gateway de Sales está publicado y la UI de Ventas usa Bearer para lectura/consulta en modo transitorio. **Catalog todavía no existe como servicio real** y \`CATALOGO_SERVICE_KEY\` sigue pendiente, por lo que la creación/edición real de una venta continúa bloqueada/fail closed. No cerrar PS2-14/15/17 como pruebas integrales ni HU10 hasta completar Catalog y el flujo React correspondiente.



**### Evidencia adicional — Gateway y React parcial, 12-11-2026**



\- **\*\*Gateway Sales:\*\*** \`/api/ventas\` ya tiene ruta explícita hacia \`sales-service\` y no depende del fallback legado. La autenticación Bearer se preserva. La ruta interna de introspección continúa bloqueada públicamente.

\- **\*\*Gateway Customer:\*\*** durante la integración de T202 se añadió \`upstream customer_service\` y rutas explícitas para \`/api/clientes\`; se tuvo que reconstruir/recrear Gateway porque un simple \`restart\` mantenía la configuración empaquetada anterior. La configuración efectiva fue verificada con \`nginx -T\`.

\- **\*\*React Ventas:\*\*** \`frontend/src/services/ventaService.js\` usa \`VITE_API_URL\` y Bearer. El listado, detalle y anulación trabajan con el nuevo Sales; creación y edición permanecen deshabilitadas deliberadamente hasta que Customer y Catalog estén disponibles. Customer ya dejó de ser el bloqueo; Catalog sigue pendiente. El acceso de la UI usa \`ventas.ver\`.

\- **\*\*Estado T216/T217:\*\*** T217 parte Sales puede considerarse implementada a nivel de enrutamiento. T216 permanece **EN CURSO** porque todavía no existe una prueba completa de crear/editar desde React → Gateway → Sales con Catalog real.



**## 2. Límite funcional de Sales en Sprint 2**



Sales es dueño de \`venta\`, \`detalle_venta\`, total, estado, fecha, responsable y auditoría de cancelación. Registra una venta de mostrador con una o varias presentaciones, cliente registrado **\*\*o\*\*** ocasional, precio y nombre históricos, cantidades y personalización permitida. Consulta Customer y Catalog por REST. Expone listado, detalle, creación y edición restringida de borrador; contempla el endpoint de anulación/cancelación previsto en el acta con las restricciones del apartado 3.



Sales **\*\*no\*\*** posee pedidos, pagos, recetas, productos ni existencias. \`order-service\` mantiene pedidos, sus estados y entregas. \`payment-service\` e \`inventory-service\` se integrarán en Sprint 3. Por eso una venta creada en Sprint 2 es **\*\*venta base o borrador\*\***: no afirmar que se cobró, que descontó stock o que HU10 está cerrada integralmente. No reutilizar el antiguo flujo monolítico de pago/stock como si ya fuera una integración entre servicios.



**## 3. Decisiones de contrato que se cierran antes de codificar**



Registrar en Jira o en un contrato versionado del repositorio el valor elegido y sus pruebas. No dejar estos puntos implícitos:



1\. **\*\*Identidad y permisos.\*\*** Security S1 es dueño de tokens. Implementar la introspección interna descrita en la guía 17.1, protegida por credencial de servicio y no expuesta en el Gateway. Sales valida token, usuario activo y permiso por petición; sin token \`401\`, sin permiso \`403\`, Security caído \`503/504\`. Fijar nombres de permisos (por ejemplo \`ventas.ver\`, \`ventas.crear\`, \`ventas.modificar\`, \`ventas.anular\`) y asociarlos a roles. No instalar Sanctum en Sales como sustituto de la validación del token de Security ni copiar su tabla de tokens.

2\. **\*\*Customer y Catalog.\*\*** **Customer cerrado al 12-11-2026:** \`GET /api/clientes/{id}\` usa \`id_cliente\`, \`estado\` booleano, credencial interna, actor auditado y timeout configurado; activo/inactivo fueron probados entre contenedores. **Catalog sigue pendiente:** confirmar \`GET /api/presentaciones/{id}\`, ID canónico, disponibilidad, nombre, precio BOB, personalización/costo, credencial y errores. Un fallo de dependencia no crea una venta.

3\. **\*\*Estados.\*\*** La guía 17.3 propone \`BORRADOR → PENDIENTE_STOCK → CONFIRMADA\` y cancelación/anulación. En Sprint 2 solo operar con \`BORRADOR\` y \`CANCELADA\` (o equivalentes acordados); \`PENDIENTE_STOCK\`, \`CONFIRMADA\` y reversión quedan para Sprint 3. Si el equipo elige otros nombres, documentar equivalencia y mantener coherencia entre BD, API y UI.

4\. **\*\*Edición y anulación.\*\*** Permitir editar/cancelar solo borradores sin pago ni egreso; registrar motivo, usuario y fecha de cancelación. \`POST /api/ventas/{id}/anular\` debe rechazar con \`409\` cualquier estado cuya reversión todavía no esté implementada. No habilitar una anulación de venta confirmada antes de acordar compensación con Inventory y Payment.

5\. **\*\*Precio y personalización.\*\*** Sales toma el precio vigente desde Catalog, nunca acepta el precio final enviado por React. Fijar fórmula exacta del subtotal y si el costo de personalización aplica por unidad o por línea; la migración monolítica lo sumaba por línea. Usar decimal exacto, moneda BOB y redondeo documentado.

6\. **\*\*Idempotencia.\*\*** \`POST /api/ventas\` y acciones de escritura críticas reciben \`Idempotency-Key\`/\`operacion_id\` estable. Misma clave y payload devuelve la operación anterior; misma clave con payload distinto devuelve \`409\`. Definirlo antes de conectar doble clic/reintentos en la UI.



**### Hoja de acuerdos entre desarrolladores (completar antes del paso 1)**



La tabla diferencia lo **\*\*definido por la guía\*\*** de lo que aún es una **\*\*propuesta de contrato\*\***. Quien implementa el servicio propietario confirma el payload real con una prueba de contrato; Sales adapta su cliente a ese contrato. No dar por confirmado un campo porque existía en el monolito.



\| Contrato / dueño | Base ya definida | Campos y casos que se deben fijar | Responsable y evidencia de cierre |

\|---|---|---|---|

\| \`GET /api/clientes/{id}\` — Customer | **\*\*CERRADO 12-11-2026.\*\*** Sales consulta al cliente registrado por REST; cliente inactivo no entra en nuevas ventas y el ocasional se resuelve localmente. | \`id_cliente\` entero, \`estado\` booleano; \`200\` con objeto \`cliente\`; credencial \`X-Internal-Service-Key\`, actor \`X-Actor-User-Id\`, timeout 3 s. Sales interpreta inactivo como \`409 CLIENTE_INACTIVO\`. | Contrato probado entre \`sales-service\` y \`customer-service\` con cliente activo/inactivo y flujo ocasional; Gateway Customer validado \`401/403/200\`. |

\| \`GET /api/presentaciones/{id}\` — Catalog | Sales obtiene precio vigente, nombre y disponibilidad comercial; Catalog usa MySQL. | ID canónico (\`presentacion_id\` vs \`id_producto_presentacion\` legado), nombre mostrable, precio decimal como texto, moneda, producto/estado, personalización permitida y costo; \`404\` e inactivo. | Responsable de Catalog publica ejemplo JSON y prueba de presentación válida/inactiva. Sales registra versión/commit. |

\| Introspección interna — Security | Guía 17.1: validar Bearer, usuario activo y permisos; solo por red interna con credencial de servicio; no exponer por Gateway. | Método/ruta, header de credencial, formato de solicitud/respuesta, \`id_usuario\`, permisos, revocación, \`401/403\`, \`503/504\` y timeout. Ningún secreto en documentación. | Responsable de Security publica contrato y pruebas; responsable de Gateway verifica que la ruta interna no sea pública. |

\| \`GET/POST/PUT/POST anular /api/ventas\` — Sales | Rutas base en guía y acta; snapshots, total calculado en Sales, borrador S2. | JSON exacto, filtros/paginación, motivo, \`Idempotency-Key\`, moneda/redondeo, estados y errores; precio/costo de personalización por línea o unidad. | Responsable de Sales publica contrato, migración y pruebas; responsable de React confirma consumo por Gateway. |

\| Red Docker y Gateway — integración | React consume \`VITE_API_URL\` y Nginx enruta \`/api/ventas\`. | Nombres DNS de servicios, variables \`SECURITY_URL\`, \`CUSTOMER_URL\`, \`CATALOG_URL\` o equivalentes, puertos internos, healthchecks, timeout y precedencia de rutas. | Dueño de Compose/Gateway comparte \`docker compose config\`, \`/health\` y prueba de ruta Sales. |



**\*\*Acuerdo de responsabilidades:\*\*** el acta original asigna T214–T215 a Juan Pablo y T216–T218 a Fabián. La asignación real de este equipo debe registrarse en Jira antes de editar \`security-service\`, \`gateway/nginx.conf\`, Compose o \`frontend/src/App.jsx\`. Este documento no cambia por sí solo el responsable oficial.



**\*\*Formato mínimo para cada ejemplo de contrato:\*\*** método y ruta; headers (\`Authorization\` o credencial interna); JSON de solicitud; JSON de éxito; JSON de error; códigos HTTP; permiso; timeout; efecto de reintento; ID de correlación; commit del servicio propietario; prueba que lo verifica. Usar datos ficticios y omitir secretos.



**## 4. Modelo de datos propio**



Crear **\*\*migraciones nuevas dentro de\*\*** \`microservices/sales-service/database/migrations/\`. No mover ni editar las migraciones históricas del backend. Modelo mínimo propuesto para revisión:



\| Tabla | Datos mínimos | Regla |

\|---|---|---|

\| \`venta\` | \`id_venta\`, \`id_cliente\` nullable, \`nombre_cliente_ocasional\` nullable, \`id_usuario\`, \`fecha_venta\`, \`total decimal(12,2)\`, \`moneda\`, \`estado\`, \`observaciones\`, fechas, auditoría de cancelación, identificador idempotente | \`id_cliente\` e \`id_usuario\` son IDs externos **\*\*sin FK\*\***. Total no negativo. Cliente registrado y ocasional son mutuamente excluyentes. |

\| \`detalle_venta\` | \`id_detalle_venta\`, \`id_venta\`, \`presentacion_id\`, \`nombre_presentacion_snapshot\`, \`precio_unitario_snapshot decimal(12,2)\`, \`cantidad\`, personalización permitida/costo/detalle, \`subtotal decimal(12,2)\`, fechas | FK **\*\*solo\*\*** a \`venta\` local. \`presentacion_id\` es referencia externa sin FK. Cantidad positiva; subtotal calculado por Sales. |

\| Registro de idempotencia / transiciones | clave, hash de solicitud, resultado o referencia, fecha; historial de estado con responsable/motivo cuando aplique | Restricción única por tipo de operación y clave. Concretar estructura antes de migrar. |



El SQL monolítico contiene \`venta\` y \`detalle_venta\`, pero tiene FK hacia \`cliente\`, \`usuarios\` y \`producto_presentacion\`; eliminarlas en Sales. Sus estados \`REGISTRADA\`, \`PENDIENTE_PAGO\` y \`ANULADA\` tampoco son el flujo objetivo de la guía. El costo de producción del detalle corresponde a integración posterior; no introducirlo en la venta base sin contrato con Production.



**## 5. Pasos de ejecución y puntos de control**



Trabajar en una rama de tarea, sin mezclar cambios no relacionados. Completar y probar cada paso antes del siguiente. Coordinar el dueño de \`gateway/nginx.conf\`, Compose, permisos de Security y \`frontend/src/App.jsx\` para evitar ediciones simultáneas.



\| Paso | Archivos previstos (crear/modificar) | Trabajo | Comprobación para avanzar |

\|---|---|---|---|

\| **\*\*0. Baseline\*\*** | Sin cambios | Revisar \`git status\`, Compose, Gateway, Security, UI y API monolítica; registrar contratos faltantes y responsables de Customer/Catalog. | Dependencias y reparto visibles en Jira. No suponer que el legado equivale al nuevo servicio. |

\| **\*\*1. Seguridad compartida\*\*** | Modificar \`microservices/security-service/routes/api.php\`, controlador/middleware y seeder de permisos; crear pruebas | Introspección interna y permisos de Ventas según guía 17.1; no exponer la ruta interna por Nginx. | Token válido, revocado, inactivo, sin permiso y caída de Security probados. Mantener regresión S1. |

\| **\*\*2. Esqueleto y DB (T214)\*\*** | Crear \`microservices/sales-service/\` (Laravel), \`Dockerfile\`, \`.env.example\`, migraciones, modelos, pruebas; modificar Compose de Sprint 2 | Servicio separado y \`dulce_sales\` PostgreSQL con volumen propio. Puerto interno por red Docker; decidir si hay puerto diagnóstico local. Sin FK externas. | Contenedor inicia, \`/up\` responde, migraciones aplican y datos sobreviven reinicio. No usar \`migrate:fresh\` sobre datos existentes. |

\| **\*\*3. Clientes REST\*\*** | Crear cliente HTTP/configuración dentro de Sales y pruebas | Consultar Customer si hay cliente registrado; rechazar inexistente/inactivo. Cliente ocasional no llama Customer. | Éxito, \`404\`, inactivo y \`503/504\` sin venta parcial. |

\| **\*\*4. Catálogo REST\*\*** | Crear cliente HTTP/configuración dentro de Sales y pruebas | Consultar cada presentación, validar disponibilidad comercial y personalización, capturar nombre/precio vigente. No consultar stock físico. | Presentación inexistente/inactiva/precio inválido/dependencia caída se rechazan. |

\| **\*\*5. API de ventas (T215)\*\*** | Crear Form Requests, lógica de dominio, controlador, rutas y pruebas en Sales | \`GET/POST /api/ventas\`, \`GET/PUT /api/ventas/{id}\`, \`POST /api/ventas/{id}/anular\`; cálculo exacto, snapshot, transacción local, estados e idempotencia. | \`201\` venta válida; \`422\` entrada inválida; \`409\` estado/clave conflictiva; \`401/403\`; precio histórico estable tras cambio de Catalog. |

\| **\*\*6. Gateway (parte T217)\*\*** | Modificar \`gateway/nginx.conf\` y Compose S2 | Enrutar \`/api/ventas\` a Sales; preservar \`Authorization\`, método, cuerpo y query. No dejar que ventas caiga en el backend legado. | Petición a través de \`localhost:8080\`; Security interno no accesible desde ruta pública. |

\| **\*\*7. React (T216)\*\*** | Modificar \`frontend/src/services/ventaService.js\`, \`VentasPage.jsx\`, \`VentaModal.jsx\` y solo rutas/menú necesarios | Usar \`VITE_API_URL\`, Bearer Token y contratos nuevos; mostrar borrador y errores claros. Ocultar/deshabilitar cobro, stock, confirmación y anulación no implementados. Reutilizar UI válida del legado sin copiar reglas al navegador. | Crear, listar, ver, editar y cancelar borrador por React → Gateway → Sales; sin puertos internos ni CSRF legado para esta API. |

\| **\*\*8. Integración y evidencia (parte T218)\*\*** | Crear/actualizar documentación de contrato y evidencia bajo \`Docs/realizado/micro/\` al completar | Ejecutar matriz de pruebas, revisar logs, persistencia y regresión de Seguridad. Actualizar Jira y preparar demo. | PS2-14, 15, 16, 17, 18 y 19 aprobadas para Sales; demás PS2 corresponden al incremento completo del Sprint. |



Customer ya está disponible e integrado. Mientras **Catalog** no esté listo, mantener sus pruebas con dobles controlados y **\*\*no\*\*** declarar el paso 5 completamente integrado ni conectar una venta real al backend monolítico como solución permanente.



**## 6. Contrato mínimo de Sales para acordar**



\| Método y ruta | Acción | Respuesta/errores principales |

\|---|---|---|

\| \`GET /api/ventas\` | Listado filtrable/paginado de ventas propias del servicio | \`200\`, \`401\`, \`403\`, \`503/504\` por Security |

\| \`POST /api/ventas\` | Crear borrador con cliente opcional e ítems | \`201\`; \`422\` datos; \`404/409\` referencia o estado externo según contrato; \`503/504\` dependencia |

\| \`GET /api/ventas/{id}\` | Venta con detalle y snapshots | \`200\`, \`404\`, \`401\`, \`403\` |

\| \`PUT /api/ventas/{id}\` | Editar solo borrador y recalcular usando Catalog | \`200\`, \`409\` estado, \`422\` entrada, \`503/504\` dependencia |

\| \`POST /api/ventas/{id}/anular\` | Cancelar solo borrador con motivo y auditoría | \`200\`, \`409\` estado no reversible o repetición conflictiva |



Ejemplo orientativo para \`POST\` (los nombres y respuesta exactos se fijan en el paso 0):



\`\`\`json

{

  "id_cliente": 42,

  "items": [

    {"presentacion_id": 15, "cantidad": 2, "detalle_personalizacion": "Mensaje breve"}

  ],

  "observaciones": "Retiro en mostrador"

}

\`\`\`



No enviar \`precio_unitario\`, \`subtotal\`, \`total\` ni \`id_usuario\` como autoridad desde React. Sales obtiene identidad de Security y datos comerciales de Catalog. Documentar formato de error, moneda, precisión, timeout, credenciales internas, paginación y filtros antes de implementar consumidores.



**## 7. Pruebas de aceptación de Sales**



\- **\*\*PS2-14:\*\*** crear venta base con dos ítems; total y subtotales coinciden con Catalog y quedan persistidos.

\- **\*\*PS2-15:\*\*** cambiar precio/nombre en Catalog después de crear; el detalle histórico de Sales permanece igual.

\- **\*\*PS2-16:\*\*** Customer, Catalog o Security indisponible: respuesta controlada, sin venta incompleta ni éxito falso.

\- **\*\*PS2-17:\*\*** React usa Gateway; \`/api/ventas\` no llega al backend legado.

\- **\*\*PS2-18:\*\*** usuario autenticado sin permiso obtiene \`403\`; sin token \`401\`.

\- **\*\*PS2-19:\*\*** reiniciar PostgreSQL/Sales sin perder ventas.

\- Adicionales necesarias: cantidad cero, ítem repetido, cliente inactivo, presentación inválida, personalización no permitida, edición de cancelada, cancelación repetida, idempotencia con payload igual/distinto, token revocado y usuario inactivo.

\- El equipo del Sprint completo ejecuta además PS2-01 a PS2-13 y PS2-20 para Customer, Catalog, Orders y MySQL. No reportar esas pruebas como aprobadas por el trabajo de Sales.



**### Matriz obligatoria de seguridad, comunicación y funcionamiento**



Guardar para cada fila: comando/petición reproducible, código HTTP, JSON esperado/observado, estado de BD antes/después y resultado \`APROBADO\` o \`FALLÓ\`. Usar datos ficticios. No guardar tokens, credenciales ni información personal real en capturas o logs.



\| Área | Escenario | Resultado exigido |

\|---|---|---|

\| Autenticación | Sin Bearer; token malformado; token revocado tras logout; usuario desactivado | \`401\`, sin lectura/escritura de venta; la siguiente petición refleja revocación, sin caché positiva. |

\| Autorización | Usuario válido sin permiso de lectura, creación, edición o cancelación | \`403\` en cada endpoint protegido. Ocultar botón en React no sustituye esta prueba. |

\| Límite interno | Llamada directa a introspección sin credencial de servicio o con credencial inválida; intento de llegar a esa ruta por Gateway | Denegada; la ruta interna no es pública. Comparar credencial sin filtrarla en logs. |

\| Identidad | Cliente envía \`id_usuario\` arbitrario en JSON o encabezado de identidad | Sales ignora/rechaza ese dato y audita únicamente el ID devuelto por Security. |

\| Dependencia Security | Servicio caído o timeout | \`503/504\` controlado y fail closed; no se crea ni modifica la venta. |

\| Dependencia Customer | Cliente inexistente/inactivo; \`404\`; caída o timeout | Activo/inactivo y ocasional ya tienen evidencia real/parcial entre contenedores; mantener además pruebas de inexistente/caída/timeout y verificar que no haya registro parcial en la matriz final. |

\| Dependencia Catalog | Presentación inexistente/inactiva; precio inválido; caída o timeout | \`404/409/422/503/504\` según contrato acordado; ningún registro parcial. |

\| Límite de datos | Inspeccionar migraciones, configuración y consultas de Sales | Solo DB \`dulce_sales\`; ninguna FK, conexión SQL ni modelo Eloquent hacia bases de Customer, Catalog o Security. |

\| Gateway | React llama únicamente \`VITE_API_URL\`; inspeccionar DevTools/red y probar \`/api/ventas\` | Header Authorization, método y cuerpo llegan a Sales; ruta no cae en backend legado ni usa puerto interno. |

\| Validación | Cantidad cero/negativa, lista vacía, ítem repetido, precio/total falsificado, personalización prohibida | \`422\` o error contractual; total y snapshot calculados por Sales con respuesta vigente de Catalog. |

\| Históricos | Crear venta y modificar precio/nombre en Catalog | Detalle y total históricos inmutables; lectura no depende del precio actual. |

\| Reintento/concurrencia | Repetir \`POST\` con misma clave y payload; luego misma clave con payload distinto; dos solicitudes simultáneas | Una sola venta para mismo intento; resultado previo en repetición válida; \`409\` para payload diferente. |

\| Estado | Editar/cancelar borrador; repetir cancelación; intentar editar venta cancelada/confirmada | Solo transición permitida; auditoría con usuario/fecha/motivo; \`409\` en transición inválida. |

\| Persistencia | Reiniciar contenedor Sales y PostgreSQL con volumen | Ventas y snapshots conservados. No usar borrado de volumen como prueba. |

\| Regresión | Login, logout, \`/api/auth/me\` y permisos existentes tras cambiar Security/Gateway | Sprint 1 sigue funcionando; fallos nuevos se corrigen antes de marcar paso 1/6 \`HECHO\`. |



**\*\*Prueba de comunicación por cada dependencia:\*\*** documentar URL interna y DNS Docker, método, headers, timeout, petición sintética, respuesta válida e inválida, comportamiento ante \`5xx\` y correlación de logs. Las consultas de lectura pueden tener reintentos acotados; nunca reintentar una escritura sin clave idempotente. Comprobar que un timeout no se reporta como éxito ni como inexistencia de recurso.



**## 8. Definition of Done y entrega al otro desarrollador**



Sales se considera **\*\*base de Sprint 2 terminada\*\*** cuando: contrato y permisos documentados; DB propia y migraciones aplicadas; API y UI funcionan por Gateway; pruebas positivas, negativas, autorización, dependencia caída, idempotencia y persistencia pasan; no hay SQL ni FK a otros servicios; snapshots y totales se calculan en Sales; Jira T214–T216 y evidencia están actualizados. La HU10 completa permanece abierta hasta integrar Inventory en Sprint 3.



En cada entrega parcial, compartir: rama/commit, contratos cambiados, variables de entorno **\*\*sin secretos\*\***, comandos de arranque, migraciones ejecutadas, pruebas y resultado, rutas disponibles, limitaciones del Sprint 2 y tarea siguiente. Hacer una revisión conjunta de Gateway/Compose/Security antes de fusionar para evitar conflictos con el trabajo de Customer, Catalog y Orders.
