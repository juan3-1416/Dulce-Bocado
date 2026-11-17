<?php

namespace App\Services\Inventario;

use App\Models\Almacen;
use App\Models\Existencia;
use App\Models\Movimiento;
use App\Models\ProduccionOperacion;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class ProduccionInventarioService
{
    public function aplicar(
        array $datos,
        int $actor
    ): array {
        $ingredientes = collect(
            $datos['ingredientes']
        )
            ->map(fn (array $item) => [
                'materia_prima_id' =>
                    (int) $item['materia_prima_id'],

                'cantidad' => bcadd(
                    (string) $item['cantidad'],
                    '0',
                    3
                ),

                'unidad' =>
                    (string) $item['unidad'],
            ])
            ->sortBy('materia_prima_id')
            ->values()
            ->all();

        $operacionId =
            (string) $datos['operacion_id'];

        $cantidadTerminada = bcadd(
            (string) $datos['cantidad_producida'],
            '0',
            3
        );

        $huella = hash(
            'sha256',
            json_encode([
                'actor' => $actor,
                'operacion_id' => $operacionId,
                'presentacion_id' =>
                    (int) $datos['presentacion_id'],
                'receta_id' =>
                    (int) $datos['receta_id'],
                'cantidad_producida' =>
                    (int) $datos['cantidad_producida'],
                'almacen_insumos_tipo' =>
                    $datos['almacen_insumos_tipo'],
                'almacen_terminados_tipo' =>
                    $datos['almacen_terminados_tipo'],
                'ingredientes' => $ingredientes,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = ProduccionOperacion::find(
            $operacionId
        );

        if ($previa) {
            return $this->respuestaPrevia(
                $previa,
                $huella
            );
        }

        try {
            return DB::transaction(function () use (
                $datos,
                $actor,
                $ingredientes,
                $operacionId,
                $cantidadTerminada,
                $huella
            ) {
                $almacenes = Almacen::query()
                    ->whereIn('tipo', [
                        'MATERIAS_PRIMAS',
                        'PRODUCCION',
                    ])
                    ->orderBy('id_almacen')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('tipo');

                $insumos = $almacenes->get(
                    'MATERIAS_PRIMAS'
                );

                $terminados = $almacenes->get(
                    'PRODUCCION'
                );

                if (
                    !$insumos ||
                    !$terminados ||
                    !$insumos->activo ||
                    !$terminados->activo
                ) {
                    throw new InventarioException(
                        503,
                        'ALMACENES_PRODUCCION_NO_DISPONIBLES',
                        'Los almacenes requeridos para producción no están disponibles.'
                    );
                }

                $operacion =
                    ProduccionOperacion::create([
                        'operacion_id' =>
                            $operacionId,

                        'huella_solicitud' =>
                            $huella,

                        'presentacion_id' =>
                            (int) $datos[
                                'presentacion_id'
                            ],

                        'cantidad_producida' =>
                            (int) $datos[
                                'cantidad_producida'
                            ],

                        'estado' =>
                            'EN_PROCESO',

                        'codigo_rechazo' =>
                            null,

                        'actor_usuario_id' =>
                            $actor,

                        'respuesta_snapshot' =>
                            null,
                    ]);

                $ids = array_map(
                    fn (array $item) =>
                        $item['materia_prima_id'],
                    $ingredientes
                );

                $existencias = Existencia::query()
                    ->where(
                        'almacen_id',
                        $insumos->id_almacen
                    )
                    ->where(
                        'tipo_articulo',
                        'MATERIA_PRIMA'
                    )
                    ->whereIn(
                        'articulo_id',
                        $ids
                    )
                    ->orderBy('articulo_id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('articulo_id');

                $nuevosSaldos = [];

                foreach (
                    $ingredientes as $ingrediente
                ) {
                    $id =
                        $ingrediente[
                            'materia_prima_id'
                        ];

                    $existencia =
                        $existencias->get($id);

                    $disponible = $existencia
                        ? bcadd(
                            (string)
                                $existencia->cantidad,
                            '0',
                            3
                        )
                        : '0.000';

                    if (
                        !$existencia ||
                        bccomp(
                            $disponible,
                            $ingrediente['cantidad'],
                            3
                        ) < 0
                    ) {
                        return $this->rechazar(
                            $operacion,
                            409,
                            'STOCK_INSUFICIENTE',
                            'No existe stock suficiente para completar la producción.',
                            [
                                'materia_prima_id' => $id,
                                'disponible' =>
                                    $disponible,
                                'requerido' =>
                                    $ingrediente[
                                        'cantidad'
                                    ],
                            ]
                        );
                    }

                    if (
                        $existencia->unidad !==
                        $ingrediente['unidad']
                    ) {
                        return $this->rechazar(
                            $operacion,
                            422,
                            'UNIDAD_INCONSISTENTE',
                            'La unidad de una materia prima no coincide con Inventory.',
                            [
                                'materia_prima_id' =>
                                    $id,
                            ]
                        );
                    }

                    $nuevosSaldos[$id] =
                        bcsub(
                            $disponible,
                            $ingrediente[
                                'cantidad'
                            ],
                            3
                        );
                }

                $existenciaTerminada =
                    Existencia::query()
                        ->where(
                            'almacen_id',
                            $terminados->id_almacen
                        )
                        ->where(
                            'tipo_articulo',
                            'PRESENTACION'
                        )
                        ->where(
                            'articulo_id',
                            (int) $datos[
                                'presentacion_id'
                            ]
                        )
                        ->lockForUpdate()
                        ->first();

                if (!$existenciaTerminada) {
                    DB::table('existencia')
                        ->insertOrIgnore([
                            'almacen_id' =>
                                $terminados
                                    ->id_almacen,

                            'tipo_articulo' =>
                                'PRESENTACION',

                            'articulo_id' =>
                                (int) $datos[
                                    'presentacion_id'
                                ],

                            'cantidad' =>
                                '0.000',

                            'unidad' =>
                                'unidad',

                            'created_at' =>
                                now(),

                            'updated_at' =>
                                now(),
                        ]);

                    $existenciaTerminada =
                        Existencia::query()
                            ->where(
                                'almacen_id',
                                $terminados
                                    ->id_almacen
                            )
                            ->where(
                                'tipo_articulo',
                                'PRESENTACION'
                            )
                            ->where(
                                'articulo_id',
                                (int) $datos[
                                    'presentacion_id'
                                ]
                            )
                            ->lockForUpdate()
                            ->firstOrFail();
                }

                if (
                    $existenciaTerminada->unidad !==
                    'unidad'
                ) {
                    return $this->rechazar(
                        $operacion,
                        422,
                        'UNIDAD_INCONSISTENTE',
                        'La unidad de la presentación terminada no es válida.'
                    );
                }

                $nuevoTerminado = bcadd(
                    (string)
                        $existenciaTerminada->cantidad,
                    $cantidadTerminada,
                    3
                );

                if (
                    bccomp(
                        $nuevoTerminado,
                        '999999999.999',
                        3
                    ) > 0
                ) {
                    return $this->rechazar(
                        $operacion,
                        422,
                        'CANTIDAD_FUERA_DE_RANGO',
                        'La existencia de producto terminado supera el límite permitido.'
                    );
                }

                /*
                 * Todas las validaciones terminaron.
                 * Recién ahora modificamos los saldos.
                 */
                foreach (
                    $ingredientes as $ingrediente
                ) {
                    $id =
                        $ingrediente[
                            'materia_prima_id'
                        ];

                    $existencia =
                        $existencias->get($id);

                    $existencia->update([
                        'cantidad' =>
                            $nuevosSaldos[$id],
                    ]);

                    Movimiento::create([
                        'tipo' =>
                            'PRODUCCION_CONSUMO',

                        'tipo_articulo' =>
                            'MATERIA_PRIMA',

                        'articulo_id' =>
                            $id,

                        'cantidad' =>
                            $ingrediente[
                                'cantidad'
                            ],

                        'unidad' =>
                            $ingrediente[
                                'unidad'
                            ],

                        'almacen_origen_id' =>
                            $insumos->id_almacen,

                        'almacen_destino_id' =>
                            null,

                        'motivo' =>
                            'Consumo de producción',

                        'observaciones' =>
                            null,

                        'referencia_tipo' =>
                            'PRODUCCION',

                        'referencia_id' =>
                            $operacionId,

                        'actor_usuario_id' =>
                            $actor,
                    ]);
                }

                $existenciaTerminada->update([
                    'cantidad' => $nuevoTerminado,
                ]);

                Movimiento::create([
                    'tipo' =>
                        'PRODUCCION_INGRESO',

                    'tipo_articulo' =>
                        'PRESENTACION',

                    'articulo_id' =>
                        (int) $datos[
                            'presentacion_id'
                        ],

                    'cantidad' =>
                        $cantidadTerminada,

                    'unidad' =>
                        'unidad',

                    'almacen_origen_id' =>
                        null,

                    'almacen_destino_id' =>
                        $terminados->id_almacen,

                    'motivo' =>
                        'Ingreso de producción terminada',

                    'observaciones' =>
                        null,

                    'referencia_tipo' =>
                        'PRODUCCION',

                    'referencia_id' =>
                        $operacionId,

                    'actor_usuario_id' =>
                        $actor,
                ]);

                $body = [
                    'operacion_id' =>
                        $operacionId,

                    'estado' =>
                        'APLICADA',
                ];

                $operacion->update([
                    'estado' =>
                        'APLICADA',

                    'codigo_rechazo' =>
                        null,

                    'respuesta_snapshot' =>
                        $body,
                ]);

                return [
                    'status' => 200,
                    'body' => $body,
                ];
            });
        } catch (QueryException $e) {
            if (
                in_array(
                    (string) $e->getCode(),
                    [
                        '23505',
                        '23000',
                        '19',
                    ],
                    true
                )
            ) {
                $previa =
                    ProduccionOperacion::find(
                        $operacionId
                    );

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

    public function consultar(
        string $operacionId
    ): ?array {
        $operacion =
            ProduccionOperacion::find(
                $operacionId
            );

        if (!$operacion) {
            return null;
        }

        if (
            $operacion->estado ===
            'APLICADA'
        ) {
            return [
                'operacion_id' =>
                    $operacionId,
                'estado' =>
                    'APLICADA',
            ];
        }

        if (
            $operacion->estado ===
            'RECHAZADA'
        ) {
            return is_array(
                $operacion->respuesta_snapshot
            )
                ? $operacion->respuesta_snapshot
                : [
                    'operacion_id' =>
                        $operacionId,

                    'estado' =>
                        'RECHAZADA',

                    'error' => [
                        'code' =>
                            $operacion
                                ->codigo_rechazo,

                        'message' =>
                            'La operación fue rechazada.',

                        'details' =>
                            (object) [],
                    ],
                ];
        }

        return [
            'operacion_id' =>
                $operacionId,
            'estado' =>
                'EN_PROCESO',
        ];
    }

    private function rechazar(
        ProduccionOperacion $operacion,
        int $status,
        string $codigo,
        string $mensaje,
        array $details = []
    ): array {
        $body = [
            'operacion_id' =>
                $operacion->operacion_id,

            'estado' =>
                'RECHAZADA',

            'error' => [
                'code' =>
                    $codigo,

                'message' =>
                    $mensaje,

                'details' =>
                    empty($details)
                        ? (object) []
                        : $details,
            ],
        ];

        $operacion->update([
            'estado' =>
                'RECHAZADA',

            'codigo_rechazo' =>
                $codigo,

            'respuesta_snapshot' =>
                $body,
        ]);

        return [
            'status' => $status,
            'body' => $body,
        ];
    }

    private function respuestaPrevia(
        ProduccionOperacion $operacion,
        string $huella
    ): array {
        if (
            !hash_equals(
                $operacion->huella_solicitud,
                $huella
            )
        ) {
            return [
                'status' => 422,

                'body' => [
                    'operacion_id' =>
                        $operacion->operacion_id,

                    'estado' =>
                        'RECHAZADA',

                    'error' => [
                        'code' =>
                            'OPERACION_ID_EN_CONFLICTO',

                        'message' =>
                            'El identificador de operación ya fue utilizado con otra solicitud.',

                        'details' =>
                            (object) [],
                    ],
                ],
            ];
        }

        if (
            $operacion->estado ===
            'APLICADA'
        ) {
            return [
                'status' => 200,
                'body' => [
                    'operacion_id' =>
                        $operacion->operacion_id,
                    'estado' =>
                        'APLICADA',
                ],
            ];
        }

        if (
            $operacion->estado ===
            'RECHAZADA'
        ) {
            $status =
                $operacion->codigo_rechazo ===
                'STOCK_INSUFICIENTE'
                    ? 409
                    : 422;

            return [
                'status' => $status,

                'body' =>
                    $operacion
                        ->respuesta_snapshot,
            ];
        }

        return [
            'status' => 200,

            'body' => [
                'operacion_id' =>
                    $operacion->operacion_id,

                'estado' =>
                    'EN_PROCESO',
            ],
        ];
    }
}