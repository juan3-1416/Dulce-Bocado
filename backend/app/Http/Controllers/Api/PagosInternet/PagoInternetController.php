<?php

namespace App\Http\Controllers\Api\PagosInternet;

use App\Http\Controllers\Controller;
use App\Http\Requests\PagosInternet\ConfirmarPagoInternetRequest;
use App\Http\Requests\PagosInternet\StorePagoInternetRequest;
use App\Models\Pago;
use App\Models\PagoInternet;
use App\Models\Venta;
use App\Services\PagosInternet\PasarelaPagoSimulada;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PagoInternetController extends Controller
{
    public function __construct(
        private readonly PasarelaPagoSimulada $pasarela
    ) {
    }

    /*
    |--------------------------------------------------------------------------
    | Listar transacciones online
    |--------------------------------------------------------------------------
    */
    public function index(Request $request): JsonResponse
    {
        $transacciones = PagoInternet::query()
            ->with([
                'venta.cliente',
                'usuario',
                'pago',
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
                $request->filled('buscar'),
                function ($query) use ($request) {
                    $buscar = '%' .
                        $request->string('buscar')->toString() .
                        '%';

                    $query->where(
                        function ($subQuery) use ($buscar) {
                            $subQuery
                                ->where(
                                    'referencia_transaccion',
                                    'ILIKE',
                                    $buscar
                                )
                                ->orWhere(
                                    'proveedor',
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
            ->orderByDesc('fecha_solicitud')
            ->orderByDesc('id_pago_internet')
            ->get();

        return response()->json([
            'transacciones' => $transacciones,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Consultar una transacción
    |--------------------------------------------------------------------------
    */
    public function show(int $id): JsonResponse
    {
        $transaccion = PagoInternet::query()
            ->with([
                'venta.cliente',
                'venta.detalles.productoPresentacion.producto',
                'venta.detalles.productoPresentacion.presentacion',
                'usuario',
                'pago.usuario',
            ])
            ->find($id);

        if (!$transaccion) {
            return response()->json([
                'message' =>
                    'Transacción de pago por internet no encontrada.',
            ], 404);
        }

        return response()->json([
            'transaccion' =>
                $transaccion,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Catálogo de ventas disponibles
    |--------------------------------------------------------------------------
    |
    | Solo aparecen ventas:
    | - REGISTRADAS
    | - con saldo pendiente
    | - sin otra transacción online PENDIENTE
    |--------------------------------------------------------------------------
    */
    public function catalogos(): JsonResponse
    {
        $ventas = Venta::query()
            ->with('cliente')
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
            ->whereDoesntHave(
                'pagosInternet',
                fn ($query) =>
                    $query->where(
                        'estado',
                        'PENDIENTE'
                    )
            )
            ->orderByDesc('fecha_venta')
            ->get()
            ->map(function ($venta) {
                $total = round(
                    (float) $venta->total,
                    2
                );

                $pagado = round(
                    (float) (
                        $venta->total_pagado ?? 0
                    ),
                    2
                );

                $saldo = round(
                    $total - $pagado,
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
                            $pagado,
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
                ];
            })
            ->filter(
                fn ($venta) =>
                    (float) $venta['saldo'] > 0
            )
            ->values();

        return response()->json([
            'ventas' => $ventas,

            'proveedor' =>
                PasarelaPagoSimulada::PROVEEDOR,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Iniciar pago por internet
    |--------------------------------------------------------------------------
    */
    public function store(
        StorePagoInternetRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $transaccion = DB::transaction(
            function () use ($datos, $request) {
                /*
                 * Bloqueamos la venta para evitar que dos
                 * operaciones financieras se inicien al mismo tiempo.
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
                            'No se puede iniciar un pago sobre una venta anulada.',
                    ]);
                }

                /*
                 * Solo permitimos una transacción online
                 * PENDIENTE por venta.
                 */
                $existePendiente =
                    $venta
                        ->pagosInternet()
                        ->where(
                            'estado',
                            'PENDIENTE'
                        )
                        ->exists();

                if ($existePendiente) {
                    abort(
                        409,
                        'La venta ya tiene una transacción de pago por internet pendiente.'
                    );
                }

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

                /*
                 * Solicitud al proveedor simulado.
                 */
                $respuesta =
                    $this->pasarela->iniciar(
                        $venta->id_venta,
                        $monto
                    );

                return PagoInternet::create([
                    'id_venta' =>
                        $venta->id_venta,

                    'id_pago' =>
                        null,

                    'id_usuario' =>
                        $request->user()->getKey(),

                    'monto' =>
                        $monto,

                    'proveedor' =>
                        $respuesta['proveedor'],

                    'referencia_transaccion' =>
                        $respuesta[
                            'referencia_transaccion'
                        ],

                    'estado' =>
                        'PENDIENTE',

                    'motivo_rechazo' =>
                        null,

                    'respuesta_proveedor' =>
                        $respuesta[
                            'respuesta_proveedor'
                        ],

                    'fecha_solicitud' =>
                        now(),

                    'fecha_confirmacion' =>
                        null,
                ]);
            }
        );

        $transaccion->load([
            'venta.cliente',
            'usuario',
        ]);

        return response()->json([
            'message' =>
                'Pago por internet iniciado correctamente.',

            'transaccion' =>
                $transaccion,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Confirmar resultado del proveedor
    |--------------------------------------------------------------------------
    |
    | En producción esta operación normalmente sería realizada
    | a partir de la respuesta segura de una pasarela/webhook.
    |
    | En CU12 se simula manualmente APROBADO o RECHAZADO.
    |--------------------------------------------------------------------------
    */
    public function confirmar(
        ConfirmarPagoInternetRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $transaccion = DB::transaction(
            function () use (
                $datos,
                $request,
                $id
            ) {
                $transaccion =
                    PagoInternet::query()
                        ->lockForUpdate()
                        ->find($id);

                if (!$transaccion) {
                    abort(
                        404,
                        'Transacción de pago por internet no encontrada.'
                    );
                }

                if (
                    $transaccion->estado !==
                    'PENDIENTE'
                ) {
                    abort(
                        409,
                        'La transacción ya fue confirmada y no puede procesarse nuevamente.'
                    );
                }

                /*
                 * Bloqueamos también la venta.
                 */
                $venta = Venta::query()
                    ->lockForUpdate()
                    ->find(
                        $transaccion->id_venta
                    );

                if (!$venta) {
                    abort(
                        404,
                        'La venta asociada ya no existe.'
                    );
                }

                /*
                 * Obtener respuesta simulada del proveedor.
                 */
                $respuesta =
                    $this->pasarela->confirmar(
                        $datos['resultado'],
                        $datos[
                            'motivo_rechazo'
                        ] ?? null
                    );

                /*
                |--------------------------------------------------------------------------
                | RECHAZADO
                |--------------------------------------------------------------------------
                */
                if (
                    $respuesta['estado'] ===
                    'RECHAZADO'
                ) {
                    $transaccion->update([
                        'estado' =>
                            'RECHAZADO',

                        'id_pago' =>
                            null,

                        'motivo_rechazo' =>
                            $respuesta[
                                'motivo_rechazo'
                            ],

                        'respuesta_proveedor' =>
                            $respuesta[
                                'respuesta_proveedor'
                            ],

                        'fecha_confirmacion' =>
                            now(),
                    ]);

                    return $transaccion;
                }

                /*
                |--------------------------------------------------------------------------
                | APROBADO
                |--------------------------------------------------------------------------
                */

                if (
                    $venta->estado !==
                    'REGISTRADA'
                ) {
                    abort(
                        409,
                        'La venta ya no se encuentra registrada y el pago no puede aprobarse.'
                    );
                }

                /*
                 * Recalculamos el saldo EN EL MOMENTO
                 * de la aprobación.
                 *
                 * Nunca confiamos solamente en el saldo
                 * existente cuando se inició la operación.
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

                $monto = round(
                    (float) $transaccion->monto,
                    2
                );

                if ($saldo <= 0) {
                    abort(
                        409,
                        'La venta ya se encuentra completamente pagada y la transacción no puede aprobarse.'
                    );
                }

                if ($monto > $saldo) {
                    abort(
                        409,
                        'El saldo de la venta cambió desde que se inició la transacción. Saldo actual: Bs ' .
                        number_format(
                            $saldo,
                            2,
                            '.',
                            ''
                        ) .
                        '.'
                    );
                }

                /*
                 * Solo aquí se genera el Pago real.
                 */
                $pago = Pago::create([
                    'id_venta' =>
                        $venta->id_venta,

                    'id_usuario' =>
                        $request->user()->getKey(),

                    'monto' =>
                        $monto,

                    'metodo_pago' =>
                        'ONLINE',

                    'referencia' =>
                        $transaccion
                            ->referencia_transaccion,

                    'estado' =>
                        'REGISTRADO',

                    'observaciones' =>
                        'Pago generado automáticamente desde una transacción por internet.',

                    'fecha_pago' =>
                        now(),
                ]);

                /*
                 * Actualizamos todos los campos requeridos
                 * por el CHECK en una sola operación.
                 */
                $transaccion->update([
                    'estado' =>
                        'APROBADO',

                    'id_pago' =>
                        $pago->id_pago,

                    'motivo_rechazo' =>
                        null,

                    'respuesta_proveedor' =>
                        $respuesta[
                            'respuesta_proveedor'
                        ],

                    'fecha_confirmacion' =>
                        now(),
                ]);

                return $transaccion;
            }
        );

        $transaccion->load([
            'venta.cliente',
            'usuario',
            'pago.usuario',
        ]);

        return response()->json([
            'message' =>
                $transaccion->estado ===
                'APROBADO'
                    ? 'Pago por internet aprobado correctamente.'
                    : 'Pago por internet rechazado correctamente.',

            'transaccion' =>
                $transaccion,

            'resumen_venta' =>
                $this->obtenerResumenVenta(
                    $transaccion->id_venta
                ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Resumen de una venta
    |--------------------------------------------------------------------------
    */
    private function obtenerResumenVenta(
        int $idVenta
    ): array {
        $venta = Venta::query()
            ->findOrFail($idVenta);

        $total = round(
            (float) $venta->total,
            2
        );

        $pagado = round(
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
            $total - $pagado,
            2
        );

        return [
            'id_venta' =>
                $venta->id_venta,

            'total' =>
                number_format(
                    $total,
                    2,
                    '.',
                    ''
                ),

            'total_pagado' =>
                number_format(
                    $pagado,
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