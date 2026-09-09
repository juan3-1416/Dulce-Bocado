# CU16 — Fase 3: Backend — Completar/Cancelar Orden y Egreso de Inventario

> **Prerequisito:** Fase 2 completada y verificada ✅
> **Objetivo:** Implementar `PUT /produccion/{id}/estado`. Al pasar a `COMPLETADA`: consumir materias primas mediante un egreso real en `egreso` + `detalle_egreso` y decrementar `inventario`. Al `CANCELAR`: solo cambio de estado.

---

## Archivos a crear/modificar

### [NEW] `backend/app/Http/Requests/Produccion/CompletarProduccionRequest.php`

```php
<?php

namespace App\Http\Requests\Produccion;

use Illuminate\Foundation\Http\FormRequest;

class CompletarProduccionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unidades_producidas' => [
                'required',
                'integer',
                'min:1',
            ],
            'observaciones' => [
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'unidades_producidas.required' => 'Debe indicar la cantidad de unidades producidas.',
            'unidades_producidas.integer'  => 'Las unidades producidas deben ser un número entero.',
            'unidades_producidas.min'      => 'Debe producirse al menos 1 unidad.',
        ];
    }
}
```

---

### [MODIFY] `backend/app/Http/Controllers/Api/Produccion/ProduccionController.php`

Implementar `updateEstado()`:

#### Estructura general

```
1. Cargar la orden por ID → 404 si no existe
2. Leer el nuevo estado del request → 422 si no se envía
3. Validar la transición de estados
4. Ejecutar la acción según el nuevo estado
5. Retornar 200 con la orden actualizada
```

#### Transiciones válidas

| Estado actual | Nuevo estado permitido |
|---|---|
| `PROGRAMADA` | `EN_PROCESO`, `CANCELADA` |
| `EN_PROCESO` | `COMPLETADA`, `CANCELADA` |
| `COMPLETADA` | _(ninguno)_ |
| `CANCELADA` | _(ninguno)_ |

Si la transición no está en la tabla → retornar **422** `"Transición de estado no permitida."`

#### Al pasar a `EN_PROCESO`

Solo actualizar `produccion.estado = 'EN_PROCESO'`. Sin tocar inventario.

#### Al pasar a `COMPLETADA` — dentro de `DB::transaction()`

Validar con `CompletarProduccionRequest` (`unidades_producidas`, `observaciones`).

1. Re-cargar la receta y calcular insumos requeridos (igual que en `store()`)
2. Re-verificar stock actual en almacén "Materias Primas" para cada insumo
   - Si alguno es insuficiente → **422** con detalle + rollback automático
3. Crear registro en `egreso`:
   ```
   glosa      = "Consumo producción #<id_produccion>"
   id_usuario = auth()->user()->id_usuario
   fecha_egreso = now()
   ```
4. Por cada materia prima de la receta (× `detalle_produccion.cantidad_esperada`):
   - Crear `detalle_egreso`:
     ```
     id_egreso            = <nuevo_id_egreso>
     id_almacen           = almacén "Materias Primas"
     id_materia_prima     = <id de la materia prima>
     id_producto_presentacion = null
     cantidad             = cantidad_requerida
     ```
   - Decrementar `inventario.cantidad` en esa materia prima:
     ```
     inventario.cantidad -= cantidad_requerida
     ```
   - Verificar que `inventario.cantidad >= 0` post-decremento → si queda negativo: **rollback** y 422
5. Actualizar `detalle_produccion.cantidad_producida = $request->unidades_producidas`
6. Actualizar `produccion.estado = 'COMPLETADA'`
7. Si hay `observaciones`, actualizar `produccion.observaciones`

> [!NOTE]
> **El ingreso de producto terminado al almacén NO se implementa aquí.**
> Se implementará en CU18-19. Dejar el siguiente comentario en el código:
> ```php
> // TODO CU18: Registrar ingreso de producto terminado al almacén "Producción" o "Mostrador"
> // unidades_producidas = $request->unidades_producidas
> ```

#### Al pasar a `CANCELADA`

Solo actualizar `produccion.estado = 'CANCELADA'`. Sin tocar inventario.

---

## Verificación de Fase 3

### Test 1 — Transición inválida
```
PUT /api/produccion/{id_completada}/estado
{ "estado": "EN_PROCESO" }
→ Esperado: 422 "Transición de estado no permitida."
```

### Test 2 — PROGRAMADA → EN_PROCESO
```
PUT /api/produccion/{id}/estado
{ "estado": "EN_PROCESO" }
→ Esperado: 200, estado en BD = "EN_PROCESO"
```

### Test 3 — EN_PROCESO → COMPLETADA con stock insuficiente
```
(Reducir manualmente stock en BD a 0 para una materia prima)
PUT /api/produccion/{id}/estado
{ "estado": "COMPLETADA", "unidades_producidas": 3 }
→ Esperado: 422 con faltantes, rollback (sin registros en egreso)
```

### Test 4 — EN_PROCESO → COMPLETADA válida
```
PUT /api/produccion/{id}/estado
{ "estado": "COMPLETADA", "unidades_producidas": 3 }
→ Esperado: 200
```

### Verificación en BD tras Test 4
```sql
-- Egreso generado
SELECT * FROM egreso ORDER BY id_egreso DESC LIMIT 1;

-- Detalles del egreso
SELECT de.*, mp.nombre AS materia_prima
FROM detalle_egreso de
JOIN materia_prima mp ON mp.id_materia_prima = de.id_materia_prima
WHERE de.id_egreso = <id_egreso_nuevo>;

-- Stock decrementado
SELECT i.cantidad, mp.nombre
FROM inventario i
JOIN materia_prima mp ON mp.id_materia_prima = i.id_materia_prima
WHERE i.id_almacen = <id_almacen_materias_primas>;

-- Estado de la orden
SELECT id_produccion, estado FROM produccion WHERE id_produccion = <id>;

-- Unidades producidas registradas
SELECT id_detalle_produccion, cantidad_esperada, cantidad_producida
FROM detalle_produccion WHERE id_produccion = <id>;
```

### Test 5 — Cancelar una orden PROGRAMADA
```
PUT /api/produccion/{id}/estado
{ "estado": "CANCELADA" }
→ Esperado: 200, estado = "CANCELADA", sin cambios en inventario
```

---

## Notas de implementación

- `DB::transaction()` obligatorio para el bloque COMPLETADA
- El `id_almacen` del almacén "Materias Primas" debe buscarse por nombre, no hardcodearse
- Mismo patrón de `glosa` que usa VentaController u otros módulos existentes para trazabilidad
- Si `detalle_produccion` no tiene registro → retornar 422 con mensaje claro
