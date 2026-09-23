<?php

namespace App\Http\Controllers\Api\PagosInternet;

use App\Http\Controllers\Controller;
use App\Http\Requests\PagosInternet\ConfirmarPagoInternetRequest;
use App\Http\Requests\PagosInternet\StorePagoInternetRequest;
use App\Models\Pago;
use App\Models\PagoInternet;
use App\Models\Recibo;
use App\Models\Venta;
use App\Services\PagosInternet\PasarelaLibelula;
use App\Services\PagosInternet\PasarelaPagoSimulada;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PagoInternetController extends Controller
{
    public function __construct(
        private readonly PasarelaLibelula $pasarela,
        private readonly PasarelaPagoSimulada $pasarelaSimulada
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
                PasarelaLibelula::PROVEEDOR,
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
                    ->with('cliente')
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
                 * Generamos una referencia propia.
                 *
                 * Libélula devuelve esta misma referencia
                 * posteriormente como transaction_id
                 * en el aviso GET.
                 */
                $referencia =
                    'DULCE-VENTA-' .
                    $venta->id_venta .
                    '-' .
                    Str::upper(
                        Str::random(12)
                    );

                /*
                 * Datos del cliente que se enviarán
                 * al registro de deuda de Libélula.
                 */
                if ($venta->cliente) {
                    $nombreCliente = trim(
                        (string) (
                            $venta->cliente->nombre
                            ?? ''
                        )
                    );

                    $apellidoCliente = trim(
                        (string) (
                            $venta->cliente->apellido
                            ?? ''
                        )
                    );

                    $emailCliente = trim(
                        (string) (
                            $venta->cliente
                                ->correo_electronico
                            ?? ''
                        )
                    );
                } else {
                    $nombreCliente = trim(
                        (string) (
                            $venta
                                ->nombre_cliente_ocasional
                            ?? ''
                        )
                    );

                    $apellidoCliente = '';
                    $emailCliente = '';
                }

                if ($nombreCliente === '') {
                    $nombreCliente =
                        'Cliente Dulce Bocado';
                }

                /*
                 * Registrar la deuda real en Libélula.
                 */
                $respuesta =
                    $this->pasarela
                        ->registrarDeuda(
                            $referencia,
                            $monto,
                            $nombreCliente,
                            $apellidoCliente,
                            $emailCliente !== ''
                                ? $emailCliente
                                : null,
                            'Pago venta #' .
                            $venta->id_venta .
                            ' - Dulce Bocado'
                        );

                /*
                 * Verificación adicional:
                 * el monto devuelto por Libélula
                 * debe coincidir con el solicitado.
                 */
                $montoLibelula = round(
                    (float) (
                        $respuesta[
                            'monto_total'
                        ] ?? 0
                    ),
                    2
                );

                if (
                    abs(
                        $montoLibelula -
                        $monto
                    ) > 0.001
                ) {
                    throw ValidationException::withMessages([
                        'monto' =>
                            'El monto registrado por Libélula no coincide con el monto solicitado.',
                    ]);
                }

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
                        $respuesta[
                            'proveedor'
                        ],

                    'referencia_transaccion' =>
                        $respuesta[
                            'referencia_transaccion'
                        ],

                    'id_transaccion_libelula' =>
                        $respuesta[
                            'id_transaccion_libelula'
                        ],

                    'codigo_recaudacion' =>
                        $respuesta[
                            'codigo_recaudacion'
                        ],

                    'qr_simple_url' =>
                        $respuesta[
                            'qr_simple_url'
                        ],

                    'url_pasarela_pagos' =>
                        $respuesta[
                            'url_pasarela_pagos'
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

                    /*
                     * Se mantienen temporalmente
                     * los campos del flujo QR simulado
                     * mientras terminamos la transición.
                     */
                    'token_qr' =>
                        null,

                    'fecha_vencimiento' =>
                        null,

                    'fecha_escaneo' =>
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
public function consultarQr(
    string $token
): JsonResponse {
    $transaccion = PagoInternet::query()
        ->where('token_qr', $token)
        ->first();

    if (!$transaccion) {
        return response()->json([
            'message' =>
                'El código QR no existe o no es válido.',
        ], 404);
    }

    /*
     * Si estaba pendiente pero ya venció,
     * actualizamos su estado.
     */
    if (
        $transaccion->estado === 'PENDIENTE'
        && $transaccion->fecha_vencimiento !== null
        && now()->greaterThanOrEqualTo(
            $transaccion->fecha_vencimiento
        )
    ) {
        $transaccion->update([
            'estado' => 'VENCIDO',
        ]);

        $transaccion->refresh();
    }

    return response()->json([
        'transaccion' => [
            'referencia' =>
                $transaccion->referencia_transaccion,

            'monto' =>
                $transaccion->monto,

            'estado' =>
                $transaccion->estado,

            'fecha_vencimiento' =>
                $transaccion->fecha_vencimiento,

            'fecha_escaneo' =>
                $transaccion->fecha_escaneo,
        ],
    ]);
}
public function confirmarQr(
    string $token
): JsonResponse {
    $resultado = DB::transaction(
        function () use ($token) {
            /*
             * Bloqueamos la transacción para impedir
             * dos confirmaciones simultáneas.
             */
            $transaccion = PagoInternet::query()
                ->lockForUpdate()
                ->where(
                    'token_qr',
                    $token
                )
                ->first();

            if (!$transaccion) {
                return [
                    'tipo' => 'NO_ENCONTRADA',
                ];
            }

            /*
             * Idempotencia:
             * si ya fue aprobada, no creamos
             * otro Pago ni otro Recibo.
             */
            if (
                $transaccion->estado ===
                'APROBADO'
            ) {
                $pago = $transaccion
                    ->pago()
                    ->first();

                $recibo = $pago
                    ? $pago
                        ->recibos()
                        ->where(
                            'estado',
                            'EMITIDO'
                        )
                        ->orderByDesc(
                            'id_recibo'
                        )
                        ->first()
                    : null;

                return [
                    'tipo' =>
                        'YA_APROBADA',

                    'transaccion' =>
                        $transaccion,

                    'pago' =>
                        $pago,

                    'recibo' =>
                        $recibo,
                ];
            }

            /*
             * Estados que ya no pueden pagarse.
             */
            if (
                $transaccion->estado ===
                'VENCIDO'
            ) {
                return [
                    'tipo' => 'VENCIDA',
                    'transaccion' =>
                        $transaccion,
                ];
            }

            if (
                $transaccion->estado ===
                'RECHAZADO'
            ) {
                return [
                    'tipo' => 'RECHAZADA',
                    'transaccion' =>
                        $transaccion,
                ];
            }

            /*
             * Verificar vencimiento justo
             * en el momento del escaneo.
             */
            if (
                $transaccion
                    ->fecha_vencimiento !== null
                && now()->greaterThanOrEqualTo(
                    $transaccion
                        ->fecha_vencimiento
                )
            ) {
                $transaccion->update([
                    'estado' =>
                        'VENCIDO',
                ]);

                return [
                    'tipo' => 'VENCIDA',
                    'transaccion' =>
                        $transaccion,
                ];
            }

            /*
             * Bloquear venta asociada.
             */
            $venta = Venta::query()
                ->with('cliente')
                ->lockForUpdate()
                ->find(
                    $transaccion->id_venta
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
             * Recalcular saldo en el momento
             * exacto de la confirmación.
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
                (float)
                    $transaccion->monto,
                2
            );

            if (
                $saldo <= 0
                || $monto > $saldo
            ) {
                return [
                    'tipo' =>
                        'SALDO_INVALIDO',

                    'saldo' =>
                        $saldo,
                ];
            }

            /*
             * Crear Pago real.
             *
             * Usamos el usuario que inició
             * la transacción QR, porque el
             * cliente que escanea no está
             * autenticado.
             */
            $pago = Pago::create([
                'id_venta' =>
                    $venta->id_venta,

                'id_usuario' =>
                    $transaccion
                        ->id_usuario,

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
                    'Pago QR confirmado automáticamente mediante escaneo.',

                'fecha_pago' =>
                    now(),
            ]);

            /*
             * Obtener datos del cliente
             * igual que CU13.
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
                    $venta->cliente->ci_nit;
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
             * Crear Recibo automáticamente.
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
             * Solo después de crear correctamente
             * Pago y Recibo marcamos el QR
             * como APROBADO.
             */
            $transaccion->update([
                'estado' =>
                    'APROBADO',

                'id_pago' =>
                    $pago->id_pago,

                'motivo_rechazo' =>
                    null,

                'fecha_escaneo' =>
                    now(),

                'fecha_confirmacion' =>
                    now(),

                'respuesta_proveedor' => [
                    'codigo' =>
                        'QR_ESCANEADO',

                    'mensaje' =>
                        'Pago confirmado mediante el escaneo del código QR.',
                ],
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

    switch ($resultado['tipo']) {
        case 'NO_ENCONTRADA':
            return response()->json([
                'message' =>
                    'El código QR no existe o no es válido.',
            ], 404);

        case 'VENCIDA':
            return response()->json([
                'message' =>
                    'El código QR ha vencido.',
                'estado' =>
                    'VENCIDO',
            ], 410);

        case 'RECHAZADA':
            return response()->json([
                'message' =>
                    'La transacción fue rechazada anteriormente.',
            ], 409);

        case 'VENTA_NO_ENCONTRADA':
            return response()->json([
                'message' =>
                    'La venta asociada no existe.',
            ], 404);

        case 'VENTA_INVALIDA':
            return response()->json([
                'message' =>
                    'La venta ya no se encuentra disponible para recibir pagos.',
            ], 409);

        case 'SALDO_INVALIDO':
            return response()->json([
                'message' =>
                    'El saldo de la venta cambió y el QR ya no puede procesarse.',
                'saldo' =>
                    number_format(
                        max(
                            0,
                            $resultado['saldo']
                        ),
                        2,
                        '.',
                        ''
                    ),
            ], 409);

        case 'YA_APROBADA':
            return response()->json([
                'message' =>
                    'Este pago QR ya había sido procesado.',

                'estado' =>
                    'APROBADO',

                'pago' =>
                    $resultado['pago'],

                'recibo' =>
                    $resultado['recibo'],
            ]);

        default:
            return response()->json([
                'message' =>
                    'Pago QR confirmado correctamente.',

                'estado' =>
                    'APROBADO',

                'pago' =>
                    $resultado['pago'],

                'recibo' =>
                    $resultado['recibo'],
            ]);
    }
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
                    $this->pasarelaSimulada->confirmar(
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