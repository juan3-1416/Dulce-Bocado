# CU16 — Fase 2: Backend — Form Requests y Lógica de Creación de Orden

> **Prerequisito:** Fase 1 completada y verificada ✅
> **Objetivo:** Implementar `POST /produccion`, `GET /produccion` y `GET /produccion/{id}` con validación completa, cálculo de insumos y verificación de stock en tiempo real.

---

## Archivos a crear/modificar

### [NEW] `backend/app/Http/Requests/Produccion/StoreProduccionRequest.php`

```php
<?php

namespace App\Http\Requests\Produccion;

use Illuminate\Foundation\Http\FormRequest;

class StoreProduccionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_producto_presentacion' => [
                'required',
                'integer',
                'exists:producto_presentacion,id_producto_presentacion',
            ],
            'cantidad' => [
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
            'id_producto_presentacion.required' => 'Debe seleccionar una presentación de producto.',
            'id_producto_presentacion.exists'   => 'La presentación seleccionada no existe.',
            'cantidad.required'                 => 'La cantidad a producir es obligatoria.',
            'cantidad.integer'                  => 'La cantidad debe ser un número entero.',
            'cantidad.min'                      => 'La cantidad mínima a producir es 1.',
        ];
    }
}
```

---

### [MODIFY] `backend/app/Http/Controllers/Api/Produccion/ProduccionController.php`

Reemplazar el stub completo con la implementación real:

**`index()`** — Listar órdenes con filtros opcionales:
- `estado`: filtrar por `PROGRAMADA`, `EN_PROCESO`, `COMPLETADA`, `CANCELADA`
- `fecha_desde` / `fecha_hasta`: rango de fechas sobre `fecha_produccion`
- Eager load: `productoPresentacion.producto`, `usuario`
- Orden: `fecha_produccion DESC`
- Retorna 200 con array paginado o listado completo

**`store()`** — Crear orden (toda la lógica dentro de `DB::transaction()`):
1. Buscar `Receta` donde `id_producto_presentacion` coincida → si no existe, retornar **422** `"La presentación seleccionada no tiene una receta asociada."`
2. Cargar `detalleReceta` con relación `materiaPrima`
3. Buscar el `id_almacen` del almacén "Materias Primas" (por nombre en tabla `almacen`)
4. Por cada ítem de la receta:
   - `cantidad_requerida = detalle_receta.cantidad × $request->cantidad`
   - Buscar en `inventario` donde `id_almacen` = Materias Primas e `id_materia_prima` coincida
   - Si no existe registro o `inventario.cantidad < cantidad_requerida` → acumular en array `$faltantes`
5. Si `$faltantes` no está vacío → retornar **422** con estructura:
   ```json
   {
     "message": "Stock insuficiente para producir la cantidad solicitada.",
     "faltantes": [
       { "materia_prima": "Harina", "requerido": 500, "disponible": 200, "faltante": 300 }
     ]
   }
   ```
6. Crear `Produccion`:
   - `id_producto_presentacion`, `id_usuario` = `auth()->user()->id_usuario`
   - `estado` = `PROGRAMADA`, `observaciones`
7. Crear `DetalleProduccion`:
   - `id_produccion`, `id_almacen` = almacén Materias Primas
   - `cantidad_esperada` = `$request->cantidad`, `cantidad_producida` = null
8. Retornar **201** con la orden + detalles + insumos calculados

**`show()`** — Detalle de una orden:
- Cargar: `productoPresentacion.producto`, `usuario`, `detalles.almacen`
- Cargar receta con materias primas y stock actual de cada una en Materias Primas
- Retornar 200 con toda esa información, o 404 si no existe

---

## Lógica de negocio crítica

```
almacen "Materias Primas" → buscar por nombre (no hardcodear ID)
Produccion.estado inicial → "PROGRAMADA"
DetalleProduccion → solo 1 registro por orden (almacén destino)
Receta → relación en tabla `receta` por id_producto_presentacion
DetalleReceta → tabla `detalle_receta`, campos: id_receta, id_materia_prima, cantidad
```

---

## Verificación de Fase 2

### Test 1 — Presentación sin receta
```
POST /api/produccion
{ "id_producto_presentacion": <ID sin receta>, "cantidad": 5 }
→ Esperado: 422 "La presentación seleccionada no tiene una receta asociada."
```

### Test 2 — Stock insuficiente
```
POST /api/produccion
{ "id_producto_presentacion": <ID con receta>, "cantidad": 9999 }
→ Esperado: 422 con array "faltantes" detallado por materia prima
```

### Test 3 — Creación válida
```
POST /api/produccion
{ "id_producto_presentacion": <ID válido>, "cantidad": 2 }
→ Esperado: 201, estado="PROGRAMADA" en BD
         : registros en tabla "produccion" y "detalle_produccion"
```

### Test 4 — Listar
```
GET /api/produccion
→ Esperado: 200 con array de órdenes
GET /api/produccion?estado=PROGRAMADA
→ Esperado: 200 filtrado
```

### Test 5 — Detalle
```
GET /api/produccion/{id}
→ Esperado: 200 con orden completa + receta + insumos + stock actual
GET /api/produccion/9999
→ Esperado: 404
```

### Verificación en BD
```sql
SELECT * FROM produccion ORDER BY fecha_produccion DESC LIMIT 5;
SELECT * FROM detalle_produccion WHERE id_produccion = <nuevo_id>;
```

---

## Notas de implementación

- Seguir el patrón de respuestas JSON existente en el proyecto (ver `VentaController`)
- `DB::transaction()` obligatorio en `store()`
- Si el almacén "Materias Primas" no existe en BD → retornar 500 con mensaje claro (no asumir que existe)
- No modificar ninguna tabla de inventario en esta fase (solo lectura para verificar stock)
