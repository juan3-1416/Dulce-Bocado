<?php

namespace App\Services\Inventario;

use App\Models\Almacen;
use App\Models\Existencia;
use App\Models\InventarioIdempotencia;
use App\Models\Movimiento;
use App\Services\Catalogo\CatalogoArticuloService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class EgresoService
{
    public function __construct(
        private CatalogoArticuloService $catalogo,
    ) {}

    public function registrar(
        array $datos,
        int $actor
    ): array {
        $clave = $datos['idempotency_key'];

        $cantidad = bcadd(
            (string) $datos['cantidad'],
            '0',
            3
        );

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
                'tipo_articulo' => $datos['tipo_articulo'],
                'articulo_id' => (int) $datos['articulo_id'],
                'almacen_id' => (int) $datos['almacen_id'],
                'cantidad' => $cantidad,
                'motivo' => $motivo,
                'observaciones' => $observaciones,
            ], JSON_THROW_ON_ERROR)
        );

        $previa = InventarioIdempotencia::query()
            ->where('clave', $clave)
            ->first();

        if ($previa) {
            return $this->respuestaPrevia(
                $previa,
                $huella
            );
        }

        $almacen = Almacen::find(
            (int) $datos['almacen_id']
        );

        if (!$almacen) {
            throw new InventarioException(
                404,
                'ALMACEN_NO_ENCONTRADO',
                'El almacén no existe.'
            );
        }

        if (!$almacen->activo) {
            throw new InventarioException(
                409,
                'ALMACEN_INACTIVO',
                'El almacén está inactivo.'
            );
        }

        $this->validarCompatibilidad(
            $almacen,
            $datos['tipo_articulo']
        );

        $articulo = $this->catalogo->obtener(
            $datos['tipo_articulo'],
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
                $motivo,
                $observaciones,
                $articulo
            ) {
                $almacen = Almacen::query()
                    ->whereKey((int) $datos['almacen_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if (!$almacen->activo) {
                    throw new InventarioException(
                        409,
                        'ALMACEN_INACTIVO',
                        'El almacén está inactivo.'
                    );
                }

                $this->validarCompatibilidad(
                    $almacen,
                    $datos['tipo_articulo']
                );

                $existencia = Existencia::query()
                    ->where(
                        'almacen_id',
                        $almacen->id_almacen
                    )
                    ->where(
                        'tipo_articulo',
                        $datos['tipo_articulo']
                    )
                    ->where(
                        'articulo_id',
                        (int) $datos['articulo_id']
                    )
                    ->lockForUpdate()
                    ->first();

                $disponible = $existencia
                    ? bcadd(
                        (string) $existencia->cantidad,
                        '0',
                        3
                    )
                    : '0.000';

                if (
                    !$existencia ||
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
                                'No existe stock suficiente para realizar el egreso.',
                            'details' => [
                                'almacen_id' =>
                                    $almacen->id_almacen,
                                'tipo_articulo' =>
                                    $datos['tipo_articulo'],
                                'articulo_id' =>
                                    (int) $datos['articulo_id'],
                                'disponible' =>
                                    $disponible,
                                'solicitado' =>
                                    $cantidad,
                            ],
                        ],
                    ];

                    InventarioIdempotencia::create([
                        'clave' => $clave,
                        'huella_solicitud' => $huella,
                        'tipo_operacion' => 'EGRESO',
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
                    $existencia->unidad !==
                    $articulo['unidad']
                ) {
                    throw new InventarioException(
                        409,
                        'UNIDAD_INCONSISTENTE',
                        'La unidad del artículo no coincide con la existencia registrada.'
                    );
                }

                $nuevoSaldo = bcsub(
                    $disponible,
                    $cantidad,
                    3
                );

                if (bccomp($nuevoSaldo, '0', 3) < 0) {
                    throw new InventarioException(
                        409,
                        'STOCK_INSUFICIENTE',
                        'No existe stock suficiente para realizar el egreso.'
                    );
                }

                $existencia->update([
                    'cantidad' => $nuevoSaldo,
                ]);

                $movimiento = Movimiento::create([
                    'tipo' => 'EGRESO',
                    'tipo_articulo' =>
                        $datos['tipo_articulo'],
                    'articulo_id' =>
                        (int) $datos['articulo_id'],
                    'cantidad' => $cantidad,
                    'unidad' => $articulo['unidad'],
                    'almacen_origen_id' =>
                        $almacen->id_almacen,
                    'almacen_destino_id' => null,
                    'motivo' => $motivo,
                    'observaciones' => $observaciones,
                    'referencia_tipo' => null,
                    'referencia_id' => null,
                    'actor_usuario_id' => $actor,
                ]);

                $existencia->refresh();

                $body = [
                    'message' =>
                        'Egreso registrado correctamente.',

                    'movimiento' => [
                        'id_movimiento' =>
                            $movimiento->id_movimiento,
                        'tipo' =>
                            $movimiento->tipo,
                        'tipo_articulo' =>
                            $movimiento->tipo_articulo,
                        'articulo_id' =>
                            $movimiento->articulo_id,
                        'cantidad' =>
                            $movimiento->cantidad,
                        'unidad' =>
                            $movimiento->unidad,
                        'almacen_origen_id' =>
                            $movimiento->almacen_origen_id,
                        'almacen_destino_id' => null,
                        'motivo' =>
                            $movimiento->motivo,
                        'observaciones' =>
                            $movimiento->observaciones,
                        'created_at' =>
                            $movimiento->created_at,
                    ],

                    'existencia' => [
                        'almacen_id' =>
                            $existencia->almacen_id,
                        'tipo_articulo' =>
                            $existencia->tipo_articulo,
                        'articulo_id' =>
                            $existencia->articulo_id,
                        'cantidad' =>
                            $existencia->cantidad,
                        'unidad' =>
                            $existencia->unidad,
                    ],
                ];

                InventarioIdempotencia::create([
                    'clave' => $clave,
                    'huella_solicitud' => $huella,
                    'tipo_operacion' => 'EGRESO',
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

    private function validarCompatibilidad(
        Almacen $almacen,
        string $tipoArticulo
    ): void {
        $compatible =
            (
                $tipoArticulo === 'MATERIA_PRIMA'
                && $almacen->tipo === 'MATERIAS_PRIMAS'
            )
            ||
            (
                $tipoArticulo === 'PRESENTACION'
                && in_array(
                    $almacen->tipo,
                    ['PRODUCCION', 'MOSTRADOR'],
                    true
                )
            );

        if (!$compatible) {
            throw new InventarioException(
                422,
                'ALMACEN_INCOMPATIBLE',
                'El almacén no es compatible con el tipo de artículo.'
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