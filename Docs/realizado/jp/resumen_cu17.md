# CU17 – Registrar Consumo, Costo y Desperdicio

## Estado
**Completado y probado desde frontend.**

## Objetivo
Implementar el registro del consumo real de materias primas durante una producción, permitiendo controlar:

- Cantidad teórica requerida según la receta.
- Cantidad realmente consumida.
- Cantidad desperdiciada.
- Costo unitario de cada materia prima.
- Costo total utilizado en producción.
- Unidades producidas en buenas condiciones.
- Descuento automático de materias primas.
- Incremento del producto terminado en el almacén de Producción.

---

## Backend implementado

Se creó la lógica correspondiente al caso de uso CU17 mediante un controlador específico para el registro del consumo de producción.

### Archivos principales

- `backend/app/Models/ConsumoProduccion.php`
- `backend/app/Http/Requests/Produccion/RegistrarConsumoProduccionRequest.php`
- `backend/app/Http/Controllers/Api/Produccion/ConsumoProduccionController.php`

### Endpoints

Se implementaron los siguientes endpoints:

```text
GET  /api/produccion/{id}/consumo
POST /api/produccion/{id}/consumo