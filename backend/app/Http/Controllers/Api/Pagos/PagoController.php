<?php

namespace App\Http\Controllers\Api\Pagos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pagos\AnularPagoRequest;
use App\Http\Requests\Pagos\StorePagoRequest;
use App\Models\Pago;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PagoController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Listar pagos
    |--------------------------------------------------------------------------
    */
    public function index(Request $request): JsonResponse
    {
        $pagos = Pago::query()
            ->with([
                'venta.cliente',
                'usuario',
                'usuarioAnulacion',
            ])
            ->when(
                $request->filled('estado'),
                fn ($query) =>
                    $query->where(
                        'estado',
                        $request->string('estado')->toString()
                    )
            )
            ->when(
                $request->filled('metodo_pago'),
                fn ($query) =>
                    $query->where(
                        'metodo_pago',
                        $request->string('metodo_pago')->toString()
                    )
            )
            ->when(
                $request->filled('buscar'),
                function ($query) use ($request) {
                    $buscar = '%' .
                        $request->string('buscar')->toString() .
                        '%';

                    $query->where(
                        function ($subQuery) use ($buscar) {
                            $subQuery
                                ->where(
                                    'referencia',
                                    'ILIKE',
                                    $buscar
                                )
                                ->orWhereHas(
                                    'venta',
                                    function ($ventaQuery) use ($buscar) {
                                        $ventaQuery
                                            ->where(
                                                'nombre_cliente_ocasional',
                                                'ILIKE',
                                                $buscar
                                            )
                                            ->orWhereHas(
                                                'cliente',
                                                function ($clienteQuery) use ($buscar) {
                                                    $clienteQuery
                                                        ->where(
                                                            'nombre',
                                                            'ILIKE',
                                                            $buscar
                                                        )
                                                        ->orWhere(
                                                            'apellido',
                                                            'ILIKE',
                                                            $buscar
                                                        )
                                                        ->orWhere(
                                                            'ci_nit',
                                                            'ILIKE',
                                                            $buscar
                                                        );
                                                }
                                            );
                                    }
                                );
                        }
                    );
                }
            )
            ->orderByDesc('fecha_pago')
            ->orderByDesc('id_pago')
            ->get();

        return response()->json([
            'pagos' => $pagos,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Consultar pago
    |--------------------------------------------------------------------------
    */
    public function show(int $id): JsonResponse
    {
        $pago = Pago::query()
            ->with([
                'venta.cliente',
                'venta.detalles.productoPresentacion.producto',
                'venta.detalles.productoPresentacion.presentacion',
                'usuario',
                'usuarioAnulacion',
            ])
            ->find($id);

        if (!$pago) {
            return response()->json([
                'message' => 'Pago no encontrado.',
            ], 404);
        }

        return response()->json([
            'pago' => $pago,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Catálogo de ventas cobrables
    |--------------------------------------------------------------------------
    |
    | Solo aparecen ventas:
    | - REGISTRADAS
    | - con saldo pendiente mayor a cero
    |--------------------------------------------------------------------------
    */
    public function catalogos(): JsonResponse
    {
        $ventas = Venta::query()
            ->with([
                'cliente',
            ])
            ->withSum(
                [
                    'pagos as total_pagado' =>
                        fn ($query) =>
                            $query->where(
                                'estado',
                                'REGISTRADO'
                            ),
                ],
                'monto'
            )
            ->where(
                'estado',
                'REGISTRADA'
            )
            ->orderByDesc('fecha_venta')
            ->get()
            ->map(function ($venta) {
                $total = round(
                    (float) $venta->total,
                    2
                );

                $totalPagado = round(
                    (float) (
                        $venta->total_pagado ?? 0
                    ),
                    2
                );

                $saldo = round(
                    $total - $totalPagado,
                    2
                );

                return [
                    'id_venta' =>
                        $venta->id_venta,

                    'id_cliente' =>
                        $venta->id_cliente,

                    'nombre_cliente_ocasional' =>
                        $venta->nombre_cliente_ocasional,

                    'cliente' =>
                        $venta->cliente,

                    'fecha_venta' =>
                        $venta->fecha_venta,

                    'total' =>
                        number_format(
                            $total,
                            2,
                            '.',
                            ''
                        ),

                    'total_pagado' =>
                        number_format(
                            $totalPagado,
                            2,
                            '.',
                            ''
                        ),

                    'saldo' =>
                        number_format(
                            $saldo,
                            2,
                            '.',
                            ''
                        ),
                ];
            })
            ->filter(
                fn ($venta) =>
                    (float) $venta['saldo'] > 0
            )
            ->values();

        return response()->json([
            'ventas' => $ventas,

            'metodos_pago' => [
                'EFECTIVO',
                'QR',
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Registrar pago
    |--------------------------------------------------------------------------
    */
    public function store(
        StorePagoRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $pago = DB::transaction(
            function () use ($datos, $request) {
                /*
                 * Bloqueamos la venta para serializar
                 * pagos concurrentes sobre la misma venta.
                 */
                $venta = Venta::query()
                    ->lockForUpdate()
                    ->find(
                        $datos['id_venta']
                    );

                if (!$venta) {
                    throw ValidationException::withMessages([
                        'id_venta' =>
                            'La venta seleccionada no existe.',
                    ]);
                }

                if (
                    $venta->estado !==
                    'REGISTRADA'
                ) {
                    throw ValidationException::withMessages([
                        'id_venta' =>
                            'No se pueden registrar pagos sobre una venta anulada.',
                    ]);
                }

                /*
                 * Solo se consideran pagos REGISTRADOS.
                 * Los pagos anulados dejan de afectar el saldo.
                 */
                $totalPagado = round(
                    (float) $venta
                        ->pagos()
                        ->where(
                            'estado',
                            'REGISTRADO'
                        )
                        ->sum('monto'),
                    2
                );

                $totalVenta = round(
                    (float) $venta->total,
                    2
                );

                $saldo = round(
                    $totalVenta -
                    $totalPagado,
                    2
                );

                if ($saldo <= 0) {
                    throw ValidationException::withMessages([
                        'monto' =>
                            'La venta ya se encuentra completamente pagada.',
                    ]);
                }

                $monto = round(
                    (float) $datos['monto'],
                    2
                );

                if ($monto > $saldo) {
                    throw ValidationException::withMessages([
                        'monto' =>
                            'El monto supera el saldo pendiente de la venta. Saldo disponible: Bs ' .
                            number_format(
                                $saldo,
                                2,
                                '.',
                                ''
                            ) .
                            '.',
                    ]);
                }

                return Pago::create([
                    'id_venta' =>
                        $venta->id_venta,

                    'id_usuario' =>
                        $request->user()->getKey(),

                    'monto' =>
                        $monto,

                    'metodo_pago' =>
                        $datos['metodo_pago'],

                    'referencia' =>
                        !empty($datos['referencia'])
                            ? trim(
                                $datos['referencia']
                            )
                            : null,

                    'estado' =>
                        'REGISTRADO',

                    'observaciones' =>
                        $datos['observaciones']
                            ?? null,

                    'fecha_pago' =>
                        now(),
                ]);
            }
        );

        $pago->load([
            'venta.cliente',
            'usuario',
        ]);

        $resumen = $this->obtenerResumenVenta(
            $pago->id_venta
        );

        return response()->json([
            'message' =>
                'Pago registrado correctamente.',

            'pago' =>
                $pago,

            'resumen_venta' =>
                $resumen,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Anular pago
    |--------------------------------------------------------------------------
    |
    | No se edita un pago registrado.
    | Si existe un error, se anula y posteriormente
    | se registra uno nuevo.
    |--------------------------------------------------------------------------
    */
    public function anular(
        AnularPagoRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $pago = DB::transaction(
            function () use (
                $request,
                $datos,
                $id
            ) {
                $pago = Pago::query()
                    ->lockForUpdate()
                    ->find($id);

                if (!$pago) {
                    abort(
                        404,
                        'Pago no encontrado.'
                    );
                }

                /*
                 * También bloqueamos la venta para
                 * serializar la anulación respecto
                 * de otros pagos concurrentes.
                 */
                Venta::query()
                    ->lockForUpdate()
                    ->find($pago->id_venta);

                if (
                    $pago->estado ===
                    'ANULADO'
                ) {
                    abort(
                        409,
                        'El pago ya se encuentra anulado.'
                    );
                }

                $pago->update([
                    'estado' =>
                        'ANULADO',

                    'id_usuario_anulacion' =>
                        $request->user()->getKey(),

                    'motivo_anulacion' =>
                        trim(
                            $datos[
                                'motivo_anulacion'
                            ]
                        ),

                    'fecha_anulacion' =>
                        now(),
                ]);

                return $pago;
            }
        );

        $pago->load([
            'venta.cliente',
            'usuario',
            'usuarioAnulacion',
        ]);

        $resumen = $this->obtenerResumenVenta(
            $pago->id_venta
        );

        return response()->json([
            'message' =>
                'Pago anulado correctamente.',

            'pago' =>
                $pago,

            'resumen_venta' =>
                $resumen,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Resumen financiero de una venta
    |--------------------------------------------------------------------------
    */
    private function obtenerResumenVenta(
        int $idVenta
    ): array {
        $venta = Venta::query()
            ->findOrFail($idVenta);

        $totalVenta = round(
            (float) $venta->total,
            2
        );

        $totalPagado = round(
            (float) $venta
                ->pagos()
                ->where(
                    'estado',
                    'REGISTRADO'
                )
                ->sum('monto'),
            2
        );

        $saldo = round(
            $totalVenta -
            $totalPagado,
            2
        );

        return [
            'id_venta' =>
                $venta->id_venta,

            'total' =>
                number_format(
                    $totalVenta,
                    2,
                    '.',
                    ''
                ),

            'total_pagado' =>
                number_format(
                    $totalPagado,
                    2,
                    '.',
                    ''
                ),

            'saldo' =>
                number_format(
                    max(0, $saldo),
                    2,
                    '.',
                    ''
                ),

            'pagada_completa' =>
                $saldo <= 0,
        ];
    }
}