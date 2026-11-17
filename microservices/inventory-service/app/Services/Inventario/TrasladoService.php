<?php

namespace App\Services\Inventario;

use App\Models\Almacen;
use App\Models\Existencia;
use App\Models\InventarioIdempotencia;
use App\Models\Movimiento;
use App\Services\Catalogo\CatalogoArticuloService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class TrasladoService
{
    public function __construct(
        private CatalogoArticuloService $catalogo,
    ) {}

    public function registrar(array $datos, int $actor): array
    {
        $clave = $datos['idempotency_key'];

        $cantidad = bcadd(
            (string) $datos['cantidad'],
            '0',
            3
        );

        $origenId = (int) $datos['almacen_origen_id'];
        $destinoId = (int) $datos['almacen_destino_id'];

        $motivo = trim((string) $datos['motivo']);

        $observaciones = isset($datos['observaciones'])
            ? trim((string) $datos['observaciones'])
            : null;

        if ($observaciones === '') {
            $observaciones = null;
        }

        $huella = hash(
            'sha256',
            json_encode([
                'actor' => $actor,
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => (int) $datos['articulo_id'],
                'almacen_origen_id' => $origenId,
                'almacen_destino_id' => $destinoId,
                'cantidad' => $cantidad,
                'motivo' => $motivo,
                'observaciones' => $observaciones,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = InventarioIdempotencia::query()
            ->where('clave', $clave)
            ->first();

        if ($previa) {
            return $this->respuestaPrevia($previa, $huella);
        }

        $origen = Almacen::find($origenId);
        $destino = Almacen::find($destinoId);

        $this->validarAlmacenes(
            $origen,
            $destino
        );

        $articulo = $this->catalogo->obtener(
            'PRESENTACION',
            (int) $datos['articulo_id'],
            $actor
        );

        try {
            return DB::transaction(function () use (
                $datos,
                $actor,
                $clave,
                $huella,
                $cantidad,
                $origenId,
                $destinoId,
                $motivo,
                $observaciones,
                $articulo
            ) {
                /*
                 * Bloqueamos ambos almacenes siempre en orden de ID para
                 * reducir el riesgo de deadlocks entre operaciones concurrentes.
                 */
                $almacenes = Almacen::query()
                    ->whereIn(
                        'id_almacen',
                        [$origenId, $destinoId]
                    )
                    ->orderBy('id_almacen')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id_almacen');

                $origen = $almacenes->get($origenId);
                $destino = $almacenes->get($destinoId);

                $this->validarAlmacenes(
                    $origen,
                    $destino
                );

                /*
                 * Primero se bloquea y valida el origen.
                 */
                $existenciaOrigen = Existencia::query()
                    ->where('almacen_id', $origenId)
                    ->where(
                        'tipo_articulo',
                        'PRESENTACION'
                    )
                    ->where(
                        'articulo_id',
                        (int) $datos['articulo_id']
                    )
                    ->lockForUpdate()
                    ->first();

                $disponible = $existenciaOrigen
                    ? bcadd(
                        (string) $existenciaOrigen->cantidad,
                        '0',
                        3
                    )
                    : '0.000';

                if (
                    !$existenciaOrigen ||
                    bccomp(
                        $disponible,
                        $cantidad,
                        3
                    ) < 0
                ) {
                    $body = [
                        'error' => [
                            'code' => 'STOCK_INSUFICIENTE',
                            'message' =>
                                'No existe stock suficiente para realizar el traslado.',
                            'details' => [
                                'almacen_id' => $origenId,
                                'tipo_articulo' =>
                                    'PRESENTACION',
                                'articulo_id' =>
                                    (int) $datos['articulo_id'],
                                'disponible' => $disponible,
                                'solicitado' => $cantidad,
                            ],
                        ],
                    ];

                    InventarioIdempotencia::create([
                        'clave' => $clave,
                        'huella_solicitud' => $huella,
                        'tipo_operacion' => 'TRASLADO',
                        'actor_usuario_id' => $actor,
                        'codigo_respuesta' => 409,
                        'respuesta_snapshot' => $body,
                    ]);

                    return [
                        'status' => 409,
                        'body' => $body,
                    ];
                }

                if (
                    $existenciaOrigen->unidad !==
                    $articulo['unidad']
                ) {
                    throw new InventarioException(
                        409,
                        'UNIDAD_INCONSISTENTE',
                        'La unidad del artículo no coincide con la existencia de origen.'
                    );
                }

                /*
                 * Solo después de comprobar stock suficiente creamos,
                 * si hace falta, la existencia en MOSTRADOR.
                 */
                DB::table('existencia')->insertOrIgnore([
                    'almacen_id' => $destinoId,
                    'tipo_articulo' => 'PRESENTACION',
                    'articulo_id' =>
                        (int) $datos['articulo_id'],
                    'cantidad' => '0.000',
                    'unidad' => $articulo['unidad'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $existenciaDestino = Existencia::query()
                    ->where('almacen_id', $destinoId)
                    ->where(
                        'tipo_articulo',
                        'PRESENTACION'
                    )
                    ->where(
                        'articulo_id',
                        (int) $datos['articulo_id']
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $existenciaDestino->unidad !==
                    $articulo['unidad']
                ) {
                    throw new InventarioException(
                        409,
                        'UNIDAD_INCONSISTENTE',
                        'La unidad del artículo no coincide con la existencia de destino.'
                    );
                }

                $nuevoOrigen = bcsub(
                    $disponible,
                    $cantidad,
                    3
                );

                $nuevoDestino = bcadd(
                    (string) $existenciaDestino->cantidad,
                    $cantidad,
                    3
                );

                if (
                    bccomp(
                        $nuevoDestino,
                        '999999999.999',
                        3
                    ) > 0
                ) {
                    throw new InventarioException(
                        422,
                        'CANTIDAD_FUERA_DE_RANGO',
                        'La existencia resultante en destino supera el límite permitido.'
                    );
                }

                $existenciaOrigen->update([
                    'cantidad' => $nuevoOrigen,
                ]);

                $existenciaDestino->update([
                    'cantidad' => $nuevoDestino,
                ]);

                $movimiento = Movimiento::create([
                    'tipo' => 'TRASLADO',
                    'tipo_articulo' => 'PRESENTACION',
                    'articulo_id' =>
                        (int) $datos['articulo_id'],
                    'cantidad' => $cantidad,
                    'unidad' => $articulo['unidad'],
                    'almacen_origen_id' => $origenId,
                    'almacen_destino_id' => $destinoId,
                    'motivo' => $motivo,
                    'observaciones' => $observaciones,
                    'referencia_tipo' => null,
                    'referencia_id' => null,
                    'actor_usuario_id' => $actor,
                ]);

                $existenciaOrigen->refresh();
                $existenciaDestino->refresh();

                $body = [
                    'message' =>
                        'Traslado registrado correctamente.',

                    'movimiento' => [
                        'id_movimiento' =>
                            $movimiento->id_movimiento,
                        'tipo' => 'TRASLADO',
                        'tipo_articulo' =>
                            'PRESENTACION',
                        'articulo_id' =>
                            $movimiento->articulo_id,
                        'cantidad' =>
                            $movimiento->cantidad,
                        'unidad' =>
                            $movimiento->unidad,
                        'almacen_origen_id' =>
                            $movimiento->almacen_origen_id,
                        'almacen_destino_id' =>
                            $movimiento->almacen_destino_id,
                        'motivo' =>
                            $movimiento->motivo,
                        'observaciones' =>
                            $movimiento->observaciones,
                        'created_at' =>
                            $movimiento->created_at,
                    ],

                    'existencias' => [
                        'origen' => [
                            'almacen_id' =>
                                $existenciaOrigen->almacen_id,
                            'tipo_articulo' =>
                                'PRESENTACION',
                            'articulo_id' =>
                                $existenciaOrigen->articulo_id,
                            'cantidad' =>
                                $existenciaOrigen->cantidad,
                            'unidad' =>
                                $existenciaOrigen->unidad,
                        ],

                        'destino' => [
                            'almacen_id' =>
                                $existenciaDestino->almacen_id,
                            'tipo_articulo' =>
                                'PRESENTACION',
                            'articulo_id' =>
                                $existenciaDestino->articulo_id,
                            'cantidad' =>
                                $existenciaDestino->cantidad,
                            'unidad' =>
                                $existenciaDestino->unidad,
                        ],
                    ],
                ];

                InventarioIdempotencia::create([
                    'clave' => $clave,
                    'huella_solicitud' => $huella,
                    'tipo_operacion' => 'TRASLADO',
                    'actor_usuario_id' => $actor,
                    'codigo_respuesta' => 201,
                    'respuesta_snapshot' => $body,
                ]);

                return [
                    'status' => 201,
                    'body' => $body,
                ];
            });
        } catch (QueryException $e) {
            if (
                in_array(
                    (string) $e->getCode(),
                    ['23505', '23000', '19'],
                    true
                )
            ) {
                $previa = InventarioIdempotencia::query()
                    ->where('clave', $clave)
                    ->first();

                if ($previa) {
                    return $this->respuestaPrevia(
                        $previa,
                        $huella
                    );
                }
            }

            throw $e;
        }
    }

    private function validarAlmacenes(
        ?Almacen $origen,
        ?Almacen $destino
    ): void {
        if (!$origen) {
            throw new InventarioException(
                404,
                'ALMACEN_ORIGEN_NO_ENCONTRADO',
                'El almacén de origen no existe.'
            );
        }

        if (!$destino) {
            throw new InventarioException(
                404,
                'ALMACEN_DESTINO_NO_ENCONTRADO',
                'El almacén de destino no existe.'
            );
        }

        if (!$origen->activo || !$destino->activo) {
            throw new InventarioException(
                409,
                'ALMACEN_INACTIVO',
                'Los almacenes del traslado deben estar activos.'
            );
        }

        if (
            $origen->tipo !== 'PRODUCCION' ||
            $destino->tipo !== 'MOSTRADOR'
        ) {
            throw new InventarioException(
                422,
                'TRASLADO_NO_PERMITIDO',
                'El traslado permitido es de PRODUCCION hacia MOSTRADOR.'
            );
        }
    }

    private function respuestaPrevia(
        InventarioIdempotencia $registro,
        string $huella
    ): array {
        if (
            !hash_equals(
                $registro->huella_solicitud,
                $huella
            )
        ) {
            throw new InventarioException(
                409,
                'CLAVE_IDEMPOTENTE_EN_CONFLICTO',
                'La clave ya fue utilizada con otra solicitud.'
            );
        }

        if (
            !$registro->codigo_respuesta ||
            !is_array($registro->respuesta_snapshot)
        ) {
            throw new InventarioException(
                409,
                'OPERACION_IDEMPOTENTE_INCOMPLETA',
                'La operación previa todavía no tiene una respuesta final.'
            );
        }

        return [
            'status' => $registro->codigo_respuesta,
            'body' => $registro->respuesta_snapshot,
        ];
    }
}