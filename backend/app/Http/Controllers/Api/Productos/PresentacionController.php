<?php

namespace App\Http\Controllers\Api\Productos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Productos\StorePresentacionRequest;
use App\Http\Requests\Productos\UpdateEstadoPresentacionRequest;
use App\Http\Requests\Productos\UpdatePresentacionRequest;
use App\Models\Presentacion;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresentacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->filled('id_producto')) {
            $producto = Producto::find($request->query('id_producto'));

            if (!$producto) {
                return response()->json([
                    'presentaciones' => [],
                ]);
            }

            $query = $producto->presentaciones()
                ->orderBy('nombre', 'asc');

            if ($request->has('estado') && $request->query('estado') !== '') {
                $query->where('presentacion.estado', $request->boolean('estado'));
            }

            return response()->json([
                'presentaciones' => $query->get(),
            ]);
        }

        $query = Presentacion::with('productos')
            ->orderBy('nombre', 'asc');

        if ($request->has('estado') && $request->query('estado') !== '') {
            $query->where('estado', $request->boolean('estado'));
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
            'estado' => $request->boolean('estado'),
        ]);

        return response()->json([
            'mensaje' => 'Estado de la presentación actualizado con éxito.',
            'presentacion' => $presentacion,
        ]);
    }
}
