# CU16 — Fase 5: Frontend — Formulario de Creación y Modal de Completar

> **Prerequisito:** Fases 1, 2, 3 y 4 completadas y verificadas ✅
> **Objetivo:** Implementar los formularios interactivos para la creación y gestión del estado de las órdenes de producción.

---

## Archivos a crear/modificar

### [NEW] `frontend/src/pages/produccion/ProduccionForm.jsx`

#### Estructura y Lógica

- **Selector de presentación**: Dropdown con búsqueda (usar componente existente si hay uno en el proyecto).
- **Campo de cantidad**: Input numérico (entero, mínimo 1).
- **Preview dinámico de insumos**:
  - Al seleccionar una presentación o cambiar la cantidad, calcular los insumos requeridos.
  - Se puede hacer un request `GET /api/produccion/preview` o (recomendado si ya se cargan las recetas en el frontend) calcularlo localmente con los datos de la receta asociada a la presentación seleccionada y el stock actual.
  - Mostrar una tabla con los insumos:
    | Materia Prima | Requerido | Stock actual | Estado |
    |---|---|---|---|
    | Harina | 500g | 1200g | ✅ |
    | Mantequilla | 200g | 150g | ❌ Faltante |
- **Validaciones**:
  - Si la presentación seleccionada no tiene receta → mostrar alerta visual clara y deshabilitar el botón "Crear Orden".
  - Si algún insumo es insuficiente (Stock actual < Requerido) → deshabilitar el botón "Crear Orden" y mostrar un indicador claro en la tabla (ej. fila en rojo).
- **Envío**: Al enviar, llamar a `crearProduccion({ id_producto_presentacion, cantidad, observaciones })`. Tras éxito, redirigir a `/produccion`.

---

### [NEW] `frontend/src/pages/produccion/CompletarProduccionModal.jsx`

#### Estructura y Lógica

- Modal invocado desde `ProduccionList` (o desde el detalle de una orden). Recibe el `id` de la orden y la `cantidad_esperada`.
- **Campo `unidades_producidas`**: Input numérico (entero, mínimo 1, máximo = `cantidad_esperada` de la orden).
- **Campo `observaciones`**: Textarea (opcional).
- **Validación del lado del cliente**: Prevenir envío si `unidades_producidas` es mayor a la `cantidad_esperada` o menor a 1.
- **Envío**: Al confirmar, llamar a `actualizarEstado(id, { estado: 'COMPLETADA', unidades_producidas, observaciones })`.
- Tras éxito: cerrar modal, mostrar notificación de éxito y refrescar la lista de producciones padre.

---

### [NEW] (Opcional) Modal de Cancelar (dentro de `CompletarProduccionModal` o componente aparte)

- Modal simple de confirmación ("¿Está seguro de que desea cancelar esta orden?").
- Input opcional para `observaciones` (motivo de cancelación).
- **Envío**: Llamar a `actualizarEstado(id, { estado: 'CANCELADA', observaciones })`.
- Tras éxito: cerrar modal y refrescar la lista.

---

### [MODIFY] `frontend/src/App.jsx`

Agregar la ruta para el formulario de creación, protegiéndola con el permiso correspondiente.

```jsx
// Importar el componente
import ProduccionForm from './pages/produccion/ProduccionForm';

// Agregar en el bloque de rutas protegidas
<Route
  path="/produccion/crear"
  element={
    <ProtectedRoute permiso="produccion.crear">
      <ProduccionForm />
    </ProtectedRoute>
  }
/>
```

---

### [MODIFY] `frontend/src/pages/produccion/ProduccionList.jsx` (Integración)

- Conectar el botón "Avanzar estado" para abrir `CompletarProduccionModal` cuando la orden pase de `EN_PROCESO` a `COMPLETADA`.
- Conectar el botón "Cancelar" para abrir el modal de cancelación.

---

## Verificación de Fase 5

### Tests de Formulario de Creación

1. **Presentación sin receta**
   - Seleccionar una presentación sin receta asignada.
   - Debe aparecer un mensaje de alerta visible ("La presentación seleccionada no tiene una receta asociada.").
   - El botón "Crear Orden" debe estar deshabilitado.

2. **Stock insuficiente**
   - Seleccionar presentación válida.
   - Ingresar una cantidad alta que exceda el stock actual de alguna materia prima.
   - La tabla de insumos debe mostrar la fila faltante en rojo y el estado "❌ Faltante".
   - El botón "Crear Orden" debe estar deshabilitado.

3. **Creación válida**
   - Ingresar datos válidos con stock suficiente.
   - Hacer clic en "Crear Orden".
   - La orden se debe crear correctamente y redirigir a `/produccion` (estado `PROGRAMADA`).

### Tests de Modal de Completar

1. **Apertura de Modal**
   - Desde la lista, hacer clic en "Avanzar estado" (o "Completar") en una orden en estado `EN_PROCESO`.
   - Se debe abrir el modal.

2. **Validación Cliente**
   - Ingresar en `unidades_producidas` un valor mayor a `cantidad_esperada`.
   - El formulario no debe enviarse y debe mostrar un error visual indicando que excede la cantidad esperada.

3. **Completar válido**
   - Ingresar un número válido y enviar.
   - La orden debe pasar a `COMPLETADA` y el badge debe actualizarse en la lista al verde.

### Tests de Modal de Cancelar

1. **Cancelar orden**
   - Hacer clic en "Cancelar" en una orden `PROGRAMADA` o `EN_PROCESO`.
   - Confirmar en el modal.
   - La orden debe pasar a `CANCELADA` y el badge debe actualizarse en la lista al rojo.

---

## Notas de implementación

- Reutilizar componentes UI existentes (modales, tablas, alertas, botones) de otros módulos para mantener consistencia.
- Manejar adecuadamente los estados de carga (`isLoading`, `isSubmitting`) en los formularios y botones.
- Mostrar notificaciones (toasts) tras el éxito o error de las llamadas a la API.
