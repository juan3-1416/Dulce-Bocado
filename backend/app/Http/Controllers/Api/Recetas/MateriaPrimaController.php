<?php

namespace App\Http\Controllers\Api\Recetas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Recetas\StoreMateriaPrimaRequest;
use App\Http\Requests\Recetas\UpdateEstadoMateriaPrimaRequest;
use App\Http\Requests\Recetas\UpdateMateriaPrimaRequest;
use App\Models\MateriaPrima;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MateriaPrimaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MateriaPrima::query();

        if ($request->filled('buscar')) {
            $buscar = trim(
                $request->query('buscar')
            );

            $query->where(function ($consulta) use ($buscar) {
                $consulta
                    ->where(
                        'nombre',
                        'ilike',
                        "%{$buscar}%"
                    )
                    ->orWhere(
                        'descripcion',
                        'ilike',
                        "%{$buscar}%"
                    )
                    ->orWhere(
                        'unidad_medida',
                        'ilike',
                        "%{$buscar}%"
                    );
            });
        }

        if ($request->filled('estado')) {
            $query->where(
                'estado',
                $request->boolean('estado')
            );
        }

        $materiasPrimas = $query
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'materias_primas' =>
                $materiasPrimas,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $materiaPrima = MateriaPrima::find($id);

        if (!$materiaPrima) {
            return response()->json([
                'message' =>
                    'Materia prima no encontrada.',
            ], 404);
        }

        return response()->json([
            'materia_prima' =>
                $materiaPrima,
        ]);
    }

    public function store(
        StoreMateriaPrimaRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $materiaPrima = MateriaPrima::create([
            'nombre' =>
                $datos['nombre'],

            'unidad_medida' =>
                $datos['unidad_medida'],

            'descripcion' =>
                $datos['descripcion'] ?? null,

            'estado' =>
                $datos['estado'] ?? true,
        ]);

        return response()->json([
            'message' =>
                'Materia prima registrada correctamente.',

            'materia_prima' =>
                $materiaPrima,
        ], 201);
    }

    public function update(
        UpdateMateriaPrimaRequest $request,
        int $id
    ): JsonResponse {
        $materiaPrima = MateriaPrima::find($id);

        if (!$materiaPrima) {
            return response()->json([
                'message' =>
                    'Materia prima no encontrada.',
            ], 404);
        }

        $datos = $request->validated();

        $materiaPrima->update([
            'nombre' =>
                $datos['nombre'],

            'unidad_medida' =>
                $datos['unidad_medida'],

            'descripcion' =>
                $datos['descripcion'] ?? null,

            'estado' =>
                $datos['estado']
                ?? $materiaPrima->estado,
        ]);

        return response()->json([
            'message' =>
                'Materia prima actualizada correctamente.',

            'materia_prima' =>
                $materiaPrima->fresh(),
        ]);
    }

    public function updateEstado(
        UpdateEstadoMateriaPrimaRequest $request,
        int $id
    ): JsonResponse {
        $materiaPrima = MateriaPrima::find($id);

        if (!$materiaPrima) {
            return response()->json([
                'message' =>
                    'Materia prima no encontrada.',
            ], 404);
        }

        $materiaPrima->update([
            'estado' =>
                $request->validated()['estado'],
        ]);

        return response()->json([
            'message' =>
                $materiaPrima->estado
                    ? 'Materia prima activada correctamente.'
                    : 'Materia prima desactivada correctamente.',

            'materia_prima' =>
                $materiaPrima->fresh(),
        ]);
    }
}