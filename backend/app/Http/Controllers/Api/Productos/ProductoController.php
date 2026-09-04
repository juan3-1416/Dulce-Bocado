<?php

namespace App\Http\Controllers\Api\Productos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Productos\AsignarPresentacionProductoRequest;
use App\Http\Requests\Productos\StoreProductoRequest;
use App\Http\Requests\Productos\UpdateEstadoProductoRequest;
use App\Http\Requests\Productos\UpdateProductoPresentacionRequest;
use App\Http\Requests\Productos\UpdateProductoRequest;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        if ($request->filled('id_categoria')) {
            $query->where('id_categoria', $request->query('id_categoria'));
        }

        if ($request->has('estado') && $request->query('estado') !== '') {
            $query->where('estado', $request->boolean('estado'));
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
        $producto = DB::transaction(function () use ($request) {
            $datos = $request->validated();
            $presentaciones = $datos['presentaciones'] ?? null;
            unset($datos['presentaciones']);

            $producto = Producto::create($datos);

            if (!empty($presentaciones)) {
                $attachData = [];
                foreach ($presentaciones as $p) {
                    $attachData[$p['id_presentacion']] = [
                        'precio' => $p['precio'],
                        'fecha_actualizacion' => now(),
                    ];
                }
                $producto->presentaciones()->attach($attachData);
            }

            return $producto;
        });

        $producto->load(['categoria', 'presentaciones']);

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
            'estado' => $request->boolean('estado'),
        ]);

        return response()->json([
            'mensaje' => 'Estado del producto actualizado con éxito.',
            'producto' => $producto,
        ]);
    }

    public function asignarPresentacion(AsignarPresentacionProductoRequest $request, int $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $idPresentacion = (int) $request->input('id_presentacion');
        $precio = $request->input('precio');

        $producto->presentaciones()->syncWithoutDetaching([
            $idPresentacion => [
                'precio' => $precio,
                'fecha_actualizacion' => now(),
            ],
        ]);

        $producto->load(['presentaciones' => function ($q) {
            $q->orderBy('precio', 'asc');
        }]);

        return response()->json([
            'mensaje' => 'Presentación asignada al producto con éxito.',
            'producto' => $producto,
        ], 200);
    }

    public function actualizarPrecioPresentacion(UpdateProductoPresentacionRequest $request, int $id, int $idPresentacion): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        if (!$producto->presentaciones()->where('presentacion.id_presentacion', $idPresentacion)->exists()) {
            return response()->json([
                'message' => 'La presentación no está asignada a este producto.',
            ], 404);
        }

        $producto->presentaciones()->updateExistingPivot($idPresentacion, [
            'precio' => $request->input('precio'),
            'fecha_actualizacion' => now(),
        ]);

        return response()->json([
            'mensaje' => 'Precio de la presentación actualizado con éxito.',
        ], 200);
    }

    public function desvincularPresentacion(int $id, int $idPresentacion): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        if (!$producto->presentaciones()->where('presentacion.id_presentacion', $idPresentacion)->exists()) {
            return response()->json([
                'message' => 'La presentación no está vinculada a este producto.',
            ], 404);
        }

        $producto->presentaciones()->detach($idPresentacion);

        return response()->json([
            'mensaje' => 'Presentación desvinculada del producto con éxito.',
        ], 200);
    }
}
