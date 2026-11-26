<?php

namespace App\Services\Pagos;

use App\Models\EventoQr;
use App\Models\IntentoQr;
use App\Models\Pago;
use App\Models\PagoIdempotencia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PagoQrService
{
    public function __construct(
        private readonly OrigenPagoService $origenes,
        private readonly PasarelaLibelulaService $libelula
    ) {
    }

    public function iniciar(
        array $datos,
        int $actorId,
        string $clave,
        string $token
    ): array {
        $tipo = strtoupper((string) $datos['origen_tipo']);
        $origenId = (int) $datos['origen_id'];

        $reserva = DB::transaction(function () use (
            $datos,
            $actorId,
            $clave,
            $token,
            $tipo,
            $origenId
        ) {
            DB::select(
                'SELECT pg_advisory_xact_lock(197923, hashtext(?))',
                [$clave]
            );

            $lockKey = hexdec(
                substr(
                    hash('sha256', $tipo.'|'.$origenId),
                    0,
                    15
                )
            );

            DB::select(
                'SELECT pg_advisory_xact_lock(?)',
                [$lockKey]
            );

            return $this->iniciarBloqueado(
                $datos,
                $actorId,
                $clave,
                $token
            );
        });

        // Una respuesta idempotente no debe contactar nuevamente a Libelula.
        if (!isset($reserva['registro_qr'])) {
            return $reserva;
        }

        $registro = $reserva['registro_qr'];

        try {
            $resultado = $this->libelula->registrarDeuda(
                $registro['identificador'],
                (float) $registro['monto'],
                $registro['nombre_cliente'],
                "Pago {$tipo} #{$origenId}"
            );
        } catch (\Throwable $e) {
            // La reserva local permanece registrada.
            // Una falla de conexion no demuestra que la deuda no exista.
            throw new PagoException(
                503,
                'QR_REGISTRO_INCIERTO',
                'No se pudo confirmar el registro del QR. Verifique la operacion antes de volver a cobrar.',
                [
                    'id_intento_qr' => $registro['id_intento_qr'],
                ]
            );
        }

        return $this->finalizarRegistroQr(
            $registro,
            $resultado
        );
    }

    private function iniciarBloqueado(
        array $datos,
        int $actorId,
        string $clave,
        string $token
    ): array {
        $tipo = strtoupper((string) $datos['origen_tipo']);
        $origenId = (int) $datos['origen_id'];
        $monto = bcadd((string) $datos['monto'], '0', 2);
        $moneda = strtoupper((string) ($datos['moneda'] ?? 'BOB'));

        $huella = hash(
            'sha256',
            json_encode([
                'actor' => $actorId,
                'operacion' => 'INICIAR_QR',
                'origen_tipo' => $tipo,
                'origen_id' => $origenId,
                'monto' => $monto,
                'moneda' => $moneda,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = PagoIdempotencia::query()
            ->where('operacion', 'INICIAR_QR')
            ->where('clave', $clave)
            ->first();

        if ($previa) {
            return $this->respuestaIdempotente($previa, $huella);
        }

        // Validar operación comercial propietaria
        $origen = $this->origenes->obtener($tipo, $origenId, $token, true);

        if ($origen['moneda'] !== $moneda) {
            throw new PagoException(
                409,
                'MONEDA_INCONSISTENTE',
                'La moneda del pago no coincide con la de la operación.'
            );
        }

        if (
            $tipo === 'VENTA' &&
            IntentoQr::query()
                ->where('origen_tipo', $tipo)
                ->where('origen_id', $origenId)
                ->whereIn('estado', ['INICIADA', 'PENDIENTE'])
                ->exists()
        ) {
            throw new PagoException(
                409,
                'QR_PENDIENTE',
                'La venta ya tiene un cobro QR pendiente. Verifique su estado antes de generar otro.'
            );
        }

        // Validar que no sobrepase el saldo pendiente
        $pagado = bcadd(
            (string) DB::table('pago')
                ->where('origen_tipo', $tipo)
                ->where('origen_id', $origenId)
                ->where('estado', 'CONFIRMADO')
                ->sum('monto'),
            '0',
            2
        );

        $saldo = bcsub($origen['total'], $pagado, 2);

        if (bccomp($saldo, '0.00', 2) <= 0) {
            throw new PagoException(
                409,
                'OPERACION_TOTALMENTE_PAGADA',
                'La operación ya no tiene saldo pendiente por cobrar.'
            );
        }

        if ($tipo === 'VENTA' && bccomp($monto, $saldo, 2) < 0) {
            throw new PagoException(
                409,
                'VENTA_PAGO_INCOMPLETO',
                'La venta debe pagarse completamente.',
                [
                    'total' => $origen['total'],
                    'pagado' => $pagado,
                    'saldo' => $saldo,
                    'monto_solicitado' => $monto,
                ]
            );
        }

        if (bccomp($monto, $saldo, 2) > 0) {
            throw new PagoException(
                409,
                'PAGO_EXCEDE_SALDO',
                "El monto (Bs {$monto}) excede el saldo pendiente (Bs {$saldo})."
            );
        }

        // Obtener datos del cliente para Libélula
        $detalleOrigen = $this->origenes->obtenerDetalleCompleto($tipo, $origenId, $token);
        $nombreCliente = $detalleOrigen['cliente']['nombre'] ?? 'Cliente ocasional';

        $operacionId = Str::uuid()->toString();
        // Identificador que Dulce Bocado envía a Libélula y que Libélula devuelve por GET en transaction_id
        $identificador = 'DB-QR-' . substr(str_replace('-', '', $operacionId), 0, 16);

        DB::table('pago_idempotencia')->insert([
            'operacion' => 'INICIAR_QR',
            'clave' => $clave,
            'huella_request' => $huella,
            'estado' => 'EN_PROCESO',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $intento = IntentoQr::create([
            'operacion_id' => $operacionId,
            'origen_tipo' => $tipo,
            'origen_id' => $origenId,
            'monto' => $monto,
            'moneda' => $moneda,
            'estado' => 'INICIADA',
            'referencia_proveedor' => $identificador,
            'qr_contenido' => json_encode([
                'registro_estado' => 'EN_PROCESO',
                'total_origen_snapshot' => (string) $origen['total'],
            ], JSON_THROW_ON_ERROR),
            'expira_at' => now()->addMinutes(15),
            'actor_usuario_id' => $actorId,
        ]);

        PagoIdempotencia::query()
            ->where('operacion', 'INICIAR_QR')
            ->where('clave', $clave)
            ->update([
                'recurso_tipo' => 'INTENTO_QR',
                'recurso_id' => $intento->id_intento_qr,
            ]);

        return [
            'registro_qr' => [
                'id_intento_qr' => $intento->id_intento_qr,
                'identificador' => $identificador,
                'monto' => $monto,
                'nombre_cliente' => $nombreCliente,
                'total_origen_snapshot' => (string) $origen['total'],
                'clave' => $clave,
                'huella' => $huella,
                'tipo' => $tipo,
                'origen_id' => $origenId,
            ],
        ];
    }

    private function finalizarRegistroQr(
        array $registro,
        array $resultado
    ): array {
        return DB::transaction(function () use ($registro, $resultado) {
            $lockKey = hexdec(
                substr(
                    hash(
                        'sha256',
                        $registro['tipo'].'|'.$registro['origen_id']
                    ),
                    0,
                    15
                )
            );

            DB::select(
                'SELECT pg_advisory_xact_lock(?)',
                [$lockKey]
            );

            $idempotencia = PagoIdempotencia::query()
                ->where('operacion', 'INICIAR_QR')
                ->where('clave', $registro['clave'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($idempotencia->huella_request !== $registro['huella']) {
                throw new PagoException(
                    409,
                    'CLAVE_IDEMPOTENTE_CONFLICTIVA',
                    'La clave del registro QR no coincide.'
                );
            }

            if ($idempotencia->estado !== 'EN_PROCESO') {
                return $this->respuestaIdempotente(
                    $idempotencia,
                    $registro['huella']
                );
            }

            $intento = IntentoQr::query()
                ->lockForUpdate()
                ->findOrFail($registro['id_intento_qr']);

            if (empty($resultado['id_transaccion_libelula'])) {
                throw new PagoException(
                    503,
                    'QR_REGISTRO_INCIERTO',
                    'Libelula no devolvio el identificador de la transaccion.'
                );
            }

            $intento->update([
                'qr_contenido' => json_encode([
                    'registro_estado' => 'REGISTRADO',
                    'qr_simple_url' => $resultado['qr_simple_url'],
                    'url_pasarela_pagos' => $resultado['url_pasarela_pagos'],
                    'id_transaccion_libelula' => $resultado['id_transaccion_libelula'],
                    'codigo_recaudacion' => $resultado['codigo_recaudacion'],
                    'total_origen_snapshot' => $registro['total_origen_snapshot'],
                ], JSON_THROW_ON_ERROR),
                'expira_at' => now()->addMinutes(15),
            ]);

            $respuesta = [
                'message' => 'Codigo QR generado correctamente. Pendiente de pago.',
                'intento_qr' => [
                    'id_intento_qr' => $intento->id_intento_qr,
                    'operacion_id' => $intento->operacion_id,
                    'origen_tipo' => $intento->origen_tipo,
                    'origen_id' => $intento->origen_id,
                    'monto' => $intento->monto,
                    'moneda' => $intento->moneda,
                    'estado' => $intento->estado,
                    'referencia' => $intento->referencia_proveedor,
                    'qr_url' => $resultado['qr_simple_url'],
                    'pasarela_url' => $resultado['url_pasarela_pagos'],
                    'expira_at' => $intento->expira_at->toISOString(),
                ],
            ];

            $idempotencia->update([
                'estado' => 'COMPLETADA',
                'recurso_tipo' => 'INTENTO_QR',
                'recurso_id' => $intento->id_intento_qr,
                'status_code' => 201,
                'respuesta_snapshot' => $respuesta,
            ]);

            return [
                'status' => 201,
                'body' => $respuesta,
            ];
        });
    }

    public function consultar(int $id): array
    {
        $intento = IntentoQr::query()
            ->with(['pago', 'eventos'])
            ->find($id);

        if (!$intento) {
            throw new PagoException(
                404,
                'INTENTO_QR_NO_ENCONTRADO',
                'El intento de cobro QR no existe.'
            );
        }

        $contenido = [];
        if (!empty($intento->qr_contenido)) {
            try {
                $contenido = json_decode($intento->qr_contenido, true) ?: [];
            } catch (\Throwable) {
                $contenido = [];
            }
        }

        return [
            'id_intento_qr' => $intento->id_intento_qr,
            'operacion_id' => $intento->operacion_id,
            'origen_tipo' => $intento->origen_tipo,
            'origen_id' => $intento->origen_id,
            'monto' => $intento->monto,
            'moneda' => $intento->moneda,
            'estado' => $intento->estado,
            'referencia' => $intento->referencia_proveedor,
            'qr_url' => $contenido['qr_simple_url'] ?? null,
            'pasarela_url' => $contenido['url_pasarela_pagos'] ?? null,
            'expira_at' => $intento->expira_at ? $intento->expira_at->toISOString() : null,
            'confirmado_at' => $intento->confirmado_at ? $intento->confirmado_at->toISOString() : null,
            'rechazado_at' => $intento->rechazado_at ? $intento->rechazado_at->toISOString() : null,
            'pago' => $intento->pago,
        ];
    }

    public function procesarCallback(array $queryParams): array
    {
        /*
         * En Libélula:
         * El aviso llega por GET:
         * - transaction_id: contiene NUESTRA referencia (el 'identificador' enviado al registrar la deuda)
         * - error: "0" si fue exitoso, otro valor si hubo error
         * - message: texto explicativo
         * - cancel_order: "1" si el usuario canceló
         * - idqr: identificador de la pasarela
         * - monto_total: monto pagado
         */
        $transactionId = trim((string) ($queryParams['transaction_id'] ?? ''));
        $error = (string) ($queryParams['error'] ?? '');
        $message = trim((string) ($queryParams['message'] ?? ''));
        $cancelOrder = (string) ($queryParams['cancel_order'] ?? '0');
        $idQr = trim((string) ($queryParams['idqr'] ?? ''));

        if ($transactionId === '') {
            throw new PagoException(
                422,
                'AVISO_SIN_TRANSACTION_ID',
                'El aviso de la pasarela no incluye transaction_id.'
            );
        }

        return DB::transaction(function () use (
            $transactionId,
            $error,
            $message,
            $cancelOrder,
            $idQr,
            $queryParams
        ) {
            $referencia = IntentoQr::query()
                ->where('referencia_proveedor', $transactionId)
                ->first();

            if (!$referencia) {
                $referencia = IntentoQr::query()
                    ->whereRaw(
                        "CAST(qr_contenido AS jsonb)->>'id_transaccion_libelula' = ?",
                        [$transactionId]
                    )
                    ->first();
            }

            if ($referencia) {
                $lockKey = hexdec(
                    substr(
                        hash(
                            'sha256',
                            $referencia->origen_tipo.'|'.$referencia->origen_id
                        ),
                        0,
                        15
                    )
                );

                DB::select(
                    'SELECT pg_advisory_xact_lock(?)',
                    [$lockKey]
                );
            }

            $intento = $referencia
                ? IntentoQr::query()
                    ->lockForUpdate()
                    ->find($referencia->id_intento_qr)
                : null;

            if (!$intento) {
                throw new PagoException(
                    404,
                    'INTENTO_QR_NO_ENCONTRADO',
                    "No se encontró el intento de pago para la referencia '{$transactionId}'."
                );
            }

            // Manejo de idempotencia: si ya está CONFIRMADA o RECHAZADA, no duplicar
            if ($intento->estado === 'CONFIRMADA') {
                return [
                    'ok' => true,
                    'mensaje' => 'El pago ya se encontraba confirmado previamente.',
                    'estado' => 'CONFIRMADA',
                    'intento_qr_id' => $intento->id_intento_qr,
                    'pago_id' => $intento->pago?->id_pago,
                ];
            }

            if ($intento->estado === 'RECHAZADA') {
                return [
                    'ok' => true,
                    'mensaje' => 'El intento ya se encontraba rechazado.',
                    'estado' => 'RECHAZADA',
                    'intento_qr_id' => $intento->id_intento_qr,
                ];
            }

            $contenido = json_decode(
                $intento->qr_contenido ?? '',
                true
            ) ?: [];

            $idTransaccionLibelula = (string) (
                $contenido['id_transaccion_libelula'] ?? ''
            );

            $idVerificado = $this->libelula->buscarPagoVerificado(
                (string) $intento->referencia_proveedor,
                $idTransaccionLibelula,
                (string) $intento->monto,
                $intento->created_at
                    ->copy()
                    ->setTimezone('America/La_Paz')
                    ->subDay()
                    ->format('Y-m-d')
            );

            if ($idVerificado === null) {
                throw new PagoException(
                    409,
                    'PAGO_QR_NO_VERIFICADO',
                    'Libelula todavia no acredita el pago. El cobro permanece pendiente.'
                );
            }

            // El identificador recuperado procede de la API autenticada,
            // no de los parametros enviados al callback.
            if ($idTransaccionLibelula === '') {
                $contenido['id_transaccion_libelula'] = $idVerificado;
                $contenido['registro_estado'] = 'REGISTRADO';

                $intento->update([
                    'qr_contenido' => json_encode(
                        $contenido,
                        JSON_THROW_ON_ERROR
                    ),
                ]);
            }

            $pagoExitoso = true;
            $eventoExternoId = $idVerificado;
            $estadoNormalizado = 'CONFIRMADA';

            // Auditoría del evento QR
            EventoQr::create([
                'intento_qr_id' => $intento->id_intento_qr,
                'evento_externo_id' => $eventoExternoId,
                'referencia_proveedor' => $transactionId,
                'estado_normalizado' => $estadoNormalizado,
                'payload' => $queryParams,
                'recibido_at' => now(),
                'procesado_at' => now(),
            ]);

            if ($pagoExitoso) {
                $intento->update([
                    'estado' => 'CONFIRMADA',
                    'confirmado_at' => now(),
                ]);

                // Crear registro oficial de Pago confirmado
                $totalSnapshot = bcadd(
                    (string) DB::table('pago')
                        ->where('origen_tipo', $intento->origen_tipo)
                        ->where('origen_id', $intento->origen_id)
                        ->where('estado', 'CONFIRMADO')
                        ->sum('monto'),
                    (string) $intento->monto,
                    2
                );

                $pago = Pago::create([
                    'operacion_id' => Str::uuid()->toString(),
                    'origen_tipo' => $intento->origen_tipo,
                    'origen_id' => $intento->origen_id,
                    'total_origen_snapshot' => $contenido['total_origen_snapshot'] ?? $intento->monto,
                    'monto' => $intento->monto,
                    'moneda' => $intento->moneda,
                    'medio' => 'QR',
                    'estado' => 'CONFIRMADO',
                    'intento_qr_id' => $intento->id_intento_qr,
                    'actor_usuario_id' => $intento->actor_usuario_id,
                    'confirmado_at' => now(),
                ]);

                $idempotencia = PagoIdempotencia::query()
                    ->where('operacion', 'INICIAR_QR')
                    ->where('recurso_tipo', 'INTENTO_QR')
                    ->where('recurso_id', $intento->id_intento_qr)
                    ->where('estado', 'EN_PROCESO')
                    ->lockForUpdate()
                    ->first();

                if ($idempotencia) {
                    $idempotencia->update([
                        'estado' => 'COMPLETADA',
                        'status_code' => 201,
                        'respuesta_snapshot' => [
                            'message' => 'Pago recuperado y confirmado.',
                            'intento_qr' => $this->consultar(
                                $intento->id_intento_qr
                            ),
                        ],
                    ]);
                }

                return [
                    'ok' => true,
                    'mensaje' => 'Pago confirmado exitosamente.',
                    'estado' => 'CONFIRMADA',
                    'intento_qr_id' => $intento->id_intento_qr,
                    'pago_id' => $pago->id_pago,
                ];
            }

            $intento->update([
                'estado' => 'RECHAZADA',
                'rechazado_at' => now(),
            ]);

            return [
                'ok' => false,
                'mensaje' => $message ?: 'Libélula informó que el pago no fue aprobado.',
                'estado' => 'RECHAZADA',
                'intento_qr_id' => $intento->id_intento_qr,
            ];
        });
    }

    private function respuestaIdempotente(
        PagoIdempotencia $previa,
        string $huella
    ): array {
        if ($previa->huella_request !== $huella) {
            throw new PagoException(
                409,
                'CLAVE_IDEMPOTENTE_CONFLICTIVA',
                'La Idempotency-Key ya fue utilizada con otro contenido.'
            );
        }

        if ($previa->estado === 'EN_PROCESO') {
            throw new PagoException(
                409,
                'OPERACION_EN_PROCESO',
                'Existe una solicitud idéntica en proceso. Reintente en un momento.'
            );
        }

        return [
            'status' => (int) $previa->status_code,
            'body' => $previa->respuesta_snapshot,
        ];
    }
}
