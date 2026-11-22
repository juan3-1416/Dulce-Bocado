# Guía de integración de Enterprise Architect con Dulce Bocado

**Fecha:** 2026-11-22  
**Estado:** propuesta técnica para preparar la conexión; todavía no existe una conexión MCP configurada ni se ha modificado un modelo de Enterprise Architect desde este repositorio.  
**Objetivo:** crear y mantener diagramas **editables dentro de Enterprise Architect (EA)** a partir de la arquitectura y los contratos verificados de Dulce Bocado, con trazabilidad hacia código y documentación. La exportación PNG/PDF es una salida adicional, no el modelo fuente.

## 1. Decisión técnica

Para una instalación local de EA en Windows, usar primero su **Automation Interface (COM)** desde PowerShell. Un script abre un proyecto de EA, localiza un paquete propio del proyecto, crea o actualiza elementos, relaciones y diagramas, y cierra el repositorio. Cuando ese flujo funcione y sus resultados sean revisables, envolverlo en un **servidor MCP local** con herramientas limitadas. El MCP no sustituye la API de EA: traduce solicitudes estructuradas del asistente a operaciones COM.

Ruta alternativa para equipos con repositorio centralizado: **Pro Cloud Server + OSLC**. Requiere esa instalación, licencia/configuración de funciones Pro, modelo publicado, autenticación y conexión HTTPS. No se debe asumir que OSLC está disponible por el solo hecho de tener EA de escritorio. La primera implementación recomendada aquí es COM local, porque el usuario ya tiene EA instalado en Windows.

```text
Codex / cliente MCP
        │ solicitud estructurada y validada
        ▼
Servidor MCP local (Windows, misma sesión del usuario)
        │ invoca módulo PowerShell/.NET
        ▼
EA Automation Interface (COM)
        │ abre proyecto y modifica objetos
        ▼
Modelo .qea/.eapx/.eap o repositorio compartido
        └── diagramas editables + exportaciones opcionales
```

## 2. Información que falta antes de conectar

| Dato | Para qué se necesita | Cómo obtenerlo |
| --- | --- | --- |
| Versión, edición y arquitectura de EA (32/64 bits) | Confirmar compatibilidad de COM y ejecución de PowerShell/.NET | Pantalla **Help/About** de EA e instalación en Windows |
| Ruta absoluta del proyecto `.qea`, `.eapx` o `.eap`; o tipo/cadena de conexión del repositorio | Seleccionar el modelo que se va a editar | **Open Project** en EA; no copiar credenciales al repositorio |
| Paquete raíz de destino y propietario del modelo | Evitar mezclar diagramas generados con modelos manuales | Navegador de proyectos de EA; propuesto: `Dulce Bocado > Arquitectura > Generado` |
| Permisos de escritura y política de bloqueo/versionado de paquetes | Evitar sobrescribir trabajo simultáneo | Administrador del repositorio o configuración de EA |
| Notación deseada por diagrama | Elegir tipo correcto (`Component`, `Sequence`, `Deployment`, BPMN, etc.) | Acordar con el equipo y el documento Scrum |
| Fuentes de verdad y alcance por sprint | Evitar dibujar funciones planificadas como implementadas | `Docs/sprint4.md`, `Docs/CONTEXTO_AVANCE_SPRINT_4.md`, código, Gateway y roadmap de Sprint 5 |
| Política de publicación | Definir si solo se guarda en EA o además se exporta a `Docs/diagramas/` | Decisión del equipo y formato requerido por la documentación oficial |

No se detectó un archivo de proyecto EA versionado en este repositorio durante la revisión. La ruta y los permisos deben confirmarse en el equipo donde está instalado. Un proyecto compartido puede requerir una cadena de conexión en lugar de una ruta local.

## 3. Preparación local y prueba mínima

1. Abrir EA manualmente y crear **una copia de prueba** del modelo; trabajar primero en ella. Registrar su ruta absoluta y confirmar que se puede abrir y guardar.
2. Comprobar que COM está registrado desde PowerShell de Windows: `New-Object -ComObject EA.Repository`. Si falla, verificar instalación de EA y si se está ejecutando la arquitectura de PowerShell adecuada. La terminal de esta sesión no confirmó la ubicación de EA, por lo que no se ha ejecutado esta prueba.
3. Abrir el proyecto con `Repository.OpenFile(ruta)`. No usar rutas construidas a partir de entrada libre sin validación ni compartir credenciales en scripts.
4. Crear un paquete y un diagrama de prueba con dos componentes; guardar, cerrar, reabrir en EA y verificar que siguen siendo objetos editables. Solo después conectar los diagramas reales.
5. Registrar la versión de EA, ruta de modelo de prueba, comando ejecutado, GUID/ID del diagrama y resultado. No ejecutar en el modelo definitivo hasta revisar visualmente la primera salida.

Ejemplo de **prueba manual** para PowerShell. Reemplazar la ruta por una copia propia; el ejemplo crea objetos nuevos y todavía no es idempotente:

```powershell
$modeloPrueba = 'C:\ruta\copia-dulce-bocado.qea'
$repositorio = New-Object -ComObject EA.Repository

try {
    if (-not $repositorio.OpenFile($modeloPrueba)) {
        throw "No se pudo abrir el modelo: $modeloPrueba"
    }

    $raiz = $repositorio.Models.GetAt(0)
    $paquete = $raiz.Packages.AddNew('Prueba de automatización', '')
    if (-not $paquete.Update()) { throw $paquete.GetLastError() }

    $diagrama = $paquete.Diagrams.AddNew('Servicios de prueba', 'Component')
    if (-not $diagrama.Update()) { throw $diagrama.GetLastError() }

    $sales = $paquete.Elements.AddNew('Sales Service', 'Component')
    if (-not $sales.Update()) { throw $sales.GetLastError() }
    $inventory = $paquete.Elements.AddNew('Inventory Service', 'Component')
    if (-not $inventory.Update()) { throw $inventory.GetLastError() }

    $a = $diagrama.DiagramObjects.AddNew('l=50;r=230;t=50;b=130;', '')
    $a.ElementID = $sales.ElementID
    if (-not $a.Update()) { throw $a.GetLastError() }
    $b = $diagrama.DiagramObjects.AddNew('l=340;r=520;t=50;b=130;', '')
    $b.ElementID = $inventory.ElementID
    if (-not $b.Update()) { throw $b.GetLastError() }

    $dependencia = $sales.Connectors.AddNew('descuento de mostrador', 'Dependency')
    $dependencia.SupplierID = $inventory.ElementID
    if (-not $dependencia.Update()) { throw $dependencia.GetLastError() }

    "Creado: $($diagrama.Name), ID $($diagrama.DiagramID)"
}
finally {
    $repositorio.CloseFile()
    $repositorio.Exit()
}
```

La implementación definitiva debe **buscar por GUID o clave externa estable** antes de crear, actualizar solo el paquete administrado, conservar cambios manuales fuera de él y evitar duplicados al repetir la generación. Nunca ejecutar simultáneamente dos escrituras automatizadas sobre el mismo paquete. El script debe validar `Update()` y capturar errores, registrar qué elementos cambió y permitir una ejecución de previsualización que no escriba.

## 4. Servidor MCP propuesto

El servidor debe correr **en Windows con acceso a EA y al modelo**, por ejemplo como proceso local iniciado por el cliente MCP. Puede implementarse en .NET o Node.js con un proceso PowerShell hijo; también es viable Python con COM si está instalado y configurado. El lenguaje es secundario: el contrato y el aislamiento de escritura son lo importante. No se ha verificado en esta guía un servidor MCP oficial de Sparx para EA; se propone un adaptador propio sobre su interfaz documentada.

Herramientas mínimas del servidor:

| Herramienta | Entrada | Resultado |
| --- | --- | --- |
| `ea_estado` | Ninguna | Versión disponible, proyecto conectado y modo solo lectura/escritura, sin secretos |
| `ea_listar_paquetes` | ID/GUID de padre opcional | GUID, nombre y ruta lógica de paquetes |
| `ea_listar_diagramas` | GUID de paquete | GUID, nombre, tipo y fecha de actualización |
| `ea_previsualizar_cambios` | Especificación JSON del diagrama | Objetos a crear/actualizar, conflictos y avisos, sin escribir |
| `ea_aplicar_diagrama` | Especificación validada y paquete permitido | GUID del diagrama, conteos y errores; escritura dentro del paquete autorizado |
| `ea_exportar_diagrama` | GUID y formato/ruta permitidos | Archivo generado para revisión/documentación |

El servidor debe aceptar **datos**, no comandos PowerShell arbitrarios. La configuración fija la ruta/cadena del modelo y una lista de paquetes permitidos; no permite sobrescribir cualquier paquete por nombre. Limitar tipos UML/MDG, longitud de notas, número de objetos y rutas de exportación. No exponer el servidor fuera de localhost sin autenticación y TLS. Registrar operaciones y errores sin credenciales ni tokens. Si el modelo está abierto por otra persona o bloqueado, informar el conflicto en lugar de forzar escritura.

Ejemplo de solicitud estructurada para el primer diagrama:

```json
{
  "package_guid": "GUID_DEL_PAQUETE_AUTORIZADO",
  "external_key": "dulce-bocado:s4:componentes:v1",
  "name": "Sprint 4 - Servicios y pagos",
  "type": "Component",
  "elements": [
    {"key": "gateway", "name": "API Gateway", "type": "Component"},
    {"key": "sales", "name": "Sales Service", "type": "Component"},
    {"key": "inventory", "name": "Inventory Service", "type": "Component"},
    {"key": "payment", "name": "Payment Service", "type": "Component"}
  ],
  "connectors": [
    {"from": "sales", "to": "inventory", "type": "Dependency", "label": "descuento interno"},
    {"from": "payment", "to": "sales", "type": "Dependency", "label": "consulta total y estado"}
  ]
}
```

`external_key` es un identificador de sincronización propuesto para el adaptador; EA no lo aporta automáticamente. Puede persistirse como Tagged Value o en un manifiesto controlado, sujeto a validación de la API y del flujo de versionado elegido.

## 5. Diagramas prioritarios para Dulce Bocado

| Orden | Diagrama editable en EA | Fuente y criterio de revisión |
| --- | --- | --- |
| 1 | Componentes y despliegue: React, Gateway, Security, Customer, Catalog, Orders, Sales, Production, Inventory y Payment con bases propias | Código de `microservices/`, `gateway/nginx.conf`, Docker Compose y guía general; marcar `report-service` como propuesto/en desarrollo según su evidencia real |
| 2 | Secuencia de confirmación de venta: Sales → Inventory, stock, UUID, reintentos y errores | `Docs/SPRINT_4_CONFIRMACION_VENTAS.md`, código y pruebas PS4-03 a PS4-05 |
| 3 | Secuencia de cobro: efectivo/QR, Payment → Sales/Orders, Security, callback de Libélula y recibo | `Docs/sprint4.md`, contratos y código de Payment; distinguir flujo externo validado de flujo diseñado |
| 4 | Modelo de datos por servicio: entidades propias y referencias REST | Migraciones de cada servicio; no dibujar claves foráneas entre bases independientes |
| 5 | Dashboard y reportes del Sprint 5 | `Docs/ROADMAP_SPRINT_5_REPORTES_DASHBOARD.md`; diagramas propuestos hasta validar implementación y APIs |

El monolito es una referencia funcional. En los diagramas del estado actual, mostrar sus rutas de dashboard/reportes como **legadas**; no representarlas como consultas ya migradas al `report-service`. Cada diagrama debe incluir nombre, versión, sprint, commit fuente, fecha y estado (`implementado`, `en revisión` o `propuesto`).

## 6. Plan de implementación y criterios de aceptación

1. **Descubrimiento:** obtener los datos de la sección 2, probar COM y decidir si el modelo es archivo local o repositorio compartido.
2. **Prototipo aislado:** generar y reabrir un diagrama editable en una copia del modelo. Comprobar posiciones, conectores y texto legible.
3. **Generador repetible:** convertir la prueba en módulo parametrizado con búsqueda por GUID/clave estable, previsualización, control de errores y respaldo antes de escrituras.
4. **Adaptador MCP:** publicar las herramientas de lectura y luego las de escritura con restricciones de paquete. Probar entradas inválidas y ausencia de permisos.
5. **Diagramas del proyecto:** generar en orden los diagramas de la sección 5, revisarlos visualmente en EA y cotejarlos con rutas, estados y bases reales.
6. **Documentación oficial:** exportar imágenes/PDF si el formato Scrum las necesita; registrar GUID de EA, archivo exportado, commit fuente y revisor. Mantener el modelo EA como artefacto editable y acordar su mecanismo de respaldo/versionado.

Se considera lista la integración cuando el mismo contrato ejecutado dos veces no duplica objetos, el diagrama se abre y edita en EA, los conectores apuntan a elementos correctos, un error de permisos no altera el proyecto y el equipo puede reproducir la salida desde una copia del modelo. La revisión visual de los diagramas es necesaria antes de incorporarlos a la documentación oficial.

## 7. Referencias de la API de Sparx Systems

- [Automation Interface y Object Model](https://www.sparxsystems.com/enterprise_architect_user_guide/17.2/add-ins___scripting/theautomationinterface.html).
- [Conexión desde un cliente externo](https://www.sparxsystems.com/enterprise_architect_user_guide/17.2/add-ins___scripting/automation_connect_setup.html).
- [Parámetros de `AddNew`](https://www.sparxsystems.com/enterprise_architect_user_guide/17.2/add-ins___scripting/the_addnew_function.html).
- [Creación de conectores](https://www.sparxsystems.com/enterprise_architect_user_guide/17.2/add-ins___scripting/addaconnector.html).
- [Cierre de repositorio desde automatización](https://www.sparxsystems.com/enterprise_architect_user_guide/17.2/add-ins___scripting/codesamples.html).
- [OSLC de Pro Cloud Server](https://www.sparxsystems.com/enterprise_architect_user_guide/17.2/the_model_repository/oslc_serv_provid.html).
