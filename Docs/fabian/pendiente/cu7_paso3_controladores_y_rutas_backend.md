# CU7 — Paso 3: Controladores y Rutas API REST (Backend)

Este documento define los controladores REST y el registro de rutas API protegidas con Laravel Sanctum y el middleware RBAC para el **CU7: Gestionar Productos y Presentaciones**.

---

## 1. Archivos a Crear / Modificar

| Acción | Ruta del Archivo | Propósito |
| :--- | :--- | :--- |
| **[CREAR]** | `backend/app/Http/Controllers/Api/Productos/CategoriaController.php` | API CRUD de categorías. |
| **[CREAR]** | `backend/app/Http/Controllers/Api/Productos/ProductoController.php` | API para productos (listado con filtros, detalle, creación, edición, estado). |
| **[CREAR]** | `backend/app/Http/Controllers/Api/Productos/PresentacionController.php` | API para presentaciones vinculadas a productos. |
| **[MODIFICAR]** | `backend/routes/api.php` | Grupo de rutas `/api/productos` protegido con middleware. |

---

## 2. Controladores (`backend/app/Http/Controllers/Api/Productos/`)

### 2.1. `CategoriaController.php`
```php
<?php

namespace App\Http\Controllers\Api\Productos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Productos\StoreCategoriaRequest;
use App\Http\Requests\Productos\UpdateCategoriaRequest;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Categoria::query()->orderBy('nombre', 'asc');

        if ($request->boolean('solo_activas', false)) {
            $query->where('activo', true);
        }

        return response()->json([
            'categorias' => $query->get(),
        ]);
    }

    public function store(StoreCategoriaRequest $request): JsonResponse
    {
        $categoria = Categoria::create($request->validated());

        return response()->json([
            'mensaje' => 'Categoría creada con éxito.',
            'categoria' => $categoria,
        ], 201);
    }

    public function update(UpdateCategoriaRequest $request, int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->update($request->validated());

        return response()->json([
            'mensaje' => 'Categoría actualizada con éxito.',
            'categoria' => $categoria,
        ]);
    }
}
```

### 2.2. `ProductoController.php`
```php
<?php

namespace App\Http\Controllers\Api\Productos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Productos\StoreProductoRequest;
use App\Http\Requests\Productos\UpdateEstadoProductoRequest;
use App\Http\Requests\Productos\UpdateProductoRequest;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with('categoria')
            ->withCount('presentaciones')
            ->orderBy('id_producto', 'desc');

        if ($request->filled('buscar')) {
            $buscar = trim($request->query('buscar'));
            $query->where(function ($q) use ($buscar) {
                $q->where('nombre', 'ilike', "%{$buscar}%")
                  ->orWhere('descripcion', 'ilike', "%{$buscar}%");
            });
        }

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->query('categoria_id'));
        }

        if ($request->has('activo') && $request->query('activo') !== '') {
            $query->where('activo', $request->boolean('activo'));
        }

        return response()->json([
            'productos' => $query->get(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $producto = Producto::with(['categoria', 'presentaciones' => function ($q) {
            $q->orderBy('precio', 'asc');
        }])->findOrFail($id);

        return response()->json([
            'producto' => $producto,
        ]);
    }

    public function store(StoreProductoRequest $request): JsonResponse
    {
        $producto = Producto::create($request->validated());
        $producto->load('categoria');

        return response()->json([
            'mensaje' => 'Producto creado con éxito.',
            'producto' => $producto,
        ], 201);
    }

    public function update(UpdateProductoRequest $request, int $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $producto->update($request->validated());
        $producto->load('categoria');

        return response()->json([
            'mensaje' => 'Producto actualizado con éxito.',
            'producto' => $producto,
        ]);
    }

    public function updateEstado(UpdateEstadoProductoRequest $request, int $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $producto->update([
            'activo' => $request->boolean('activo'),
        ]);

        return response()->json([
            'mensaje' => 'Estado del producto actualizado con éxito.',
            'producto' => $producto,
        ]);
    }
}
```

### 2.3. `PresentacionController.php`
```php
<?php

namespace App\Http\Controllers\Api\Productos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Productos\StorePresentacionRequest;
use App\Http\Requests\Productos\UpdateEstadoPresentacionRequest;
use App\Http\Requests\Productos\UpdatePresentacionRequest;
use App\Models\Presentacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresentacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Presentacion::with('producto')
            ->orderBy('nombre', 'asc');

        if ($request->filled('producto_id')) {
            $query->where('producto_id', $request->query('producto_id'));
        }

        if ($request->has('activo') && $request->query('activo') !== '') {
            $query->where('activo', $request->boolean('activo'));
        }

        return response()->json([
            'presentaciones' => $query->get(),
        ]);
    }

    public function store(StorePresentacionRequest $request): JsonResponse
    {
        $presentacion = Presentacion::create($request->validated());

        return response()->json([
            'mensaje' => 'Presentación creada con éxito.',
            'presentacion' => $presentacion,
        ], 201);
    }

    public function update(UpdatePresentacionRequest $request, int $id): JsonResponse
    {
        $presentacion = Presentacion::findOrFail($id);
        $presentacion->update($request->validated());

        return response()->json([
            'mensaje' => 'Presentación actualizada con éxito.',
            'presentacion' => $presentacion,
        ]);
    }

    public function updateEstado(UpdateEstadoPresentacionRequest $request, int $id): JsonResponse
    {
        $presentacion = Presentacion::findOrFail($id);
        $presentacion->update([
            'activo' => $request->boolean('activo'),
        ]);

        return response()->json([
            'mensaje' => 'Estado de la presentación actualizado con éxito.',
            'presentacion' => $presentacion,
        ]);
    }
}
```

---

## 3. Configuración de Rutas (`backend/routes/api.php`)

Agregar dentro del grupo protegido por `auth:sanctum`:

```php
use App\Http\Controllers\Api\Productos\CategoriaController;
use App\Http\Controllers\Api\Productos\ProductoController;
use App\Http\Controllers\Api\Productos\PresentacionController;

Route::middleware(['auth:sanctum'])->prefix('productos')->group(function () {
    // Categorías y Productos (gestión de producto)
    Route::middleware('permiso:productos.gestionar_producto')->group(function () {
        Route::get('/categorias', [CategoriaController::class, 'index']);
        Route::post('/categorias', [CategoriaController::class, 'store']);
        Route::put('/categorias/{id}', [CategoriaController::class, 'update']);

        Route::get('/', [ProductoController::class, 'index']);
        Route::post('/', [ProductoController::class, 'store']);
        Route::get('/{id}', [ProductoController::class, 'show']);
        Route::put('/{id}', [ProductoController::class, 'update']);
        Route::patch('/{id}/estado', [ProductoController::class, 'updateEstado']);
    });

    // Presentaciones (gestión de presentaciones y precios)
    Route::middleware('permiso:productos.gestionar_presentacion')->group(function () {
        Route::get('/presentaciones', [PresentacionController::class, 'index']);
        Route::post('/presentaciones', [PresentacionController::class, 'store']);
        Route::put('/presentaciones/{id}', [PresentacionController::class, 'update']);
        Route::patch('/presentaciones/{id}/estado', [PresentacionController::class, 'updateEstado']);
    });
});
```

---

## 4. Criterios de Aceptación y Verificación

1. **Rutas protegidas:** Solicitudes sin sesión retornan `401 Unauthorized`.
2. **Control RBAC:** Usuarios sin `productos.gestionar_producto` o `productos.gestionar_presentacion` retornan `403 Forbidden`.
3. **Códigos de estado:**
   - Creación exitosa: `201 Created`.
   - Edición o cambio de estado: `200 OK`.
   - Errores de validación: `422 Unprocessable Content`.

> **Alto:** Una vez verificado el funcionamiento del backend, proceder con el **Paso 4 (Frontend)**.
