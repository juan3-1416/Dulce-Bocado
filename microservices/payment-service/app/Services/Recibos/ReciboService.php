<?php

namespace App\Services\Recibos;

use App\Models\Pago;
use App\Models\PagoIdempotencia;
use App\Models\Recibo;
use App\Services\Pagos\OrigenPagoService;
use App\Services\Pagos\PagoException;
use Illuminate\Support\Facades\DB;

class ReciboService
{
    public function __construct(
        private readonly OrigenPagoService $origenes
    ) {
    }

    public function generar(
        array $datos,
        int $actorId,
        string $clave,
        string $token
    ): array {
        $idPago = (int) $datos['id_pago'];

        $huella = hash(
            'sha256',
            json_encode([
                'actor' => $actorId,
                'operacion' => 'GENERAR_RECIBO',
                'id_pago' => $idPago,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = PagoIdempotencia::query()
            ->where('operacion', 'GENERAR_RECIBO')
            ->where('clave', $clave)
            ->first();

        if ($previa) {
            return $this->respuestaIdempotente($previa, $huella);
        }

        // Consultamos el pago antes de la transacción para conocer el origen
        $pagoPre = Pago::find($idPago);

        if (!$pagoPre) {
            throw new PagoException(
                404,
                'PAGO_NO_ENCONTRADO',
                'El pago seleccionado no existe.'
            );
        }

        if ($pagoPre->estado !== 'CONFIRMADO') {
            throw new PagoException(
                422,
                'PAGO_NO_CONFIRMADO',
                'Solo se puede emitir un recibo para un pago confirmado.'
            );
        }

        // Recuperar detalles completos del microservicio de origen antes de bloquear la BD local
        $detalleOrigen = $this->origenes->obtenerDetalleCompleto(
            $pagoPre->origen_tipo,
            $pagoPre->origen_id,
            $token
        );

        return DB::transaction(function () use (
            $idPago,
            $actorId,
            $clave,
            $huella,
            $detalleOrigen
        ) {
            DB::table('pago_idempotencia')
                ->insertOrIgnore([
                    'operacion' => 'GENERAR_RECIBO',
                    'clave' => $clave,
                    'huella_request' => $huella,
                    'estado' => 'EN_PROCESO',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            $idempotencia = PagoIdempotencia::query()
                ->where('operacion', 'GENERAR_RECIBO')
                ->where('clave', $clave)
                ->lockForUpdate()
                ->firstOrFail();

            if ($idempotencia->huella_request !== $huella) {
                throw new PagoException(
                    409,
                    'CLAVE_IDEMPOTENTE_CONFLICTIVA',
                    'La Idempotency-Key ya fue utilizada con otro contenido.'
                );
            }

            if (in_array($idempotencia->estado, ['COMPLETADA', 'RECHAZADA'], true)) {
                return [
                    'status' => (int) $idempotencia->status_code,
                    'body' => $idempotencia->respuesta_snapshot,
                ];
            }

            // Lock en el pago
            $pago = Pago::query()
                ->lockForUpdate()
                ->find($idPago);

            if (!$pago) {
                throw new PagoException(
                    404,
                    'PAGO_NO_ENCONTRADO',
                    'El pago seleccionado no existe.'
                );
            }

            if ($pago->estado !== 'CONFIRMADO') {
                throw new PagoException(
                    422,
                    'PAGO_NO_CONFIRMADO',
                    'Solo se puede emitir un recibo para un pago confirmado.'
                );
            }

            // Verificar si ya existe un recibo EMITIDO
            $existeReciboEmitido = Recibo::query()
                ->where('pago_id', $pago->id_pago)
                ->where('estado', 'EMITIDO')
                ->exists();

            if ($existeReciboEmitido) {
                throw new PagoException(
                    409,
                    'RECIBO_YA_EXISTE',
                    'El pago ya tiene un recibo emitido.'
                );
            }

            // Generar número correlativo único
            $maxId = (int) (DB::table('recibo')->max('id_recibo') ?? 0);
            $numero = sprintf('REC-%06d', $maxId + 1);

            $contador = 1;
            while (Recibo::query()->where('numero', $numero)->exists()) {
                $numero = sprintf('REC-%06d', $maxId + 1 + $contador);
                $contador++;
            }

            $totalPagadoAcumulado = bcadd(
                (string) DB::table('pago')
                    ->where('origen_tipo', $pago->origen_tipo)
                    ->where('origen_id', $pago->origen_id)
                    ->where('estado', 'CONFIRMADO')
                    ->sum('monto'),
                '0',
                2
            );

            $pagosOrigen = Pago::query()
                ->where(
                    'origen_tipo',
                    $pago->origen_tipo
                )
                ->where(
                    'origen_id',
                    $pago->origen_id
                )
                ->where(
                    'estado',
                    'CONFIRMADO'
                )
                ->orderBy('id_pago')
                ->get()
                ->map(function (Pago $item): array {
                    return [
                        'id_pago' =>
                            $item->id_pago,

                        'monto' =>
                            (string) $item->monto,

                        'medio' =>
                            $item->medio,

                        'estado' =>
                            $item->estado,

                        'fecha_pago' =>
                            $item->confirmado_at
                                ? $item->confirmado_at->toISOString()
                                : (string) $item->created_at,
                    ];
                })
                ->values()
                ->all();
            $snapshot = [
                'numero' => $numero,
                'pago_id' => $pago->id_pago,
                'operacion_id' => $pago->operacion_id,
                'origen_tipo' => $pago->origen_tipo,
                'origen_id' => $pago->origen_id,
                'monto' => (string) $pago->monto,
                'moneda' => $pago->moneda,
                'medio' => $pago->medio,
                'total_origen' => (string) $pago->total_origen_snapshot,
                'total_pagado_acumulado' => $totalPagadoAcumulado,
                'pagos_origen' => $pagosOrigen,
                'fecha_pago' => $pago->confirmado_at
                    ? $pago->confirmado_at->toISOString()
                    : (string) $pago->created_at,
                'cliente' => $detalleOrigen['cliente'] ?? [
                    'nombre' => 'Cliente ocasional',
                    'ci_nit' => null,
                ],
                'detalles' => $detalleOrigen['detalles'] ?? [],
                'emitido_por' => [
                    'id_usuario' => $actorId,
                ],
                'cantidad_impresiones' => 0,
                'emitido_at' => now()->toISOString(),
            ];

            $recibo = Recibo::create([
                'numero' => $numero,
                'pago_id' => $pago->id_pago,
                'estado' => 'EMITIDO',
                'snapshot' => $snapshot,
                'emitido_por_usuario_id' => $actorId,
                'emitido_at' => now(),
            ]);

            $respuesta = [
                'message' => 'Recibo generado correctamente.',
                'recibo' => $recibo->load('pago'),
            ];

            $idempotencia->update([
                'estado' => 'COMPLETADA',
                'recurso_tipo' => 'RECIBO',
                'recurso_id' => $recibo->id_recibo,
                'status_code' => 201,
                'respuesta_snapshot' => $respuesta,
            ]);

            return [
                'status' => 201,
                'body' => $respuesta,
            ];
        });
    }

    public function listar(array $filtros): array
    {
        $query = Recibo::query()->with('pago');

        if (!empty($filtros['estado'])) {
            $estado = strtoupper((string) $filtros['estado']);
            if (in_array($estado, ['EMITIDO', 'ANULADO'], true)) {
                $query->where('estado', $estado);
            }
        }

        if (!empty($filtros['metodo_pago'])) {
            $medio = strtoupper((string) $filtros['metodo_pago']);
            $query->whereHas('pago', fn ($q) => $q->where('medio', $medio));
        }

        if (!empty($filtros['buscar'])) {
            $texto = trim((string) $filtros['buscar']);
            $buscar = '%' . $texto . '%';

            $query->where(function ($sub) use ($buscar, $texto) {
                $sub->where('numero', 'ILIKE', $buscar)
                    ->orWhereRaw("snapshot->'cliente'->>'nombre' ILIKE ?", [$buscar])
                    ->orWhereRaw("snapshot->'cliente'->>'ci_nit' ILIKE ?", [$buscar]);

                if (ctype_digit($texto)) {
                    $idNum = (int) $texto;
                    $sub->orWhere('id_recibo', $idNum)
                        ->orWhere('pago_id', $idNum);
                }
            });
        }

        $recibos = $query
            ->orderByDesc('emitido_at')
            ->orderByDesc('id_recibo')
            ->get();

        return [
            'recibos' => $recibos,
        ];
    }

    public function obtener(int $id): Recibo
    {
        $recibo = Recibo::query()
            ->with('pago')
            ->find($id);

        if (!$recibo) {
            throw new PagoException(
                404,
                'RECIBO_NO_ENCONTRADO',
                'Recibo no encontrado.'
            );
        }

        return $recibo;
    }

    public function anular(
        int $id,
        string $motivo,
        int $actorId,
        string $clave
    ): array {
        $motivo = trim($motivo);

        if (mb_strlen($motivo) < 5) {
            throw new PagoException(
                422,
                'MOTIVO_INVALIDO',
                'El motivo de anulación debe tener al menos 5 caracteres.'
            );
        }

        $huella = hash(
            'sha256',
            json_encode([
                'actor' => $actorId,
                'operacion' => 'ANULAR_RECIBO',
                'id_recibo' => $id,
                'motivo' => $motivo,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = PagoIdempotencia::query()
            ->where('operacion', 'ANULAR_RECIBO')
            ->where('clave', $clave)
            ->first();

        if ($previa) {
            return $this->respuestaIdempotente($previa, $huella);
        }

        return DB::transaction(function () use (
            $id,
            $motivo,
            $actorId,
            $clave,
            $huella
        ) {
            DB::table('pago_idempotencia')
                ->insertOrIgnore([
                    'operacion' => 'ANULAR_RECIBO',
                    'clave' => $clave,
                    'huella_request' => $huella,
                    'estado' => 'EN_PROCESO',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            $idempotencia = PagoIdempotencia::query()
                ->where('operacion', 'ANULAR_RECIBO')
                ->where('clave', $clave)
                ->lockForUpdate()
                ->firstOrFail();

            if ($idempotencia->huella_request !== $huella) {
                throw new PagoException(
                    409,
                    'CLAVE_IDEMPOTENTE_CONFLICTIVA',
                    'La Idempotency-Key ya fue utilizada con otro contenido.'
                );
            }

            if (in_array($idempotencia->estado, ['COMPLETADA', 'RECHAZADA'], true)) {
                return [
                    'status' => (int) $idempotencia->status_code,
                    'body' => $idempotencia->respuesta_snapshot,
                ];
            }

            $recibo = Recibo::query()
                ->lockForUpdate()
                ->find($id);

            if (!$recibo) {
                throw new PagoException(
                    404,
                    'RECIBO_NO_ENCONTRADO',
                    'Recibo no encontrado.'
                );
            }

            if ($recibo->estado === 'ANULADO') {
                throw new PagoException(
                    409,
                    'RECIBO_YA_ANULADO',
                    'El recibo ya se encuentra anulado.'
                );
            }

            $recibo->update([
                'estado' => 'ANULADO',
                'motivo_anulacion' => $motivo,
                'anulado_por_usuario_id' => $actorId,
                'anulado_at' => now(),
            ]);

            $respuesta = [
                'message' => 'Recibo anulado correctamente.',
                'recibo' => $recibo->load('pago'),
            ];

            $idempotencia->update([
                'estado' => 'COMPLETADA',
                'recurso_tipo' => 'RECIBO',
                'recurso_id' => $recibo->id_recibo,
                'status_code' => 200,
                'respuesta_snapshot' => $respuesta,
            ]);

            return [
                'status' => 200,
                'body' => $respuesta,
            ];
        });
    }

    public function registrarImpresion(int $id, int $actorId): Recibo
    {
        return DB::transaction(function () use ($id, $actorId) {
            $recibo = Recibo::query()
                ->lockForUpdate()
                ->find($id);

            if (!$recibo) {
                throw new PagoException(
                    404,
                    'RECIBO_NO_ENCONTRADO',
                    'Recibo no encontrado.'
                );
            }

            $snapshot = is_array($recibo->snapshot)
                ? $recibo->snapshot
                : [];

            $cantidad = (int) ($snapshot['cantidad_impresiones'] ?? 0) + 1;
            $snapshot['cantidad_impresiones'] = $cantidad;
            $snapshot['fecha_ultima_impresion'] = now()->toISOString();
            $snapshot['id_usuario_ultima_impresion'] = $actorId;

            $recibo->update([
                'snapshot' => $snapshot,
            ]);

            return $recibo->load('pago');
        });
    }

    public function catalogos(): array
    {
        // Pagos confirmados que no tengan un recibo EMITIDO
        $recibosEmitidosPagoIds = DB::table('recibo')
            ->where('estado', 'EMITIDO')
            ->pluck('pago_id')
            ->all();

        $pagos = Pago::query()
            ->where('estado', 'CONFIRMADO')
            ->whereNotIn('id_pago', $recibosEmitidosPagoIds)
            ->orderByDesc('id_pago')
            ->limit(50)
            ->get();

        $pagosMapeados = $pagos->map(function (Pago $pago) {
            return [
                'id_pago' => $pago->id_pago,
                'id_venta' => $pago->origen_tipo === 'VENTA' ? $pago->origen_id : null,
                'id_pedido' => $pago->origen_tipo === 'PEDIDO' ? $pago->origen_id : null,
                'origen_tipo' => $pago->origen_tipo,
                'origen_id' => $pago->origen_id,
                'monto' => (string) $pago->monto,
                'medio' => $pago->medio,
                'metodo_pago' => $pago->medio,
                'nombre_cliente' => $pago->origen_tipo . ' #' . $pago->origen_id,
                'fecha_pago' => $pago->confirmado_at ? $pago->confirmado_at->toISOString() : (string) $pago->created_at,
            ];
        });

        return [
            'pagos' => $pagosMapeados,
        ];
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
