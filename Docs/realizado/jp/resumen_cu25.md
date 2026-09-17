# Resumen CU25: Generar y Enviar Reportes

## Objetivo completado

Se implementó satisfactoriamente el **CU25 – Generar y Enviar Reportes**, permitiendo que el usuario autorizado genere reportes parametrizados de las principales operaciones del sistema **Dulce Bocado**, visualice sus resultados, descargue los documentos en formato PDF y pueda enviarlos a una o varias direcciones de correo electrónico.

El módulo fue integrado respetando la arquitectura existente del proyecto: **React + Vite** en el frontend, **Laravel REST API** en el backend, **PostgreSQL** como base de datos, **Laravel Sanctum** para autenticación y el sistema de permisos RBAC utilizado por la aplicación.

## Funcionalidades implementadas

Se desarrollaron tres tipos de reportes principales:

- **Reporte de Ventas:** permite consultar ventas por rango de fechas, estado, cliente y vendedor. Presenta información como cantidad de ventas, ventas válidas, anuladas y monto total.
- **Reporte de Pedidos:** permite filtrar por fechas de pedido, fechas de entrega, estado, cliente y responsable. Incluye totales, montos pagados y saldos pendientes.
- **Reporte de Inventario:** permite consultar existencias por almacén, tipo de artículo y condición de stock crítico, diferenciando materias primas y productos terminados.
- Los filtros seleccionados se aplican de forma consistente a la consulta en pantalla, al archivo PDF generado y al documento enviado por correo.
- Los resultados son mostrados mediante tablas y tarjetas de resumen dentro de la interfaz React.
- Se incorporó la generación de archivos PDF mediante **DomPDF**, utilizando una plantilla propia de Dulce Bocado.
- Los PDF pueden descargarse directamente desde la interfaz.
- Se implementó el envío del reporte PDF a **uno o varios destinatarios**.
- El correo se envía mediante el sistema de correo de Laravel utilizando un servidor **SMTP de Gmail**.
- Antes de enviar el correo, el sistema guarda una copia del PDF generado. De esta manera, si ocurre un error con el servidor de correo, el reporte no se pierde.
- La interfaz informa claramente si el envío fue exitoso o si el PDF fue generado pero el correo no pudo ser enviado.

## Seguridad y control de acceso

Se creó el permiso:

```text
reportes.generar