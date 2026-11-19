<?php

namespace App\Services\Pagos;

use App\Models\Pago;
use App\Models\PagoIdempotencia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PagoEfectivoService
{
    public function __construct(
        private readonly OrigenPagoService $origenes
    ) {
    }

    public function registrar(
        array $datos,
        int $actor,
        string $clave,
        string $token
    ): array {
        $tipo = strtoupper(
            (string) $datos['origen_tipo']
        );

        $origenId = (int) $datos['origen_id'];

        $monto = bcadd(
            (string) $datos['monto'],
            '0',
            2
        );

        $moneda = strtoupper(
            (string) ($datos['moneda'] ?? 'BOB')
        );

        $huella = hash(
            'sha256',
            json_encode([
                'actor' => $actor,
                'origen_tipo' => $tipo,
                'origen_id' => $origenId,
                'monto' => $monto,
                'moneda' => $moneda,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = PagoIdempotencia::query()
            ->where('operacion', 'PAGO_EFECTIVO')
            ->where('clave', $clave)
            ->first();

        if ($previa) {
            return $this->respuestaIdempotente(
                $previa,
                $huella
            );
        }

        /*
         * Validamos el origen antes de abrir la transacción local.
         * Así no dejamos locks abiertos mientras esperamos HTTP.
         */
        $origen = $this->origenes->obtener(
            $tipo,
            $origenId,
            $token,
            true
        );

        if ($origen['moneda'] !== $moneda) {
            throw new PagoException(
                409,
                'MONEDA_INCONSISTENTE',
                'La moneda del pago no coincide con la operación.'
            );
        }

        return DB::transaction(function () use (
            $tipo,
            $origenId,
            $monto,
            $moneda,
            $actor,
            $clave,
            $huella,
            $origen
        ) {
            DB::table('pago_idempotencia')
                ->insertOrIgnore([
                    'operacion' => 'PAGO_EFECTIVO',
                    'clave' => $clave,
                    'huella_request' => $huella,
                    'estado' => 'EN_PROCESO',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            $idempotencia =
                PagoIdempotencia::query()
                    ->where(
                        'operacion',
                        'PAGO_EFECTIVO'
                    )
                    ->where('clave', $clave)
                    ->lockForUpdate()
                    ->firstOrFail();

            if (
                $idempotencia->huella_request !==
                $huella
            ) {
                throw new PagoException(
                    409,
                    'CLAVE_IDEMPOTENTE_CONFLICTIVA',
                    'La Idempotency-Key ya fue utilizada con otro contenido.'
                );
            }

            if (
                in_array(
                    $idempotencia->estado,
                    ['COMPLETADA', 'RECHAZADA'],
                    true
                )
            ) {
                return [
                    'status' =>
                        (int) $idempotencia->status_code,

                    'body' =>
                        $idempotencia
                            ->respuesta_snapshot,
                ];
            }

            /*
             * Lock por origen.
             * Dos pagos concurrentes del mismo pedido/venta
             * quedan serializados.
             */
            $lockKey = hexdec(
                substr(
                    hash(
                        'sha256',
                        $tipo.'|'.$origenId
                    ),
                    0,
                    15
                )
            );

            DB::select(
                'SELECT pg_advisory_xact_lock(?)',
                [$lockKey]
            );

            $pagado = bcadd(
                (string) DB::table('pago')
                    ->where(
                        'origen_tipo',
                        $tipo
                    )
                    ->where(
                        'origen_id',
                        $origenId
                    )
                    ->where(
                        'estado',
                        'CONFIRMADO'
                    )
                    ->sum('monto'),
                '0',
                2
            );

            $saldo = bcsub(
                $origen['total'],
                $pagado,
                2
            );

            if (
                bccomp(
                    $monto,
                    $saldo,
                    2
                ) > 0
            ) {
                $body = [
                    'error' => [
                        'code' => 'SOBREPAGO',
                        'message' =>
                            'El monto supera el saldo pendiente.',
                        'details' => [
                            'total' =>
                                $origen['total'],
                            'pagado' =>
                                $pagado,
                            'saldo' =>
                                $saldo,
                            'monto_solicitado' =>
                                $monto,
                        ],
                    ],
                ];

                $idempotencia->update([
                    'estado' => 'RECHAZADA',
                    'status_code' => 409,
                    'respuesta_snapshot' => $body,
                ]);

                return [
                    'status' => 409,
                    'body' => $body,
                ];
            }

            $pago = Pago::create([
                'operacion_id' =>
                    (string) Str::uuid(),

                'origen_tipo' => $tipo,
                'origen_id' => $origenId,

                'total_origen_snapshot' =>
                    $origen['total'],

                'monto' => $monto,
                'moneda' => $moneda,

                'medio' => 'EFECTIVO',
                'estado' => 'CONFIRMADO',

                'actor_usuario_id' => $actor,
                'confirmado_at' => now(),
            ]);

            $nuevoPagado = bcadd(
                $pagado,
                $monto,
                2
            );

            $nuevoSaldo = bcsub(
                $origen['total'],
                $nuevoPagado,
                2
            );

            $body = [
                'message' =>
                    'Pago en efectivo registrado correctamente.',

                'pago' =>
                    $pago->fresh()->toArray(),

                'resumen' => [
                    'origen_tipo' =>
                        $tipo,
                    'origen_id' =>
                        $origenId,
                    'total' =>
                        $origen['total'],
                    'pagado' =>
                        $nuevoPagado,
                    'saldo' =>
                        $nuevoSaldo,
                    'moneda' =>
                        $moneda,
                ],
            ];

            $idempotencia->update([
                'estado' => 'COMPLETADA',
                'recurso_tipo' => 'PAGO',
                'recurso_id' => $pago->id_pago,
                'status_code' => 201,
                'respuesta_snapshot' => $body,
            ]);

            return [
                'status' => 201,
                'body' => $body,
            ];
        });
    }

    private function respuestaIdempotente(
        PagoIdempotencia $registro,
        string $huella
    ): array {
        if (
            $registro->huella_request !==
            $huella
        ) {
            throw new PagoException(
                409,
                'CLAVE_IDEMPOTENTE_CONFLICTIVA',
                'La Idempotency-Key ya fue utilizada con otro contenido.'
            );
        }

        if (
            in_array(
                $registro->estado,
                ['COMPLETADA', 'RECHAZADA'],
                true
            ) &&
            is_array(
                $registro->respuesta_snapshot
            )
        ) {
            return [
                'status' =>
                    (int) $registro->status_code,

                'body' =>
                    $registro->respuesta_snapshot,
            ];
        }

        throw new PagoException(
            409,
            'PAGO_EN_PROCESO',
            'La operación de pago todavía está en proceso.'
        );
    }
}