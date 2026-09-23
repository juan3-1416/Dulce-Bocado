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
                 * Bloqueamos también la venta.
                 */
                $venta =
                    Venta::query()
                        ->with('cliente')
                        ->lockForUpdate()
                        ->find(
                            $transaccion
                                ->id_venta
                        );

                if (!$venta) {
                    return [
                        'tipo' =>
                            'VENTA_NO_ENCONTRADA',
                    ];
                }

                if (
                    $venta->estado !==
                    'REGISTRADA'
                ) {
                    return [
                        'tipo' =>
                            'VENTA_INVALIDA',
                    ];
                }

                /*
                 * Recalculamos el saldo justo
                 * cuando recibimos el aviso.
                 */
                $totalPagado = round(
                    (float)
                        $venta
                            ->pagos()
                            ->where(
                                'estado',
                                'REGISTRADO'
                            )
                            ->sum('monto'),
                    2
                );

                $totalVenta = round(
                    (float)
                        $venta->total,
                    2
                );

                $saldo = round(
                    $totalVenta -
                    $totalPagado,
                    2
                );

                if (
                    $saldo <= 0
                    || $montoTransaccion >
                        $saldo
                ) {
                    return [
                        'tipo' =>
                            'SALDO_INVALIDO',

                        'saldo' =>
                            $saldo,

                        'monto' =>
                            $montoTransaccion,
                    ];
                }

                /*
                 * Crear el Pago real.
                 *
                 * Se utiliza el usuario que
                 * inició la transacción QR.
                 */
                $pago = Pago::create([
                    'id_venta' =>
                        $venta->id_venta,

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
                        'Pago QR confirmado automáticamente mediante aviso de Libélula.',

                    'fecha_pago' =>
                        now(),
                ]);

                /*
                 * Datos del cliente para el
                 * recibo automático.
                 */
                if ($venta->cliente) {
                    $nombreCliente = trim(
                        ($venta->cliente
                            ->nombre ?? '') .
                        ' ' .
                        ($venta->cliente
                            ->apellido ?? '')
                    );

                    if (
                        $nombreCliente === ''
                    ) {
                        $nombreCliente =
                            'Cliente ocasional';
                    }

                    $ciNit =
                        $venta->cliente
                            ->ci_nit;
                } else {
                    $nombreCliente = trim(
                        (string) (
                            $venta
                                ->nombre_cliente_ocasional
                            ?? ''
                        )
                    );

                    if (
                        $nombreCliente === ''
                    ) {
                        $nombreCliente =
                            'Cliente ocasional';
                    }

                    $ciNit = null;
                }

                /*
                 * Crear recibo automáticamente.
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
                 * Solo después de crear Pago y
                 * Recibo marcamos la transacción
                 * como APROBADA.
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

                    /*
                     * Se mantiene este campo
                     * temporalmente por
                     * compatibilidad histórica.
                     */
                    'fecha_escaneo' =>
                        now(),

                    'fecha_confirmacion' =>
                        now(),
                ]);

                return [
                    'tipo' =>
                        'APROBADA',

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

            case 'VENTA_NO_ENCONTRADA':
                Log::error(
                    'La venta asociada al aviso de Libélula no existe.',
                    [
                        'transaction_id' =>
                            $transactionId,
                    ]
                );

                return response()->json([
                    'ok' => false,

                    'message' =>
                        'La venta asociada no existe.',
                ], 409);

            case 'VENTA_INVALIDA':
                Log::error(
                    'La venta asociada al aviso de Libélula no está disponible.',
                    [
                        'transaction_id' =>
                            $transactionId,
                    ]
                );

                return response()->json([
                    'ok' => false,

                    'message' =>
                        'La venta asociada no está disponible para recibir el pago.',
                ], 409);

            case 'SALDO_INVALIDO':
                Log::error(
                    'El saldo de la venta cambió antes del aviso de Libélula.',
                    [
                        'transaction_id' =>
                            $transactionId,

                        'saldo' =>
                            $resultado[
                                'saldo'
                            ],

                        'monto' =>
                            $resultado[
                                'monto'
                            ],
                    ]
                );

                return response()->json([
                    'ok' => false,

                    'message' =>
                        'El saldo actual de la venta no permite registrar automáticamente este pago.',
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
