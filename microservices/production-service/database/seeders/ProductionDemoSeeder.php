<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Illuminate\Support\Str;

class ProductionDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    private int $actorUsuarioId = 7;

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'ProductionDemoSeeder no puede ejecutarse en producción.'
            );
        }

        $this->actorUsuarioId =
            (int) env('DEMO_ACTOR_USUARIO_ID', 7);

        /*
         * Mapeo real Catalog:
         * presentacion_id => receta_id
         */
        $recetas = [
            2 => 34,
            3 => 33,
            4 => 32,
            5 => 37,
            6 => 36,
            7 => 35,
            8 => 46,
            9 => 45,
            10 => 44,
            11 => 43,
            12 => 42,
            13 => 41,
            14 => 49,
            15 => 48,
            16 => 47,
            17 => 40,
            18 => 39,
            19 => 38,
            20 => 29,
            21 => 28,
            22 => 31,
            23 => 30,
            24 => 27,
            25 => 26,
            26 => 25,
            27 => 24,
            28 => 4,
            29 => 3,
            30 => 2,
            31 => 7,
            32 => 6,
            33 => 5,
            34 => 10,
            35 => 9,
            36 => 8,
            37 => 13,
            38 => 12,
            39 => 11,
            40 => 16,
            41 => 15,
            42 => 14,
            43 => 23,
            44 => 22,
            45 => 21,
            46 => 18,
            47 => 17,
            48 => 20,
            49 => 19,
        ];

        DB::transaction(function () use ($recetas): void {
            $presentaciones =
                array_keys($recetas);

            for ($i = 1; $i <= 96; $i++) {
                $presentacionId =
                    $presentaciones[
                        ($i - 1) %
                        count($presentaciones)
                    ];

                $recetaId =
                    $recetas[$presentacionId];

                $estado =
                    $this->estadoProduccion($i);

                $fecha =
                    $this->fechaProduccion(
                        $i,
                        $estado
                    );

                $cantidad =
                    4 + (($i * 3) % 18);

                $observacion =
                    self::MARCA .
                    ' | Producción demo #' .
                    str_pad(
                        (string) $i,
                        3,
                        '0',
                        STR_PAD_LEFT
                    );

                $existente =
                    DB::table('produccion')
                        ->where(
                            'observaciones',
                            $observacion
                        )
                        ->first();

                $datos = [
                    'presentacion_id' =>
                        $presentacionId,

                    'receta_id' =>
                        $recetaId,

                    'cantidad' =>
                        $cantidad,

                    'estado' =>
                        $estado,

                    'consumo_snapshot' =>
                        json_encode(
                            $this->crearConsumoSnapshot(
                                $presentacionId,
                                $cantidad
                            ),
                            JSON_UNESCAPED_UNICODE
                        ),

                    'actor_usuario_id' =>
                        $this->actorUsuarioId,

                    'observaciones' =>
                        $observacion,

                    'codigo_rechazo' =>
                        $estado === 'RECHAZADA'
                            ? 'DEMO_INSUMO_INSUFICIENTE'
                            : null,

                    'fecha_completada' =>
                        $estado === 'COMPLETADA'
                            ? $fecha
                                ->copy()
                                ->addHours(2)
                            : null,

                    'fecha_rechazada' =>
                        $estado === 'RECHAZADA'
                            ? $fecha
                                ->copy()
                                ->addMinutes(30)
                            : null,

                    'updated_at' =>
                        $fecha,
                ];

                if ($existente) {
                    DB::table('produccion')
                        ->where(
                            'id_produccion',
                            $existente->id_produccion
                        )
                        ->update($datos);

                    $produccionId =
                        (int)
                        $existente->id_produccion;
                } else {
                    $operacionId =
                        (string) Str::uuid();

                    $produccionId =
                        (int) DB::table(
                            'produccion'
                        )->insertGetId(
                            array_merge(
                                $datos,
                                [
                                    'operacion_id' =>
                                        $operacionId,

                                    'created_at' =>
                                        $fecha,
                                ]
                            ),
                            'id_produccion'
                        );
                }

                $clave =
                    'DEMO-PROD-' .
                    str_pad(
                        (string) $i,
                        4,
                        '0',
                        STR_PAD_LEFT
                    );

                DB::table(
                    'produccion_idempotencia'
                )->updateOrInsert(
                    [
                        'clave' => $clave,
                    ],
                    [
                        'huella_solicitud' =>
                            hash(
                                'sha256',
                                $clave
                            ),

                        'id_produccion' =>
                            $produccionId,

                        'codigo_respuesta' =>
                            $estado === 'RECHAZADA'
                                ? 409
                                : 201,

                        'respuesta_snapshot' =>
                            json_encode(
                                [
                                    'demo' => true,
                                    'estado' =>
                                        $estado,
                                    'id_produccion' =>
                                        $produccionId,
                                ],
                                JSON_UNESCAPED_UNICODE
                            ),

                        'updated_at' =>
                            $fecha,

                        'created_at' =>
                            $fecha,
                    ]
                );
            }
        });

        $this->command?->info(
            'ProductionDemoSeeder cargado correctamente.'
        );
    }

    private function estadoProduccion(
        int $indice
    ): string {
        if ($indice <= 80) {
            return 'COMPLETADA';
        }

        if ($indice <= 90) {
            return 'EN_PROCESO';
        }

        return 'RECHAZADA';
    }

    private function fechaProduccion(
        int $indice,
        string $estado
    ): Carbon {
        /*
         * Producciones históricas enero-octubre.
         */
        if ($indice <= 70) {
            $mes =
                (($indice - 1) % 10) + 1;

            $dia =
                1 + (($indice * 3) % 24);

            return Carbon::create(
                2026,
                $mes,
                $dia,
                7 + ($indice % 10),
                ($indice * 7) % 60,
                0
            );
        }

        /*
         * Producciones completadas durante noviembre.
         */
        if ($indice <= 80) {
            $dia =
                2 + (($indice - 71) * 2);

            return Carbon::create(
                2026,
                11,
                min($dia, 20),
                8 + ($indice % 8),
                ($indice * 5) % 60,
                0
            );
        }

        /*
         * Producciones actualmente activas.
         * Algunas son de hoy y otras de días recientes.
         */
        if ($estado === 'EN_PROCESO') {
            return Carbon::now()
                ->subHours(
                    ($indice - 80) * 2
                )
                ->setSecond(0);
        }

        /*
         * Producciones rechazadas recientes.
         */
        return Carbon::now()
            ->subDays(
                $indice - 90
            )
            ->setHour(
                9 + ($indice % 7)
            )
            ->setMinute(
                ($indice * 4) % 60
            )
            ->setSecond(0);
    }

    private function crearConsumoSnapshot(
        int $presentacionId,
        int $cantidad
    ): array {
        /*
         * IDs de materias primas:
         * 2 Harina
         * 3 Azúcar
         * 4 Huevos
         * 5 Leche
         * 6 Mantequilla
         * 7 Chocolate
         * 8 Cacao
         * 9 Crema
         * 10 Queso crema
         * 11 Frutos rojos
         * 12 Limón
         * 13 Canela
         * 14 Avena
         * 15 Dulce de leche
         * 16 Esencia vainilla
         */

        if ($presentacionId <= 19) {
            $ingredientes = [
                [
                    'materia_prima_id' => 2,
                    'cantidad' =>
                        number_format(
                            350 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 3,
                    'cantidad' =>
                        number_format(
                            220 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 4,
                    'cantidad' =>
                        number_format(
                            3 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'unidad',
                ],
            ];
        } elseif ($presentacionId <= 27) {
            $ingredientes = [
                [
                    'materia_prima_id' => 2,
                    'cantidad' =>
                        number_format(
                            180 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 3,
                    'cantidad' =>
                        number_format(
                            120 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 6,
                    'cantidad' =>
                        number_format(
                            90 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
            ];
        } elseif ($presentacionId <= 36) {
            $ingredientes = [
                [
                    'materia_prima_id' => 2,
                    'cantidad' =>
                        number_format(
                            160 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 3,
                    'cantidad' =>
                        number_format(
                            110 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 5,
                    'cantidad' =>
                        number_format(
                            100 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'ml',
                ],
            ];
        } elseif ($presentacionId <= 42) {
            $ingredientes = [
                [
                    'materia_prima_id' => 2,
                    'cantidad' =>
                        number_format(
                            150 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 6,
                    'cantidad' =>
                        number_format(
                            80 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 14,
                    'cantidad' =>
                        number_format(
                            60 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
            ];
        } else {
            $ingredientes = [
                [
                    'materia_prima_id' => 2,
                    'cantidad' =>
                        number_format(
                            220 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 5,
                    'cantidad' =>
                        number_format(
                            120 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'ml',
                ],
                [
                    'materia_prima_id' => 6,
                    'cantidad' =>
                        number_format(
                            70 * $cantidad,
                            3,
                            '.',
                            ''
                        ),
                    'unidad' => 'g',
                ],
            ];
        }

        return [
            'unidad_terminado' => 'unidad',
            'ingredientes' => $ingredientes,
        ];
    }
}