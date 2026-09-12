<?php

namespace App\Http\Controllers\Api\Produccion;

use App\Http\Controllers\Controller;
use App\Http\Requests\Produccion\RegistrarConsumoProduccionRequest;
use App\Models\Almacen;
use App\Models\ConsumoProduccion;
use App\Models\DetalleEgreso;
use App\Models\Inventario;
use App\Models\Produccion;
use App\Models\Receta;
use App\Models\Egreso;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ConsumoProduccionController extends Controller
{
    /**
     * Obtener información necesaria para registrar
     * el consumo de una producción.
     */
    public function show(int $id): JsonResponse
    {
        $produccion = Produccion::with([
            'productoPresentacion.producto',
            'productoPresentacion.presentacion',
            'detalles',
            'consumos.materiaPrima',
            'consumos.almacen',
            'consumos.usuario',
        ])->find($id);

        if (!$produccion) {
            return response()->json([
                'message' => 'Orden de producción no encontrada.',
            ], 404);
        }

        $detalleProduccion = $produccion->detalles->first();

        if (!$detalleProduccion) {
            return response()->json([
                'message' =>
                    'La producción no tiene un detalle asociado.',
            ], 422);
        }

        $receta = Receta::with('detalles.materiaPrima')
            ->where(
                'id_producto_presentacion',
                $produccion->id_producto_presentacion
            )
            ->first();

        if (!$receta) {
            return response()->json([
                'message' =>
                    'La presentación no tiene una receta asociada.',
            ], 422);
        }

        $almacenMateriasPrimas = Almacen::where(
            'nombre',
            'Materias Primas'
        )->first();

        if (!$almacenMateriasPrimas) {
            return response()->json([
                'message' =>
                    'El almacén de Materias Primas no está configurado.',
            ], 500);
        }

        $cantidadPlanificada =
            (float) $detalleProduccion->cantidad_esperada;

        $materiasPrimas = [];

        foreach ($receta->detalles as $detalleReceta) {
            $materiaPrima = $detalleReceta->materiaPrima;

            $cantidadTeorica =
                (float) $detalleReceta->cantidad
                * $cantidadPlanificada;

            $inventario = Inventario::query()
                ->where(
                    'id_almacen',
                    $almacenMateriasPrimas->id_almacen
                )
                ->where(
                    'id_materia_prima',
                    $detalleReceta->id_materia_prima
                )
                ->first();

            $materiasPrimas[] = [
                'id_materia_prima' =>
                    $materiaPrima->id_materia_prima,

                'nombre' =>
                    $materiaPrima->nombre,

                'unidad_medida' =>
                    $materiaPrima->unidad_medida,

                'cantidad_teorica' =>
                    round($cantidadTeorica, 3),

                'stock_actual' =>
                    $inventario
                        ? (float) $inventario->cantidad
                        : 0,

                'costo_unitario' =>
                    (float) $materiaPrima->costo_unitario,
            ];
        }

        return response()->json([
            'produccion' => $produccion,

            'cantidad_planificada' =>
                $cantidadPlanificada,

            'materias_primas' =>
                $materiasPrimas,
        ]);
    }

    /**
     * Registrar consumo real, desperdicio,
     * costo y unidades buenas.
     */
    public function store(
        RegistrarConsumoProduccionRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $resultado = DB::transaction(
            function () use ($request, $datos, $id) {
                $produccion = Produccion::query()
                    ->with('detalles')
                    ->lockForUpdate()
                    ->find($id);

                if (!$produccion) {
                    abort(
                        404,
                        'Orden de producción no encontrada.'
                    );
                }

                if ($produccion->estado !== 'EN_PROCESO') {
                    abort(
                        409,
                        'Solo se puede registrar el consumo de una producción EN_PROCESO.'
                    );
                }

                $yaRegistrado = ConsumoProduccion::query()
                    ->where(
                        'id_produccion',
                        $produccion->id_produccion
                    )
                    ->exists();

                if ($yaRegistrado) {
                    abort(
                        409,
                        'El consumo de esta producción ya fue registrado.'
                    );
                }

                $detalleProduccion =
                    $produccion->detalles->first();

                if (!$detalleProduccion) {
                    abort(
                        422,
                        'La producción no tiene detalle registrado.'
                    );
                }

                $receta = Receta::with(
                    'detalles.materiaPrima'
                )
                    ->where(
                        'id_producto_presentacion',
                        $produccion->id_producto_presentacion
                    )
                    ->first();

                if (!$receta) {
                    abort(
                        422,
                        'La presentación no tiene receta asociada.'
                    );
                }

                $almacenMateriasPrimas =
                    Almacen::where(
                        'nombre',
                        'Materias Primas'
                    )->first();

                $almacenProduccion =
                    Almacen::where(
                        'nombre',
                        'Producción'
                    )->first();

                if (!$almacenMateriasPrimas) {
                    abort(
                        500,
                        'El almacén de Materias Primas no está configurado.'
                    );
                }

                if (!$almacenProduccion) {
                    abort(
                        500,
                        'El almacén de Producción no está configurado.'
                    );
                }

                $consumosIngresados = collect(
                    $datos['consumos']
                )->keyBy('id_materia_prima');

                /*
                 * CU17 debe recibir exactamente las materias
                 * primas de la receta.
                 */
                $idsReceta = $receta->detalles
                    ->pluck('id_materia_prima')
                    ->map(fn ($id) => (int) $id)
                    ->sort()
                    ->values()
                    ->all();

                $idsIngresados = $consumosIngresados
                    ->keys()
                    ->map(fn ($id) => (int) $id)
                    ->sort()
                    ->values()
                    ->all();

                if ($idsReceta !== $idsIngresados) {
                    abort(
                        422,
                        'Debe registrar exactamente las materias primas definidas en la receta.'
                    );
                }

                $cantidadPlanificada =
                    (float) $detalleProduccion
                        ->cantidad_esperada;

                /*
                 * Primero bloqueamos y validamos todos
                 * los inventarios antes de generar movimientos.
                 */
                $inventarios = [];
                $datosCalculados = [];

                foreach (
                    $receta->detalles as $detalleReceta
                ) {
                    $idMateriaPrima =
                        (int) $detalleReceta
                            ->id_materia_prima;

                    $entrada =
                        $consumosIngresados
                            ->get($idMateriaPrima);

                    $cantidadConsumida = round(
                        (float) $entrada[
                            'cantidad_consumida'
                        ],
                        3
                    );

                    $cantidadDesperdicio = round(
                        (float) $entrada[
                            'cantidad_desperdicio'
                        ],
                        3
                    );

                    $cantidadSalida = round(
                        $cantidadConsumida
                        + $cantidadDesperdicio,
                        3
                    );

                    if ($cantidadSalida <= 0) {
                        abort(
                            422,
                            'La salida total de cada materia prima debe ser mayor a cero.'
                        );
                    }

                    $cantidadTeorica = round(
                        (float) $detalleReceta->cantidad
                        * $cantidadPlanificada,
                        3
                    );

                    $materiaPrima =
                        $detalleReceta->materiaPrima;

                    $costoUnitario = round(
                        (float) $materiaPrima
                            ->costo_unitario,
                        4
                    );

                    if ($costoUnitario <= 0) {
                        abort(
                            422,
                            'Debe configurar el costo unitario de la materia prima: '
                            . $materiaPrima->nombre
                            . '.'
                        );
                    }

                    $inventario = Inventario::query()
                        ->where(
                            'id_almacen',
                            $almacenMateriasPrimas
                                ->id_almacen
                        )
                        ->where(
                            'id_materia_prima',
                            $idMateriaPrima
                        )
                        ->lockForUpdate()
                        ->first();

                    $stockActual = $inventario
                        ? (float) $inventario->cantidad
                        : 0;

                    if (
                        !$inventario
                        || $stockActual < $cantidadSalida
                    ) {
                        abort(
                            422,
                            'Stock insuficiente de '
                            . $materiaPrima->nombre
                            . '. Requerido: '
                            . $cantidadSalida
                            . ', disponible: '
                            . $stockActual
                            . '.'
                        );
                    }

                    $costoTotal = round(
                        $cantidadSalida
                        * $costoUnitario,
                        4
                    );

                    $inventarios[
                        $idMateriaPrima
                    ] = $inventario;

                    $datosCalculados[] = [
                        'detalle_receta' =>
                            $detalleReceta,

                        'id_materia_prima' =>
                            $idMateriaPrima,

                        'cantidad_teorica' =>
                            $cantidadTeorica,

                        'cantidad_consumida' =>
                            $cantidadConsumida,

                        'cantidad_desperdicio' =>
                            $cantidadDesperdicio,

                        'cantidad_salida' =>
                            $cantidadSalida,

                        'costo_unitario' =>
                            $costoUnitario,

                        'costo_total' =>
                            $costoTotal,

                        'observaciones' =>
                            $entrada[
                                'observaciones'
                            ] ?? null,
                    ];
                }

                /*
                 * Egreso físico de materias primas.
                 */
                $egreso = Egreso::create([
                    'fecha_egreso' => now(),
                    'glosa' =>
                        'Consumo real producción #'
                        . $produccion->id_produccion,
                    'id_usuario' =>
                        $request->user()->id_usuario,
                ]);

                $costoProduccion = 0;

                foreach ($datosCalculados as $dato) {
                    ConsumoProduccion::create([
                        'id_produccion' =>
                            $produccion->id_produccion,

                        'id_materia_prima' =>
                            $dato['id_materia_prima'],

                        'id_almacen' =>
                            $almacenMateriasPrimas
                                ->id_almacen,

                        'id_usuario' =>
                            $request->user()->id_usuario,

                        'cantidad_teorica' =>
                            $dato['cantidad_teorica'],

                        'cantidad_consumida' =>
                            $dato['cantidad_consumida'],

                        'cantidad_desperdicio' =>
                            $dato[
                                'cantidad_desperdicio'
                            ],

                        'costo_unitario' =>
                            $dato['costo_unitario'],

                        'costo_total' =>
                            $dato['costo_total'],

                        'observaciones' =>
                            $dato['observaciones'],

                        'fecha_registro' =>
                            now(),
                    ]);

                    DetalleEgreso::create([
                        'id_egreso' =>
                            $egreso->id_egreso,

                        'id_almacen' =>
                            $almacenMateriasPrimas
                                ->id_almacen,

                        'id_producto_presentacion' =>
                            null,

                        'id_materia_prima' =>
                            $dato['id_materia_prima'],

                        'cantidad' =>
                            $dato['cantidad_salida'],
                    ]);

                    $inventario =
                        $inventarios[
                            $dato['id_materia_prima']
                        ];

                    $inventario->cantidad = round(
                        (float) $inventario->cantidad
                        - $dato['cantidad_salida'],
                        3
                    );

                    $inventario->ultima_actualizacion =
                        now();

                    $inventario->save();

                    $costoProduccion +=
                        $dato['costo_total'];
                }

                /*
                 * Registrar las unidades buenas en el
                 * almacén Producción.
                 *
                 * Utilizamos las tablas de ingreso ya
                 * existentes sin duplicar movimientos.
                 */
$idIngreso = DB::table('ingreso')->insertGetId([
    'fecha_ingreso' => now(),
    'glosa' => 'Producto terminado producción #' . $produccion->id_produccion,
    'id_usuario' => $request->user()->id_usuario,
    'created_at' => now(),
    'updated_at' => now(),
], 'id_ingreso');

                DB::table('detalle_ingreso')->insert([
                    'id_ingreso' =>
                        $idIngreso,

                    'id_almacen' =>
                        $almacenProduccion->id_almacen,

                    'id_producto_presentacion' =>
                        $produccion
                            ->id_producto_presentacion,

                    'id_materia_prima' =>
                        null,

                    'cantidad' =>
                        $datos['unidades_buenas'],

                    'created_at' =>
                        now(),

                    'updated_at' =>
                        now(),
                ]);

                $inventarioProducto =
                    Inventario::query()
                        ->where(
                            'id_almacen',
                            $almacenProduccion
                                ->id_almacen
                        )
                        ->where(
                            'id_producto_presentacion',
                            $produccion
                                ->id_producto_presentacion
                        )
                        ->whereNull(
                            'id_materia_prima'
                        )
                        ->lockForUpdate()
                        ->first();

                if ($inventarioProducto) {
                    $inventarioProducto->cantidad =
                        (float) $inventarioProducto
                            ->cantidad
                        + (int) $datos[
                            'unidades_buenas'
                        ];

                    $inventarioProducto
                        ->ultima_actualizacion =
                            now();

                    $inventarioProducto->save();
                } else {
                    Inventario::create([
                        'id_almacen' =>
                            $almacenProduccion
                                ->id_almacen,

                        'id_producto_presentacion' =>
                            $produccion
                                ->id_producto_presentacion,

                        'id_materia_prima' =>
                            null,

                        'cantidad' =>
                            $datos[
                                'unidades_buenas'
                            ],

                        'ultima_actualizacion' =>
                            now(),
                    ]);
                }

                /*
                 * Solo las unidades buenas se registran
                 * como producto terminado.
                 */
                $detalleProduccion
                    ->cantidad_producida =
                        $datos['unidades_buenas'];

                $detalleProduccion->save();

                $produccion->estado =
                    'COMPLETADA';

                if (
                    !empty(
                        $datos['observaciones']
                    )
                ) {
                    $produccion->observaciones =
                        $datos['observaciones'];
                }

                $produccion->save();

                $produccion->load([
                    'productoPresentacion.producto',
                    'productoPresentacion.presentacion',
                    'detalles.almacen',
                    'consumos.materiaPrima',
                    'consumos.almacen',
                    'consumos.usuario',
                ]);

                return [
                    'produccion' =>
                        $produccion,

                    'costo_total_produccion' =>
                        round(
                            $costoProduccion,
                            4
                        ),

                    'id_egreso' =>
                        $egreso->id_egreso,

                    'id_ingreso' =>
                        $idIngreso,
                ];
            }
        );

        return response()->json([
            'message' =>
                'Consumo, costo y desperdicio registrados correctamente.',

            'produccion' =>
                $resultado['produccion'],

            'costo_total_produccion' =>
                $resultado[
                    'costo_total_produccion'
                ],

            'id_egreso' =>
                $resultado['id_egreso'],

            'id_ingreso' =>
                $resultado['id_ingreso'],
        ], 201);
    }
}