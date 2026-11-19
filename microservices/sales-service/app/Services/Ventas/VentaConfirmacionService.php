<?php

namespace App\Services\Ventas;

use App\Models\Venta;
use App\Models\VentaConfirmacion;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class VentaConfirmacionService
{
    public function confirmar(
        Venta $venta,
        int $actor,
        string $clave
    ): array {
        $intento = $this->prepararIntento(
            $venta,
            $actor,
            $clave
        );

        if ($intento->estado === 'APLICADA') {
            return $this->finalizarAplicada(
                $intento,
                $actor
            );
        }

        $url = config('services.inventory.url');
        $key = config(
            'services.inventory.sales_key'
        );

        if (
            !is_string($url) ||
            $url === '' ||
            !is_string($key) ||
            $key === ''
        ) {
            return $this->marcarIncierta(
                $intento,
                'INVENTORY_NO_CONFIGURADO',
                'Inventory no está configurado.'
            );
        }

        try {
            $respuesta = Http::timeout(
                max(
                    1,
                    (int) config(
                        'services.inventory.timeout',
                        3
                    )
                )
            )
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' =>
                        $key,
                    'X-Actor-User-Id' =>
                        (string) $actor,
                ])
                ->post(
                    rtrim($url, '/').
                    '/internal/ventas/descontar',
                    [
                        'operacion_id' =>
                            $intento->operacion_id,
                        'venta_id' =>
                            $intento->id_venta,
                        'items' =>
                            $intento->items_snapshot,
                    ]
                );
        } catch (ConnectionException) {
            return $this->conciliar(
                $intento,
                $actor
            );
        }

        if ($this->esAplicada(
            $respuesta,
            $intento
        )) {
            return $this->finalizarAplicada(
                $intento,
                $actor
            );
        }

        if ($respuesta->status() === 409) {
            return $this->marcarRechazada(
                $intento,
                $respuesta
            );
        }

        if ($respuesta->status() === 422) {
            return $this->marcarRechazada(
                $intento,
                $respuesta
            );
        }

        /*
         * Un 5xx o una respuesta inesperada puede
         * ocurrir después de que Inventory haya
         * aplicado el descuento. Primero conciliamos.
         */
        return $this->conciliar(
            $intento,
            $actor
        );
    }

    private function prepararIntento(
        Venta $venta,
        int $actor,
        string $clave
    ): VentaConfirmacion {
        return DB::transaction(function () use (
            $venta,
            $actor,
            $clave
        ) {
            $actual = Venta::query()
                ->whereKey($venta->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (
                !in_array(
                    $actual->estado,
                    ['BORRADOR', 'CONFIRMADA'],
                    true
                )
            ) {
                throw new VentaException(
                    409,
                    'VENTA_NO_CONFIRMABLE',
                    'La venta no puede confirmarse.'
                );
            }

            $actual->load('detalles');

            $items = $this->itemsSnapshot(
                $actual
            );

            $hash = hash(
                'sha256',
                json_encode(
                    [
                        (int) $actual->id_venta,
                        $actor,
                        $items,
                    ],
                    JSON_THROW_ON_ERROR
                )
            );

            $intento = VentaConfirmacion::query()
                ->where(
                    'id_venta',
                    $actual->id_venta
                )
                ->lockForUpdate()
                ->first();

            if ($intento) {
                if (
                    $intento->clave !== $clave ||
                    $intento->hash_solicitud
                        !== $hash ||
                    (int) $intento->id_usuario
                        !== $actor
                ) {
                    throw new VentaException(
                        409,
                        'CLAVE_IDEMPOTENTE_EN_CONFLICTO',
                        'La confirmación ya fue iniciada con otra solicitud.'
                    );
                }

                if (
                    $intento->estado !== 'APLICADA'
                ) {
                    $intento->update([
                        'estado' => 'PENDIENTE',
                        'codigo_http' => null,
                        'codigo_resultado' => null,
                        'respuesta_snapshot' => null,
                        'rechazado_at' => null,
                    ]);
                }

                return $intento->fresh();
            }

            if (
                $actual->estado === 'CONFIRMADA'
            ) {
                throw new VentaException(
                    409,
                    'VENTA_CONFIRMADA_SIN_OPERACION',
                    'La venta confirmada no posee una operación conciliable.'
                );
            }

            return VentaConfirmacion::create([
                'id_venta' =>
                    $actual->id_venta,
                'operacion_id' =>
                    (string) Str::uuid(),
                'clave' => $clave,
                'hash_solicitud' => $hash,
                'id_usuario' => $actor,
                'estado' => 'PENDIENTE',
                'items_snapshot' => $items,
            ]);
        });
    }

    private function itemsSnapshot(
        Venta $venta
    ): array {
        if ($venta->detalles->isEmpty()) {
            throw new VentaException(
                409,
                'VENTA_SIN_DETALLES',
                'La venta no posee artículos para descontar.'
            );
        }

        $items = $venta->detalles
            ->groupBy(
                fn ($detalle) =>
                    (int) $detalle->presentacion_id
            )
            ->map(function (
                $grupo,
                $presentacionId
            ) {
                $cantidad = $grupo->sum(
                    fn ($detalle) =>
                        (int) $detalle->cantidad
                );

                if (
                    $cantidad <= 0 ||
                    $cantidad > 999999999
                ) {
                    throw new VentaException(
                        422,
                        'CANTIDAD_INVALIDA',
                        'La cantidad de una presentación no es válida.'
                    );
                }

                return [
                    'presentacion_id' =>
                        (int) $presentacionId,
                    'cantidad' =>
                        (int) $cantidad,
                ];
            })
            ->sortBy('presentacion_id')
            ->values()
            ->all();

        if (count($items) > 100) {
            throw new VentaException(
                422,
                'DEMASIADAS_PRESENTACIONES',
                'La venta supera el máximo de presentaciones permitidas.'
            );
        }

        return $items;
    }

    private function conciliar(
        VentaConfirmacion $intento,
        int $actor
    ): array {
        $url = config('services.inventory.url');
        $key = config(
            'services.inventory.sales_key'
        );

        if (
            !is_string($url) ||
            $url === '' ||
            !is_string($key) ||
            $key === ''
        ) {
            return $this->marcarIncierta(
                $intento,
                'INVENTORY_NO_CONFIGURADO',
                'No se pudo conciliar la operación.'
            );
        }

        try {
            $respuesta = Http::timeout(
                max(
                    1,
                    (int) config(
                        'services.inventory.timeout',
                        3
                    )
                )
            )
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' =>
                        $key,
                    'X-Actor-User-Id' =>
                        (string) $actor,
                ])
                ->get(
                    rtrim($url, '/').
                    '/internal/ventas/'.
                    $intento->operacion_id
                );
        } catch (ConnectionException) {
            return $this->marcarIncierta(
                $intento,
                'INVENTORY_NO_DISPONIBLE',
                'No se pudo conocer el resultado del descuento.'
            );
        }

        if ($this->esAplicada(
            $respuesta,
            $intento
        )) {
            return $this->finalizarAplicada(
                $intento,
                $actor
            );
        }

        if ($respuesta->status() === 404) {
            return $this->marcarIncierta(
                $intento,
                'CONFIRMACION_INCIERTA',
                'Inventory no registra todavía la operación. Reintente con la misma Idempotency-Key.'
            );
        }

        return $this->marcarIncierta(
            $intento,
            'INVENTORY_NO_DISPONIBLE',
            'No se pudo confirmar el resultado del descuento.'
        );
    }

    private function esAplicada(
        Response $respuesta,
        VentaConfirmacion $intento
    ): bool {
        if (!$respuesta->ok()) {
            return false;
        }

        return
            $respuesta->json('estado')
                === 'APLICADA' &&
            $respuesta->json('operacion_id')
                === $intento->operacion_id &&
            (int) $respuesta->json('venta_id')
                === (int) $intento->id_venta;
    }

    private function finalizarAplicada(
        VentaConfirmacion $intento,
        int $actor
    ): array {
        return DB::transaction(function () use (
            $intento,
            $actor
        ) {
            $confirmacion =
                VentaConfirmacion::query()
                    ->whereKey(
                        $intento->getKey()
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

            $venta = Venta::query()
                ->whereKey(
                    $confirmacion->id_venta
                )
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $venta->estado ===
                    'CONFIRMADA' &&
                $venta->operacion_stock_id ===
                    $confirmacion->operacion_id
            ) {
                if (
                    is_array(
                        $confirmacion
                            ->respuesta_snapshot
                    )
                ) {
                    return [
                        'status' => 200,
                        'body' =>
                            $confirmacion
                                ->respuesta_snapshot,
                    ];
                }
            }

            if ($venta->estado !== 'BORRADOR') {
                throw new VentaException(
                    409,
                    'VENTA_NO_CONFIRMABLE',
                    'La venta cambió de estado durante la confirmación.'
                );
            }

            $venta->update([
                'estado' => 'CONFIRMADA',
                'operacion_stock_id' =>
                    $confirmacion->operacion_id,
                'id_usuario_confirmacion' =>
                    $actor,
                'fecha_confirmacion' =>
                    now(),
            ]);

            $body = [
                'message' =>
                    'Venta confirmada correctamente.',
                'venta' =>
                    $venta
                        ->fresh()
                        ->load('detalles')
                        ->toArray(),
                'confirmacion' => [
                    'operacion_id' =>
                        $confirmacion
                            ->operacion_id,
                    'estado' =>
                        'APLICADA',
                ],
            ];

            $confirmacion->update([
                'estado' => 'APLICADA',
                'codigo_http' => 200,
                'codigo_resultado' =>
                    'APLICADA',
                'respuesta_snapshot' =>
                    $body,
                'confirmado_at' => now(),
                'rechazado_at' => null,
            ]);

            return [
                'status' => 200,
                'body' => $body,
            ];
        });
    }

    private function marcarRechazada(
        VentaConfirmacion $intento,
        Response $respuesta
    ): array {
        $body = $respuesta->json();

        if (!is_array($body)) {
            $body = [
                'error' => [
                    'code' =>
                        'INVENTORY_RECHAZO',
                    'message' =>
                        'Inventory rechazó la operación.',
                    'details' => [],
                ],
            ];
        }

        $body['operacion_id'] =
            $intento->operacion_id;

        DB::transaction(function () use (
            $intento,
            $respuesta,
            $body
        ) {
            VentaConfirmacion::query()
                ->whereKey(
                    $intento->getKey()
                )
                ->lockForUpdate()
                ->firstOrFail()
                ->update([
                    'estado' => 'RECHAZADA',
                    'codigo_http' =>
                        $respuesta->status(),
                    'codigo_resultado' =>
                        (string) (
                            $respuesta->json(
                                'error.code'
                            ) ??
                            'INVENTORY_RECHAZO'
                        ),
                    'respuesta_snapshot' =>
                        $body,
                    'rechazado_at' => now(),
                ]);
        });

        return [
            'status' => $respuesta->status(),
            'body' => $body,
        ];
    }

    private function marcarIncierta(
        VentaConfirmacion $intento,
        string $codigo,
        string $mensaje
    ): array {
        $body = [
            'error' => [
                'code' => $codigo,
                'message' => $mensaje,
                'details' => [
                    'operacion_id' =>
                        $intento->operacion_id,
                ],
            ],
        ];

        DB::transaction(function () use (
            $intento,
            $codigo,
            $body
        ) {
            VentaConfirmacion::query()
                ->whereKey(
                    $intento->getKey()
                )
                ->lockForUpdate()
                ->firstOrFail()
                ->update([
                    'estado' => 'INCIERTA',
                    'codigo_http' => 503,
                    'codigo_resultado' =>
                        $codigo,
                    'respuesta_snapshot' =>
                        $body,
                ]);
        });

        return [
            'status' => 503,
            'body' => $body,
        ];
    }
}