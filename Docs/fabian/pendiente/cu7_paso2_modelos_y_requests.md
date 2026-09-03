# CU7 — Paso 2: Modelos Eloquent y Form Requests (Backend)

Este documento detalla los modelos de datos Eloquent y los Form Requests para el **CU7: Gestionar Productos y Presentaciones**, adaptados con exactitud a los atributos de las tablas (`estado`, `imagen`, timestamps específicos y relación N:M).

---

## 1. Archivos a Crear

### Modelos Eloquent (`backend/app/Models/`)
- `Categoria.php` (con `estado` y solo `fecha_creacion`)
- `Producto.php` (con `imagen`, `estado` y solo `fecha_creacion`)
- `Presentacion.php` (con `estado`, `fecha_creacion` y `fecha_actualizacion`)
- `ProductoPresentacion.php` (asociación N:M con `precio` y solo `fecha_actualizacion`)

### Form Requests (`backend/app/Http/Requests/Productos/`)
- **Categorías:** `StoreCategoriaRequest.php`, `UpdateCategoriaRequest.php`
- **Productos:** `StoreProductoRequest.php`, `UpdateProductoRequest.php`, `UpdateEstadoProductoRequest.php`
- **Catálogo de Presentaciones:** `StorePresentacionRequest.php`, `UpdatePresentacionRequest.php`, `UpdateEstadoPresentacionRequest.php`
- **Asociación Producto - Presentación:** `AsignarPresentacionProductoRequest.php`, `UpdateProductoPresentacionRequest.php`

---

## 2. Código de Modelos Eloquent

### 2.1. `backend/app/Models/Categoria.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Categoria extends Model
{
    use HasFactory;

    protected $table = 'categoria';
    protected $primaryKey = 'id_categoria';

    // Solo posee fecha_creacion
    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = null;

    protected $fillable = [
        'nombre',
        'descripcion',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
            'fecha_creacion' => 'datetime',
        ];
    }

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class, 'id_categoria', 'id_categoria');
    }
}
```

### 2.2. `backend/app/Models/Producto.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory;

    protected $table = 'producto';
    protected $primaryKey = 'id_producto';

    // Solo posee fecha_creacion
    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id_categoria',
        'nombre',
        'descripcion',
        'imagen',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'id_categoria' => 'integer',
            'estado' => 'boolean',
            'fecha_creacion' => 'datetime',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'id_categoria', 'id_categoria');
    }

    // Relación N:M con Presentación
    public function presentaciones(): BelongsToMany
    {
        return $this->belongsToMany(
            Presentacion::class,
            'producto_presentacion',
            'id_producto',
            'id_presentacion'
        )
        ->withPivot('precio', 'fecha_actualizacion');
    }

    public function productoPresentaciones(): HasMany
    {
        return $this->hasMany(ProductoPresentacion::class, 'id_producto', 'id_producto');
    }
}
```

### 2.3. `backend/app/Models/Presentacion.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Presentacion extends Model
{
    use HasFactory;

    protected $table = 'presentacion';
    protected $primaryKey = 'id_presentacion';

    // Posee fecha_creacion y fecha_actualizacion
    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'nombre',
        'descripcion',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
            'fecha_creacion' => 'datetime',
            'fecha_actualizacion' => 'datetime',
        ];
    }

    // Relación N:M con Producto
    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(
            Producto::class,
            'producto_presentacion',
            'id_presentacion',
            'id_producto'
        )
        ->withPivot('precio', 'fecha_actualizacion');
    }

    public function productoPresentaciones(): HasMany
    {
        return $this->hasMany(ProductoPresentacion::class, 'id_presentacion', 'id_presentacion');
    }
}
```

### 2.4. `backend/app/Models/ProductoPresentacion.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductoPresentacion extends Model
{
    use HasFactory;

    protected $table = 'producto_presentacion';
    public $incrementing = false;
    protected $primaryKey = ['id_producto', 'id_presentacion'];

    // Solo posee fecha_actualizacion
    public const CREATED_AT = null;
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_producto',
        'id_presentacion',
        'precio',
    ];

    protected function casts(): array
    {
        return [
            'id_producto' => 'integer',
            'id_presentacion' => 'integer',
            'precio' => 'decimal:2',
            'fecha_actualizacion' => 'datetime',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'id_producto', 'id_producto');
    }

    public function presentacion(): BelongsTo
    {
        return $this->belongsTo(Presentacion::class, 'id_presentacion', 'id_presentacion');
    }
}
```

---

## 3. Código de Form Requests (`backend/app/Http/Requests/Productos/`)

### 3.1. `StoreCategoriaRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoriaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ];
    }
}
```

### 3.2. `UpdateCategoriaRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoriaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'boolean'],
        ];
    }
}
```

### 3.3. `StoreProductoRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_categoria' => ['required', 'integer', 'exists:categoria,id_categoria'],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'imagen' => ['nullable', 'string', 'max:255'],
        ];
    }
}
```

### 3.4. `UpdateProductoRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_categoria' => ['required', 'integer', 'exists:categoria,id_categoria'],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'imagen' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'boolean'],
        ];
    }
}
```

### 3.5. `UpdateEstadoProductoRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEstadoProductoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estado' => ['required', 'boolean'],
        ];
    }
}
```

### 3.6. `StorePresentacionRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class StorePresentacionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150', 'unique:presentacion,nombre'],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ];
    }
}
```

### 3.7. `UpdatePresentacionRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePresentacionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id') ?? $this->route('presentacion');

        return [
            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('presentacion', 'nombre')->ignore($id, 'id_presentacion'),
            ],
            'descripcion' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'boolean'],
        ];
    }
}
```

### 3.8. `AsignarPresentacionProductoRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class AsignarPresentacionProductoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_presentacion' => ['required', 'integer', 'exists:presentacion,id_presentacion'],
            'precio' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}
```

### 3.9. `UpdateProductoPresentacionRequest.php`
```php
<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductoPresentacionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'precio' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}
```

---

## 4. Criterios de Aceptación y Verificación

1. Los 4 modelos manejan de forma exacta las columnas de auditoría:
   - `Categoria` y `Producto`: `CREATED_AT = 'fecha_creacion'`, `UPDATED_AT = null`.
   - `Presentacion`: `CREATED_AT = 'fecha_creacion'`, `UPDATED_AT = 'fecha_actualizacion'`.
   - `ProductoPresentacion`: `CREATED_AT = null`, `UPDATED_AT = 'fecha_actualizacion'`.
2. Las columnas booleanas se denominan `estado`.
3. `Producto` incluye el campo `imagen`.
4. El precio se valida estrictamente mayor a cero (`min:0.01`).

> **Alto:** Una vez creados los modelos y requests, proceder con el **Paso 3 (Controladores y Rutas)**.
