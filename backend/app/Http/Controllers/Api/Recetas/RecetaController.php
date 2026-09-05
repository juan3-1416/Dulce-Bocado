<?php

namespace App\Http\Controllers\Api\Recetas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Recetas\StoreRecetaRequest;
use App\Models\DetalleReceta;
use App\Models\ProductoPresentacion;
use App\Models\Receta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Requests\Recetas\UpdateEstadoRecetaRequest;
use App\Http\Requests\Recetas\UpdateRecetaRequest;

class RecetaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Receta::query()
            ->with([
                'productoPresentacion.producto:id_producto,nombre,estado',
                'productoPresentacion.presentacion:id_presentacion,nombre,estado',
                'detalles.materiaPrima:id_materia_prima,nombre,unidad_medida,estado',
            ]);

        if ($request->filled('estado')) {
            $query->where(
                'estado',
                $request->boolean('estado')
            );
        }

        if ($request->filled('buscar')) {
            $buscar = trim(
                $request->query('buscar')
            );

            $query->whereHas(
                'productoPresentacion.producto',
                function ($consulta) use ($buscar) {
                    $consulta->where(
                        'nombre',
                        'ilike',
                        "%{$buscar}%"
                    );
                }
            );
        }

        $recetas = $query
            ->orderByDesc('id_receta')
            ->get();

        return response()->json([
            'recetas' => $recetas,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $receta = Receta::query()
            ->with([
                'productoPresentacion.producto:id_producto,nombre,descripcion,estado',
                'productoPresentacion.presentacion:id_presentacion,nombre,descripcion,estado',
                'detalles.materiaPrima:id_materia_prima,nombre,unidad_medida,descripcion,estado',
            ])
            ->find($id);

        if (!$receta) {
            return response()->json([
                'message' =>
                    'Receta no encontrada.',
            ], 404);
        }

        return response()->json([
            'receta' => $receta,
        ]);
    }

    public function store(
        StoreRecetaRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $productoPresentacion =
            ProductoPresentacion::query()
                ->with([
                    'producto',
                    'presentacion',
                ])
                ->find(
                    $datos['id_producto_presentacion']
                );

        if (
            !$productoPresentacion
            || !$productoPresentacion->producto
            || !$productoPresentacion->presentacion
        ) {
            return response()->json([
                'message' =>
                    'La combinación producto-presentación no es válida.',
            ], 422);
        }

        if (
            !$productoPresentacion->producto->estado
            || !$productoPresentacion->presentacion->estado
        ) {
            return response()->json([
                'message' =>
                    'No se puede crear una receta para un producto o presentación inactiva.',
            ], 422);
        }

        $yaExiste = Receta::query()
            ->where(
                'id_producto_presentacion',
                $datos['id_producto_presentacion']
            )
            ->exists();

        if ($yaExiste) {
            return response()->json([
                'message' =>
                    'Esta presentación de producto ya tiene una receta registrada.',
            ], 409);
        }

        $receta = DB::transaction(
            function () use ($datos) {
                $receta = Receta::create([
                    'id_producto_presentacion' =>
                        $datos['id_producto_presentacion'],

                    'observaciones' =>
                        $datos['observaciones'] ?? null,

                    'estado' =>
                        $datos['estado'] ?? true,
                ]);

                foreach (
                    $datos['ingredientes']
                    as $ingrediente
                ) {
                    DetalleReceta::create([
                        'id_receta' =>
                            $receta->id_receta,

                        'id_materia_prima' =>
                            $ingrediente['id_materia_prima'],

                        'cantidad' =>
                            $ingrediente['cantidad'],
                    ]);
                }

                return $receta;
            }
        );

        $receta->load([
            'productoPresentacion.producto:id_producto,nombre,estado',
            'productoPresentacion.presentacion:id_presentacion,nombre,estado',
            'detalles.materiaPrima:id_materia_prima,nombre,unidad_medida,estado',
        ]);

        return response()->json([
            'message' =>
                'Receta registrada correctamente.',

            'receta' =>
                $receta,
        ], 201);
    }
    public function update(
    UpdateRecetaRequest $request,
    int $id
): JsonResponse {
    $datos = $request->validated();

    $receta = DB::transaction(
        function () use ($datos, $id) {
            $receta = Receta::query()
                ->lockForUpdate()
                ->find($id);

            if (!$receta) {
                return null;
            }

            $receta->update([
                'observaciones' =>
                    $datos['observaciones'] ?? null,

                'estado' =>
                    $datos['estado']
                    ?? $receta->estado,
            ]);

            /*
             * Se reemplaza el detalle completo.
             * Al estar dentro de una transacción,
             * la receta nunca queda parcialmente actualizada.
             */
            $receta->detalles()->delete();

            foreach (
                $datos['ingredientes']
                as $ingrediente
            ) {
                DetalleReceta::create([
                    'id_receta' =>
                        $receta->id_receta,

                    'id_materia_prima' =>
                        $ingrediente['id_materia_prima'],

                    'cantidad' =>
                        $ingrediente['cantidad'],
                ]);
            }

            return $receta;
        }
    );

    if (!$receta) {
        return response()->json([
            'message' =>
                'Receta no encontrada.',
        ], 404);
    }

    $receta->load([
        'productoPresentacion.producto:id_producto,nombre,estado',
        'productoPresentacion.presentacion:id_presentacion,nombre,estado',
        'detalles.materiaPrima:id_materia_prima,nombre,unidad_medida,estado',
    ]);

    return response()->json([
        'message' =>
            'Receta actualizada correctamente.',

        'receta' =>
            $receta,
    ]);
}

public function updateEstado(
    UpdateEstadoRecetaRequest $request,
    int $id
): JsonResponse {
    $receta = Receta::find($id);

    if (!$receta) {
        return response()->json([
            'message' =>
                'Receta no encontrada.',
        ], 404);
    }

    $receta->update([
        'estado' =>
            $request->validated()['estado'],
    ]);

    return response()->json([
        'message' =>
            $receta->estado
                ? 'Receta activada correctamente.'
                : 'Receta desactivada correctamente.',

        'receta' =>
            $receta->fresh(),
    ]);
}
public function catalogos(): JsonResponse
{
    $productosPresentaciones =
        ProductoPresentacion::query()
            ->with([
                'producto:id_producto,nombre,estado',
                'presentacion:id_presentacion,nombre,estado',
            ])
            ->whereHas(
                'producto',
                fn ($query) =>
                    $query->where(
                        'estado',
                        true
                    )
            )
            ->whereHas(
                'presentacion',
                fn ($query) =>
                    $query->where(
                        'estado',
                        true
                    )
            )
            ->whereDoesntHave(
                'receta'
            )
            ->orderBy(
                'id_producto_presentacion'
            )
            ->get();

    $materiasPrimas =
        \App\Models\MateriaPrima::query()
            ->where(
                'estado',
                true
            )
            ->orderBy(
                'nombre'
            )
            ->get([
                'id_materia_prima',
                'nombre',
                'unidad_medida',
            ]);

    return response()->json([
        'productos_presentaciones' =>
            $productosPresentaciones,

        'materias_primas' =>
            $materiasPrimas,
    ]);
}
}