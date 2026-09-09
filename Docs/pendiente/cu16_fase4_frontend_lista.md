# CU16 — Fase 4: Frontend — Servicio y Lista de Producciones

> **Prerequisito:** Fases 1, 2 y 3 completadas y verificadas ✅
> **Objetivo:** Conectar el frontend con los endpoints de producción. Implementar el servicio de API y la vista de lista con filtros, antes de los formularios complejos.

---

## Archivos a crear/modificar

### [NEW] `frontend/src/services/produccionService.js`

Seguir el mismo patrón de los services existentes del proyecto (`credentials: 'include'`, header CSRF, manejo de errores).

```js
// Patrón de referencia: revisar ventaService.js o pedidoService.js antes de implementar

export const listarProducciones = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.estado)       params.append('estado', filtros.estado);
  if (filtros.fecha_desde)  params.append('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta)  params.append('fecha_hasta', filtros.fecha_hasta);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  // GET /api/produccion{queryString}
  // credentials: 'include', Accept: application/json, X-XSRF-TOKEN
};

export const obtenerProduccion = async (id) => {
  // GET /api/produccion/{id}
};

export const crearProduccion = async (datos) => {
  // POST /api/produccion
  // Body: { id_producto_presentacion, cantidad, observaciones }
};

export const actualizarEstado = async (id, datos) => {
  // PUT /api/produccion/{id}/estado
  // Body: { estado, unidades_producidas?, observaciones? }
};
```

> [!IMPORTANT]
> Copiar el patrón EXACTO de obtención de CSRF token que usan los demás services del proyecto.
> No inventar un nuevo patrón. Revisar el archivo existente más reciente.

---

### [NEW] `frontend/src/pages/produccion/ProduccionList.jsx`

#### Estructura de la página

```
<ProduccionList>
  ├── Cabecera: título "Producción" + botón "Nueva Producción" (si tiene permiso produccion.crear)
  ├── Panel de filtros:
  │   ├── Select: Estado (Todos / PROGRAMADA / EN_PROCESO / COMPLETADA / CANCELADA)
  │   ├── Input date: Fecha desde
  │   ├── Input date: Fecha hasta
  │   └── Botón: "Filtrar" / "Limpiar"
  └── Tabla de órdenes:
      ├── Columnas: Producto/Presentación | Cantidad esperada | Unidades producidas | Estado | Fecha | Responsable | Acciones
      ├── Badge de estado con color:
      │   ├── PROGRAMADA  → azul
      │   ├── EN_PROCESO  → amarillo/naranja
      │   ├── COMPLETADA  → verde
      │   └── CANCELADA   → rojo/gris
      ├── Columna Acciones:
      │   ├── Botón "Ver detalle" (siempre visible)
      │   ├── Botón "Avanzar estado" (PROGRAMADA→EN_PROCESO / EN_PROCESO→COMPLETADA) si tiene permiso
      │   └── Botón "Cancelar" (PROGRAMADA o EN_PROCESO) si tiene permiso
      └── Mensaje vacío si no hay órdenes
```

#### Lógica de estado del componente

```js
const [producciones, setProducciones] = useState([]);
const [cargando, setCargando] = useState(true);
const [filtros, setFiltros] = useState({ estado: '', fecha_desde: '', fecha_hasta: '' });
const [error, setError] = useState(null);

// Carga inicial y recarga al cambiar filtros
useEffect(() => { cargarProducciones(); }, [filtros]);

const cargarProducciones = async () => {
  // listarProducciones(filtros)
};
```

#### Permisos a verificar (usar el mismo patrón que otros módulos)

- `produccion.crear` → mostrar botón "Nueva Producción"
- `produccion.gestionar` → mostrar botones de cambio de estado

---

### [MODIFY] `frontend/src/App.jsx`

Agregar ruta protegida siguiendo el patrón de las rutas existentes:

```jsx
// Importar el componente
import ProduccionList from './pages/produccion/ProduccionList';

// Agregar en el bloque de rutas protegidas (dentro de MainLayout)
<Route
  path="/produccion"
  element={
    <ProtectedRoute permiso="produccion.listar">
      <ProduccionList />
    </ProtectedRoute>
  }
/>
```

> Revisar exactamente cómo están definidas las rutas existentes en `App.jsx` antes de agregar.

---

### [MODIFY] `frontend/src/layouts/MainLayout.jsx`

Agregar ítem de menú siguiendo el mismo patrón visual de los ítems existentes (mismo componente/clase que usan Ventas, Pedidos, etc.):

```jsx
// Ítem condicionado al permiso produccion.listar
// Icono: usar el mismo set de íconos que usa el menú (verificar qué librería usa el proyecto)
// Texto: "Producción"
// Path: "/produccion"
```

> **No inventar un nuevo estilo de ítem.** Copiar el patrón exacto de otro ítem existente como Ventas o Pedidos.

---

## Verificación de Fase 4

### Tests visuales

1. **Navegar a `/produccion`** como usuario admin
   - Debe mostrar la lista con las órdenes creadas en Fases 2-3
   - Debe mostrar badges de color según estado

2. **Filtrar por estado** `PROGRAMADA`
   - Solo deben aparecer órdenes en ese estado

3. **Filtrar por rango de fechas**
   - Solo deben aparecer órdenes en el rango seleccionado

4. **"Limpiar filtros"**
   - Debe volver a mostrar todas las órdenes

5. **Menú lateral**
   - Debe aparecer ítem "Producción" para el usuario admin

6. **Usuario sin permiso `produccion.listar`**
   - No debe ver el ítem en el menú
   - Intentar acceder a `/produccion` directamente → debe redirigir (comportamiento de `ProtectedRoute`)

7. **Sin órdenes** (filtrar por fecha futura)
   - Debe mostrar mensaje "Sin resultados" o similar (no una tabla vacía sin mensaje)

---

## Notas de implementación

- No crear CSS nuevo si el proyecto ya tiene clases de badge/tabla disponibles — reutilizar
- El componente `ProtectedRoute` ya está implementado, no modificarlo
- `MainLayout` es un archivo compartido — revisar cuidadosamente antes de modificar
- Los botones de cambio de estado en esta fase pueden navegar a una vista de detalle o abrir el modal de Fase 5 — se puede dejar como placeholder `onClick={() => {}}` para conectar en Fase 5
