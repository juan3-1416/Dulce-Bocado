<?php

namespace App\Http\Controllers\Api\PagosInternet;

use App\Http\Controllers\Controller;
use App\Models\Pago;
use App\Models\PagoInternet;
use App\Models\Recibo;
use App\Models\Venta;
use App\Services\PagosInternet\PasarelaLibelula;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Pedido;
class LibelulaAvisoController extends Controller
{
    /**
     * Recibe el aviso público enviado por Libélula.
     *
     * El proveedor envía un GET con parámetros en la URL:
     * - transaction_id
     * - error
     * - message
     * - cancel_order
     * - payment_method
     * - payment_method_id
     * - idqr
     * - monto_total
     */
    public function aviso(Request $request): JsonResponse
    {
        $transactionId =
            trim(
                (string) $request->query(
                    'transaction_id',
                    ''
                )
            );

        $error =
            (string) $request->query(
                'error',
                ''
            );

        $message =
            trim(
                (string) $request->query(
                    'message',
                    ''
                )
            );

        $cancelOrder =
            (string) $request->query(
                'cancel_order',
                ''
            );

        $paymentMethod =
            trim(
                (string) $request->query(
                    'payment_method',
                    ''
                )
            );

        $paymentMethodId =
            trim(
                (string) $request->query(
                    'payment_method_id',
                    ''
                )
            );

        $idQr =
            trim(
                (string) $request->query(
                    'idqr',
                    ''
                )
            );

        $montoTotalRecibido =
            $request->query(
                'monto_total'
            );

        $datosAviso = [
            'transaction_id' =>
                $transactionId,

            'error' =>
                $error,

            'message' =>
                $message,

            'cancel_order' =>
                $cancelOrder,

            'payment_method' =>
                $paymentMethod,

            'payment_method_id' =>
                $paymentMethodId,

            'idqr' =>
                $idQr,

            'monto_total' =>
                $montoTotalRecibido,
        ];

        Log::info(
            'Aviso recibido desde Libélula.',
            [
                'transaction_id' =>
                    $transactionId,

                'error' =>
                    $error,

                'message' =>
                    $message,

                'ip' =>
                    $request->ip(),

                'query' =>
                    $request->query(),
            ]
        );

        /*
         * Sin transaction_id no podemos
         * correlacionar el aviso.
         */
        if ($transactionId === '') {
            Log::warning(
                'Aviso de Libélula sin transaction_id.',
                [
                    'query' =>
                        $request->query(),
                ]
            );

            return response()->json([
                'ok' => false,

                'message' =>
                    'Aviso sin transaction_id.',
            ], 422);
        }

        $resultado = DB::transaction(
            function () use (
                $transactionId,
                $error,
                $message,
                $cancelOrder,
                $montoTotalRecibido,
                $datosAviso
            ) {
                /*
                 * transaction_id contiene la
                 * referencia que Dulce Bocado
                 * envió como identificador al
                 * registrar la deuda.
                 */
                $transaccion =
                    PagoInternet::query()
                        ->lockForUpdate()
                        ->where(
                            'referencia_transaccion',
                            $transactionId
                        )
                        ->where(
                            'proveedor',
                            PasarelaLibelula::PROVEEDOR
                        )
                        ->first();

                if (!$transaccion) {
                    return [
                        'tipo' =>
                            'NO_ENCONTRADA',
                    ];
                }

                /*
                 * Idempotencia.
                 *
                 * Libélula puede enviar el mismo
                 * aviso más de una vez.
                 */
                if (
                    $transaccion->estado ===
                    'APROBADO'
                ) {
                    return [
                        'tipo' =>
                            'YA_APROBADA',

                        'transaccion' =>
                            $transaccion,
                    ];
                }

                if (
                    $transaccion->estado ===
                    'RECHAZADO'
                ) {
                    return [
                        'tipo' =>
                            'YA_RECHAZADA',

                        'transaccion' =>
                            $transaccion,
                    ];
                }

                if (
                    $transaccion->estado ===
                    'VENCIDO'
                ) {
                    return [
                        'tipo' =>
                            'VENCIDA',

                        'transaccion' =>
                            $transaccion,
                    ];
                }

                /*
                 * Si Libélula informa error
                 * o cancelación, rechazamos la
                 * transacción local.
                 */
                $pagoExitoso =
                    $error === '0'
                    && $cancelOrder === '0';

                if (!$pagoExitoso) {
                    $motivo =
                        $message !== ''
                            ? $message
                            : 'Libélula informó que la operación no fue aprobada.';

                    $transaccion->update([
                        'estado' =>
                            'RECHAZADO',

                        'id_pago' =>
                            null,

                        'motivo_rechazo' =>
                            $motivo,

                        'respuesta_proveedor' => [
                            'registro' =>
                                $transaccion
                                    ->respuesta_proveedor,

                            'aviso' =>
                                $datosAviso,
                        ],

                        'fecha_confirmacion' =>
                            now(),
                    ]);

                    return [
                        'tipo' =>
                            'RECHAZADA',

                        'transaccion' =>
                            $transaccion,
                    ];
                }

                /*
                 * El monto informado por Libélula
                 * debe existir y coincidir con el
                 * monto que nosotros registramos.
                 */
                if (
                    $montoTotalRecibido === null
                    || !is_numeric(
                        $montoTotalRecibido
                    )
                ) {
                    return [
                        'tipo' =>
                            'MONTO_INVALIDO',

                        'motivo' =>
                            'Libélula no informó un monto_total válido.',
                    ];
                }

                $montoAviso = round(
                    (float)
                        $montoTotalRecibido,
                    2
                );

                $montoTransaccion = round(
                    (float)
                        $transaccion->monto,
                    2
                );

                if (
                    abs(
                        $montoAviso -
                        $montoTransaccion
                    ) > 0.001
                ) {
                    return [
                        'tipo' =>
                            'MONTO_NO_COINCIDE',

                        'monto_aviso' =>
                            $montoAviso,

                        'monto_esperado' =>
                            $montoTransaccion,
                    ];
                }

/*
 * --------------------------------------------------------------
 * Determinar origen de la transacción.
 * --------------------------------------------------------------
 *
 * Una transacción pertenece exactamente a:
 *
 * - una venta
 * - o un pedido
 */
$esVenta =
    $transaccion->id_venta !== null;

if ($esVenta) {
    $operacion =
        Venta::query()
            ->with('cliente')
            ->lockForUpdate()
            ->find(
                $transaccion->id_venta
            );

    if (!$operacion) {
        return [
            'tipo' =>
                'OPERACION_NO_ENCONTRADA',

            'origen' =>
                'VENTA',
        ];
    }

    /*
     * La venta directa debe seguir pendiente
     * de pago al momento del callback.
     */
    if (
        $operacion->estado !==
        'PENDIENTE_PAGO'
    ) {
        return [
            'tipo' =>
                'OPERACION_INVALIDA',

            'origen' =>
                'VENTA',
        ];
    }
} else {
    $operacion =
        Pedido::query()
            ->with('cliente')
            ->lockForUpdate()
            ->find(
                $transaccion->id_pedido
            );

    if (!$operacion) {
        return [
            'tipo' =>
                'OPERACION_NO_ENCONTRADA',

            'origen' =>
                'PEDIDO',
        ];
    }

    /*
     * Los pedidos pueden recibir pagos
     * mientras estén PROGRAMADOS
     * o EN_PROCESO.
     */
    if (
        !in_array(
            $operacion->estado,
            [
                'PROGRAMADO',
                'EN_PROCESO',
            ],
            true
        )
    ) {
        return [
            'tipo' =>
                'OPERACION_INVALIDA',

            'origen' =>
                'PEDIDO',
        ];
    }
}

/*
 * --------------------------------------------------------------
 * Recalcular saldo en el momento exacto del callback.
 * --------------------------------------------------------------
 *
 * No confiamos en el saldo que existía
 * cuando se generó el QR.
 */
$totalPagado = round(
    (float)
        $operacion
            ->pagos()
            ->where(
                'estado',
                'REGISTRADO'
            )
            ->sum('monto'),
    2
);

$totalOperacion = round(
    (float) $operacion->total,
    2
);

$saldo = round(
    $totalOperacion -
    $totalPagado,
    2
);

if ($saldo <= 0) {
    return [
        'tipo' =>
            'SALDO_INVALIDO',

        'origen' =>
            $esVenta
                ? 'VENTA'
                : 'PEDIDO',

        'saldo' =>
            $saldo,

        'monto' =>
            $montoTransaccion,
    ];
}

/*
 * --------------------------------------------------------------
 * Validar monto según tipo de operación.
 * --------------------------------------------------------------
 *
 * VENTA:
 * pago obligatorio del saldo completo.
 *
 * PEDIDO:
 * permite pagos parciales.
 */
if ($esVenta) {
    if (
        abs(
            $montoTransaccion -
            $saldo
        ) > 0.001
    ) {
        return [
            'tipo' =>
                'SALDO_INVALIDO',

            'origen' =>
                'VENTA',

            'saldo' =>
                $saldo,

            'monto' =>
                $montoTransaccion,
        ];
    }
} else {
    if (
        $montoTransaccion >
        $saldo
    ) {
        return [
            'tipo' =>
                'SALDO_INVALIDO',

            'origen' =>
                'PEDIDO',

            'saldo' =>
                $saldo,

            'monto' =>
                $montoTransaccion,
        ];
    }
}

/*
 * --------------------------------------------------------------
 * Crear Pago real.
 * --------------------------------------------------------------
 */
$pago = Pago::create([
    'id_venta' =>
        $esVenta
            ? $operacion->id_venta
            : null,

    'id_pedido' =>
        $esVenta
            ? null
            : $operacion->id_pedido,

    'id_usuario' =>
        $transaccion
            ->id_usuario,

    'monto' =>
        $montoTransaccion,

    'metodo_pago' =>
        'ONLINE',

    'referencia' =>
        $transaccion
            ->referencia_transaccion,

    'estado' =>
        'REGISTRADO',

    'observaciones' =>
        $esVenta
            ? 'Pago QR de venta confirmado automáticamente mediante aviso de Libélula.'
            : 'Pago QR de pedido confirmado automáticamente mediante aviso de Libélula.',

    'fecha_pago' =>
        now(),
]);

/*
 * --------------------------------------------------------------
 * Datos del cliente para el recibo.
 * --------------------------------------------------------------
 */
if ($operacion->cliente) {
    $nombreCliente = trim(
        ($operacion->cliente
            ->nombre ?? '') .
        ' ' .
        ($operacion->cliente
            ->apellido ?? '')
    );

    if ($nombreCliente === '') {
        $nombreCliente =
            'Cliente ocasional';
    }

    $ciNit =
        $operacion
            ->cliente
            ->ci_nit;
} else {
    $nombreCliente = trim(
        (string) (
            $operacion
                ->nombre_cliente_ocasional
            ?? ''
        )
    );

    if ($nombreCliente === '') {
        $nombreCliente =
            'Cliente ocasional';
    }

    $ciNit = null;
}

/*
 * --------------------------------------------------------------
 * Crear recibo automáticamente.
 * --------------------------------------------------------------
 */
$recibo = Recibo::create([
    'id_pago' =>
        $pago->id_pago,

    'id_usuario_emision' =>
        $transaccion
            ->id_usuario,

    'nombre_cliente' =>
        $nombreCliente,

    'ci_nit_cliente' =>
        $ciNit,

    'monto' =>
        $pago->monto,

    'metodo_pago' =>
        $pago->metodo_pago,

    'referencia_pago' =>
        $pago->referencia,

    'fecha_pago' =>
        $pago->fecha_pago,

    'estado' =>
        'EMITIDO',

    'fecha_emision' =>
        now(),

    'cantidad_impresiones' =>
        0,

    'id_usuario_ultima_impresion' =>
        null,

    'fecha_ultima_impresion' =>
        null,
]);

/*
 * --------------------------------------------------------------
 * Actualizar operación.
 * --------------------------------------------------------------
 *
 * Solo las ventas directas pasan a REGISTRADA.
 *
 * Un pedido NO cambia de estado al pagar:
 *
 * PROGRAMADO → permanece PROGRAMADO
 * EN_PROCESO → permanece EN_PROCESO
 *
 * Su estado se administra mediante CU15.
 */
if ($esVenta) {
    $operacion->update([
        'estado' =>
            'REGISTRADA',
    ]);
}

/*
 * --------------------------------------------------------------
 * Marcar transacción online como aprobada.
 * --------------------------------------------------------------
 */
$transaccion->update([
    'estado' =>
        'APROBADO',

    'id_pago' =>
        $pago->id_pago,

    'motivo_rechazo' =>
        null,

    'respuesta_proveedor' => [
        'registro' =>
            $transaccion
                ->respuesta_proveedor,

        'aviso' =>
            $datosAviso,
    ],

    'fecha_escaneo' =>
        now(),

    'fecha_confirmacion' =>
        now(),
]);

return [
    'tipo' =>
        'APROBADA',

    'origen' =>
        $esVenta
            ? 'VENTA'
            : 'PEDIDO',

    'transaccion' =>
        $transaccion,

    'pago' =>
        $pago,

    'recibo' =>
        $recibo,
];
            }
        );

        switch (
            $resultado['tipo']
        ) {
            case 'NO_ENCONTRADA':
                Log::warning(
                    'Aviso de Libélula sin transacción local asociada.',
                    [
                        'transaction_id' =>
                            $transactionId,
                    ]
                );

                return response()->json([
                    'ok' => false,

                    'message' =>
                        'Transacción no encontrada.',
                ], 404);

            case 'YA_APROBADA':
                return response()->json([
                    'ok' => true,

                    'message' =>
                        'La transacción ya había sido aprobada.',

                    'estado' =>
                        'APROBADO',
                ]);

            case 'YA_RECHAZADA':
                return response()->json([
                    'ok' => true,

                    'message' =>
                        'La transacción ya había sido rechazada.',

                    'estado' =>
                        'RECHAZADO',
                ]);

            case 'VENCIDA':
                return response()->json([
                    'ok' => true,

                    'message' =>
                        'La transacción se encuentra vencida.',

                    'estado' =>
                        'VENCIDO',
                ]);

            case 'RECHAZADA':
                return response()->json([
                    'ok' => true,

                    'message' =>
                        'El aviso fue procesado y la transacción fue rechazada.',

                    'estado' =>
                        'RECHAZADO',
                ]);

            case 'MONTO_INVALIDO':
                Log::error(
                    'Aviso de Libélula con monto inválido.',
                    [
                        'transaction_id' =>
                            $transactionId,

                        'motivo' =>
                            $resultado[
                                'motivo'
                            ],
                    ]
                );

                return response()->json([
                    'ok' => false,

                    'message' =>
                        $resultado[
                            'motivo'
                        ],
                ], 409);

            case 'MONTO_NO_COINCIDE':
                Log::error(
                    'El monto del aviso de Libélula no coincide con la transacción local.',
                    [
                        'transaction_id' =>
                            $transactionId,

                        'monto_aviso' =>
                            $resultado[
                                'monto_aviso'
                            ],

                        'monto_esperado' =>
                            $resultado[
                                'monto_esperado'
                            ],
                    ]
                );

                return response()->json([
                    'ok' => false,

                    'message' =>
                        'El monto informado por Libélula no coincide con la transacción.',
                ], 409);

case 'OPERACION_NO_ENCONTRADA':
    $origen =
        $resultado['origen'] ??
        'OPERACION';

    Log::error(
        'La operación asociada al aviso de Libélula no existe.',
        [
            'transaction_id' =>
                $transactionId,

            'origen' =>
                $origen,
        ]
    );

    return response()->json([
        'ok' => false,

        'message' =>
            $origen === 'PEDIDO'
                ? 'El pedido asociado no existe.'
                : 'La venta asociada no existe.',
    ], 409);

case 'OPERACION_INVALIDA':
    $origen =
        $resultado['origen'] ??
        'OPERACION';

    Log::error(
        'La operación asociada al aviso de Libélula no está disponible.',
        [
            'transaction_id' =>
                $transactionId,

            'origen' =>
                $origen,
        ]
    );

    return response()->json([
        'ok' => false,

        'message' =>
            $origen === 'PEDIDO'
                ? 'El pedido asociado no está disponible para recibir el pago.'
                : 'La venta asociada no está disponible para recibir el pago.',
    ], 409);

case 'SALDO_INVALIDO':
    $origen =
        $resultado['origen'] ??
        'OPERACION';

    Log::error(
        'El saldo de la operación cambió antes del aviso de Libélula.',
        [
            'transaction_id' =>
                $transactionId,

            'origen' =>
                $origen,

            'saldo' =>
                $resultado['saldo'],

            'monto' =>
                $resultado['monto'],
        ]
    );

    return response()->json([
        'ok' => false,

        'message' =>
            $origen === 'PEDIDO'
                ? 'El saldo actual del pedido no permite registrar automáticamente este pago.'
                : 'El saldo actual de la venta no permite registrar automáticamente este pago.',
    ], 409);

            default:
                return response()->json([
                    'ok' => true,

                    'message' =>
                        'Aviso de Libélula procesado correctamente.',

                    'estado' =>
                        'APROBADO',

                    'id_pago' =>
                        $resultado[
                            'pago'
                        ]->id_pago,

                    'id_recibo' =>
                        $resultado[
                            'recibo'
                        ]->id_recibo,
                ]);
        }
    }
}
