<?php

namespace App\Http\Controllers\Api\Produccion;

use App\Http\Controllers\Controller;
use App\Http\Requests\Produccion\StoreProduccionRequest;
use App\Models\Almacen;
use App\Models\DetalleProduccion;
use App\Models\Inventario;
use App\Models\Produccion;
use App\Models\Receta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProduccionController extends Controller
{
    /**
     * Listar órdenes de producción.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Produccion::with([
            'productoPresentacion.producto',
            'productoPresentacion.presentacion',
            'usuario',
            'detalles.almacen',
        ]);

        if ($request->filled('estado')) {
            $query->where(
                'estado',
                $request->string('estado')->toString()
            );
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate(
                'fecha_produccion',
                '>=',
                $request->input('fecha_desde')
            );
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate(
                'fecha_produccion',
                '<=',
                $request->input('fecha_hasta')
            );
        }

        $ordenes = $query
            ->orderByDesc('fecha_produccion')
            ->get();

        return response()->json($ordenes);
    }

    /**
     * Crear orden de producción.
     */
    public function store(
        StoreProduccionRequest $request
    ): JsonResponse {
        $resultado = DB::transaction(
            function () use ($request) {
                $receta = Receta::with(
                    'detalles.materiaPrima'
                )
                    ->where(
                        'id_producto_presentacion',
                        $request->id_producto_presentacion
                    )
                    ->first();

                if (!$receta) {
                    abort(
                        422,
                        'La presentación seleccionada no tiene una receta asociada.'
                    );
                }

                $almacenMateriasPrimas =
                    Almacen::where(
                        'nombre',
                        'Materias Primas'
                    )->first();

                if (!$almacenMateriasPrimas) {
                    abort(
                        500,
                        'El almacén de Materias Primas no está configurado.'
                    );
                }

                /*
                 * CU16 calcula los requerimientos
                 * teóricos de producción.
                 */
                $faltantes = [];

                foreach ($receta->detalles as $detalle) {
                    $cantidadRequerida = round(
                        (float) $detalle->cantidad
                        * (int) $request->cantidad,
                        3
                    );

                    $inventario = Inventario::query()
                        ->where(
                            'id_almacen',
                            $almacenMateriasPrimas
                                ->id_almacen
                        )
                        ->where(
                            'id_materia_prima',
                            $detalle->id_materia_prima
                        )
                        ->first();

                    $disponible = $inventario
                        ? (float) $inventario->cantidad
                        : 0;

                    if (
                        $disponible
                        < $cantidadRequerida
                    ) {
                        $faltantes[] = [
                            'id_materia_prima' =>
                                $detalle
                                    ->id_materia_prima,

                            'materia_prima' =>
                                $detalle
                                    ->materiaPrima
                                    ->nombre,

                            'requerido' =>
                                $cantidadRequerida,

                            'disponible' =>
                                $disponible,

                            'faltante' =>
                                round(
                                    $cantidadRequerida
                                    - $disponible,
                                    3
                                ),
                        ];
                    }
                }

                if (!empty($faltantes)) {
                    return [
                        'error' => true,

                        'response' =>
                            response()->json([
                                'message' =>
                                    'Stock insuficiente para producir la cantidad solicitada.',

                                'faltantes' =>
                                    $faltantes,
                            ], 422),
                    ];
                }

                $produccion = Produccion::create([
                    'id_producto_presentacion' =>
                        $request
                            ->id_producto_presentacion,

                    'id_usuario' =>
                        $request->user()
                            ->id_usuario,

                    'fecha_produccion' =>
                        now(),

                    'estado' =>
                        'PROGRAMADA',

                    'observaciones' =>
                        $request->input(
                            'observaciones'
                        ),
                ]);

                DetalleProduccion::create([
                    'id_produccion' =>
                        $produccion->id_produccion,

                    'id_almacen' =>
                        $almacenMateriasPrimas
                            ->id_almacen,

                    'cantidad_esperada' =>
                        $request->cantidad,

                    'cantidad_producida' =>
                        null,
                ]);

                $produccion->load([
                    'productoPresentacion.producto',
                    'productoPresentacion.presentacion',
                    'usuario',
                    'detalles.almacen',
                ]);

                return [
                    'error' => false,
                    'produccion' => $produccion,
                ];
            }
        );

        if ($resultado['error']) {
            return $resultado['response'];
        }

        return response()->json([
            'message' =>
                'Orden de producción creada correctamente.',

            'produccion' =>
                $resultado['produccion'],
        ], 201);
    }

    /**
     * Consultar una orden de producción.
     */
    public function show(int $id): JsonResponse
    {
        $produccion = Produccion::with([
            'productoPresentacion.producto',
            'productoPresentacion.presentacion',
            'usuario',
            'detalles.almacen',
            'consumos.materiaPrima',
            'consumos.almacen',
            'consumos.usuario',
        ])->find($id);

        if (!$produccion) {
            return response()->json([
                'message' =>
                    'Orden de producción no encontrada.',
            ], 404);
        }

        $detalleProduccion =
            $produccion->detalles->first();

        $receta = Receta::with(
            'detalles.materiaPrima'
        )
            ->where(
                'id_producto_presentacion',
                $produccion
                    ->id_producto_presentacion
            )
            ->first();

        $almacenMateriasPrimas =
            Almacen::where(
                'nombre',
                'Materias Primas'
            )->first();

        $insumos = [];

        if (
            $receta
            && $detalleProduccion
            && $almacenMateriasPrimas
        ) {
            $cantidadPlanificada =
                (float) $detalleProduccion
                    ->cantidad_esperada;

            foreach (
                $receta->detalles
                as $detalleReceta
            ) {
                $inventario =
                    Inventario::query()
                        ->where(
                            'id_almacen',
                            $almacenMateriasPrimas
                                ->id_almacen
                        )
                        ->where(
                            'id_materia_prima',
                            $detalleReceta
                                ->id_materia_prima
                        )
                        ->first();

                $insumos[] = [
                    'id_materia_prima' =>
                        $detalleReceta
                            ->id_materia_prima,

                    'materia_prima' =>
                        $detalleReceta
                            ->materiaPrima
                            ->nombre,

                    'unidad_medida' =>
                        $detalleReceta
                            ->materiaPrima
                            ->unidad_medida,

                    'requerido_unitario' =>
                        (float) $detalleReceta
                            ->cantidad,

                    'requerido_total' =>
                        round(
                            (float) $detalleReceta
                                ->cantidad
                            * $cantidadPlanificada,
                            3
                        ),

                    'stock_actual' =>
                        $inventario
                            ? (float) $inventario
                                ->cantidad
                            : 0,

                    'costo_unitario' =>
                        (float) $detalleReceta
                            ->materiaPrima
                            ->costo_unitario,
                ];
            }
        }

        return response()->json([
            'produccion' =>
                $produccion,

            'receta' =>
                $receta,

            'insumos' =>
                $insumos,
        ]);
    }

    /**
     * Cambiar estado de la orden.
     *
     * CU16 solamente administra:
     * PROGRAMADA -> EN_PROCESO
     * PROGRAMADA -> CANCELADA
     * EN_PROCESO -> CANCELADA
     *
     * COMPLETADA es responsabilidad de CU17.
     */
    public function updateEstado(
        Request $request,
        int $id
    ): JsonResponse {
        $request->validate([
            'estado' => [
                'required',
                'string',
                'in:EN_PROCESO,CANCELADA,COMPLETADA',
            ],
        ]);

        $resultado = DB::transaction(
            function () use ($request, $id) {
                $produccion =
                    Produccion::query()
                        ->lockForUpdate()
                        ->find($id);

                if (!$produccion) {
                    abort(
                        404,
                        'Orden de producción no encontrada.'
                    );
                }

                if (
                    in_array(
                        $produccion->estado,
                        [
                            'COMPLETADA',
                            'CANCELADA',
                        ],
                        true
                    )
                ) {
                    abort(
                        409,
                        'La orden se encuentra en un estado final y no puede modificarse.'
                    );
                }

                $nuevoEstado =
                    $request->input('estado');

                /*
                 * CU17 es quien completa realmente
                 * la producción.
                 */
                if (
                    $nuevoEstado
                    === 'COMPLETADA'
                ) {
                    abort(
                        409,
                        'Para completar la producción debe registrar primero el consumo, costo, desperdicio y unidades buenas.'
                    );
                }

                $transiciones = [
                    'PROGRAMADA' => [
                        'EN_PROCESO',
                        'CANCELADA',
                    ],

                    'EN_PROCESO' => [
                        'CANCELADA',
                    ],
                ];

                if (
                    !isset(
                        $transiciones[
                            $produccion->estado
                        ]
                    )
                    || !in_array(
                        $nuevoEstado,
                        $transiciones[
                            $produccion->estado
                        ],
                        true
                    )
                ) {
                    abort(
                        422,
                        'Transición de estado no permitida.'
                    );
                }

                $produccion->estado =
                    $nuevoEstado;

                $produccion->save();

                $produccion->load([
                    'productoPresentacion.producto',
                    'productoPresentacion.presentacion',
                    'usuario',
                    'detalles.almacen',
                ]);

                return $produccion;
            }
        );

        return response()->json([
            'message' =>
                $resultado->estado
                === 'EN_PROCESO'
                    ? 'Orden de producción iniciada correctamente.'
                    : 'Orden de producción cancelada correctamente.',

            'produccion' =>
                $resultado,
        ]);
    }
}