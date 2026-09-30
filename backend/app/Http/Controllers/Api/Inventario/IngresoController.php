<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventario\StoreIngresoRequest;
use App\Models\DetalleIngreso;
use App\Models\Ingreso;
use App\Models\Inventario;
use App\Models\MateriaPrima;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IngresoController extends Controller
{
    /**
     * Listar todos los ingresos.
     */
    public function index(Request $request): JsonResponse
    {
        $ingresos = Ingreso::with(
            'usuario:id_usuario,nombre'
        )
            ->orderBy('fecha_ingreso', 'desc')
            ->get();

        return response()->json($ingresos);
    }

    /**
     * Registrar un nuevo ingreso de inventario.
     */
    public function store(
        StoreIngresoRequest $request
    ): JsonResponse {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            /*
             * 1. Crear cabecera del ingreso.
             */
            $ingreso = Ingreso::create([
                'fecha_ingreso' => now(),
                'glosa' => $validated['glosa'],
                'id_usuario' =>
                    $request->user()->id_usuario,
            ]);

            /*
             * 2. Procesar cada detalle.
             */
            foreach (
                $validated['detalles'] as $detalle
            ) {
                $esMateriaPrima =
                    !empty(
                        $detalle[
                            'id_materia_prima'
                        ]
                    );

                /*
                 * Buscar la existencia actual y bloquearla
                 * durante la transacción.
                 */
                $inventarioQuery =
                    Inventario::where(
                        'id_almacen',
                        $detalle['id_almacen']
                    );

                if ($esMateriaPrima) {
                    $inventarioQuery
                        ->where(
                            'id_materia_prima',
                            $detalle[
                                'id_materia_prima'
                            ]
                        )
                        ->whereNull(
                            'id_producto_presentacion'
                        );
                } else {
                    $inventarioQuery
                        ->where(
                            'id_producto_presentacion',
                            $detalle[
                                'id_producto_presentacion'
                            ]
                        )
                        ->whereNull(
                            'id_materia_prima'
                        );
                }

                $inventario =
                    $inventarioQuery
                        ->lockForUpdate()
                        ->first();

                $precioUnitario = null;
                $costoTotal = null;

                /*
                 * Si es materia prima:
                 *
                 * - calcular precio unitario del ingreso;
                 * - calcular nuevo costo promedio ponderado;
                 * - actualizar costo_unitario de la
                 *   materia prima.
                 */
                if ($esMateriaPrima) {
                    $materiaPrima =
                        MateriaPrima::where(
                            'id_materia_prima',
                            $detalle[
                                'id_materia_prima'
                            ]
                        )
                            ->lockForUpdate()
                            ->firstOrFail();

                    $cantidadIngreso =
                        (float) $detalle[
                            'cantidad'
                        ];

                    $costoTotal =
                        (float) $detalle[
                            'costo_total'
                        ];

                    /*
                     * Precio correspondiente solamente
                     * a este ingreso.
                     */
                    $precioUnitario =
                        $costoTotal /
                        $cantidadIngreso;

                    /*
                     * Datos anteriores.
                     */
                    $stockAnterior =
                        $inventario
                            ? (float)
                                $inventario
                                    ->cantidad
                            : 0;

                    $costoAnterior =
                        (float)
                            $materiaPrima
                                ->costo_unitario;

                    $nuevoStock =
                        $stockAnterior +
                        $cantidadIngreso;

                    /*
                     * Promedio ponderado:
                     *
                     * (stock anterior × costo anterior
                     *  + costo del nuevo ingreso)
                     * / nuevo stock
                     */
                    $nuevoCostoPromedio =
                        (
                            (
                                $stockAnterior *
                                $costoAnterior
                            ) +
                            $costoTotal
                        ) /
                        $nuevoStock;

                    $materiaPrima
                        ->costo_unitario =
                        round(
                            $nuevoCostoPromedio,
                            4
                        );

                    $materiaPrima->save();
                }

                /*
                 * 3. Guardar historial del ingreso.
                 */
                DetalleIngreso::create([
                    'id_ingreso' =>
                        $ingreso->id_ingreso,

                    'id_almacen' =>
                        $detalle['id_almacen'],

                    'id_producto_presentacion' =>
                        $detalle[
                            'id_producto_presentacion'
                        ] ?? null,

                    'id_materia_prima' =>
                        $detalle[
                            'id_materia_prima'
                        ] ?? null,

                    'cantidad' =>
                        $detalle['cantidad'],

                    'precio_unitario' =>
                        $precioUnitario !== null
                            ? round(
                                $precioUnitario,
                                4
                            )
                            : null,

                    'costo_total' =>
                        $costoTotal !== null
                            ? round(
                                $costoTotal,
                                2
                            )
                            : null,
                ]);

                /*
                 * 4. Actualizar inventario.
                 */
                if ($inventario) {
                    $inventario->cantidad =
                        (float)
                            $inventario
                                ->cantidad +
                        (float)
                            $detalle[
                                'cantidad'
                            ];

                    $inventario
                        ->ultima_actualizacion =
                        now();

                    $inventario->save();
                } else {
                    Inventario::create([
                        'id_almacen' =>
                            $detalle[
                                'id_almacen'
                            ],

                        'id_producto_presentacion' =>
                            $detalle[
                                'id_producto_presentacion'
                            ] ?? null,

                        'id_materia_prima' =>
                            $detalle[
                                'id_materia_prima'
                            ] ?? null,

                        'cantidad' =>
                            $detalle[
                                'cantidad'
                            ],

                        'ultima_actualizacion' =>
                            now(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' =>
                    'Ingreso de inventario registrado correctamente.',

                'ingreso' =>
                    $ingreso->load(
                        'detalles'
                    ),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' =>
                    'Error al registrar el ingreso.',

                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener el detalle de un ingreso.
     */
    public function show(int $id): JsonResponse
    {
        $ingreso = Ingreso::with([
            'usuario:id_usuario,nombre',
            'detalles.almacen',
            'detalles.productoPresentacion.producto',
            'detalles.materiaPrima',
        ])->findOrFail($id);

        return response()->json($ingreso);
    }
}