<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class SalesDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    private int $actorUsuarioId = 7;

    private array $presentaciones = [
        2  => ['Torta de Chocolate - Pequeña', 95],
        3  => ['Torta de Chocolate - Mediana', 150],
        4  => ['Torta de Chocolate - Grande', 220],

        5  => ['Torta de Vainilla - Pequeña', 90],
        6  => ['Torta de Vainilla - Mediana', 145],
        7  => ['Torta de Vainilla - Grande', 210],

        8  => ['Torta Selva Negra - Pequeña', 110],
        9  => ['Torta Selva Negra - Mediana', 175],
        10 => ['Torta Selva Negra - Grande', 250],

        11 => ['Torta Red Velvet - Pequeña', 115],
        12 => ['Torta Red Velvet - Mediana', 185],
        13 => ['Torta Red Velvet - Grande', 265],

        14 => ['Torta Tres Leches - Pequeña', 105],
        15 => ['Torta Tres Leches - Mediana', 165],
        16 => ['Torta Tres Leches - Grande', 235],

        17 => ['Torta de Zanahoria - Pequeña', 100],
        18 => ['Torta de Zanahoria - Mediana', 160],
        19 => ['Torta de Zanahoria - Grande', 230],

        20 => ['Cheesecake de Frutos Rojos - Porción', 25],
        21 => ['Cheesecake de Frutos Rojos - Entero', 180],

        22 => ['Pie de Limón - Porción', 18],
        23 => ['Pie de Limón - Entero', 120],

        24 => ['Brownie Clásico - Unidad', 15],
        25 => ['Brownie Clásico - Caja x6', 80],

        26 => ['Alfajor de Chocolate - Unidad', 12],
        27 => ['Alfajor de Chocolate - Caja x6', 65],

        28 => ['Cupcake de Chocolate - Unidad', 14],
        29 => ['Cupcake de Chocolate - Caja x6', 78],
        30 => ['Cupcake de Chocolate - Caja x12', 145],

        31 => ['Cupcake de Vainilla - Unidad', 13],
        32 => ['Cupcake de Vainilla - Caja x6', 72],
        33 => ['Cupcake de Vainilla - Caja x12', 135],

        34 => ['Cupcake Red Velvet - Unidad', 15],
        35 => ['Cupcake Red Velvet - Caja x6', 84],
        36 => ['Cupcake Red Velvet - Caja x12', 158],

        37 => ['Galleta con Chispas de Chocolate - Unidad', 8],
        38 => ['Galleta con Chispas de Chocolate - Caja x6', 42],
        39 => ['Galleta con Chispas de Chocolate - Caja x12', 78],

        40 => ['Galleta de Avena - Unidad', 8],
        41 => ['Galleta de Avena - Caja x6', 42],
        42 => ['Galleta de Avena - Caja x12', 78],

        43 => ['Roll de Canela - Unidad', 14],
        44 => ['Roll de Canela - Caja x6', 75],
        45 => ['Roll de Canela - Caja x12', 140],

        46 => ['Croissant de Chocolate - Unidad', 16],
        47 => ['Croissant de Chocolate - Caja x6', 88],

        48 => ['Empanada de Manjar - Unidad', 10],
        49 => ['Empanada de Manjar - Caja x6', 55],
    ];

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'SalesDemoSeeder no puede ejecutarse en producción.'
            );
        }

        $this->actorUsuarioId =
            (int) env('DEMO_ACTOR_USUARIO_ID', 7);

        mt_srand(261121);

        DB::transaction(function (): void {
            for ($i = 1; $i <= 400; $i++) {
                $estado =
                    $this->estadoVenta($i);

                $fechaVenta =
                    $this->fechaVenta($i);

                $observacion =
                    self::MARCA .
                    ' | Venta demo #' .
                    str_pad(
                        (string) $i,
                        4,
                        '0',
                        STR_PAD_LEFT
                    );

                $esOcasional =
                    ($i % 7 === 0);

                $idCliente =
                    $esOcasional
                        ? null
                        : 2 + (($i * 13) % 100);

                $nombreOcasional =
                    $esOcasional
                        ? 'Cliente ocasional demo ' .
                            str_pad(
                                (string) $i,
                                3,
                                '0',
                                STR_PAD_LEFT
                            )
                        : null;

                $venta =
                    DB::table('venta')
                        ->where(
                            'observaciones',
                            $observacion
                        )
                        ->first();

                if ($venta) {
                    $ventaId =
                        (int) $venta->id_venta;

                    DB::table('detalle_venta')
                        ->where(
                            'id_venta',
                            $ventaId
                        )
                        ->delete();
                } else {
                    $ventaId = 0;
                }

                $total =
                    $this->crearDetalles(
                        $ventaId,
                        $i,
                        false
                    );

                /*
                 * Cuando la venta todavía no existe necesitamos
                 * crearla antes de crear físicamente sus detalles.
                 */
                if (!$venta) {
                    $operacionStock =
                        $estado === 'CONFIRMADA'
                            ? (string) Str::uuid()
                            : null;

                    $ventaId =
                        (int) DB::table('venta')
                            ->insertGetId(
                                [
                                    'id_cliente' =>
                                        $idCliente,

                                    'nombre_cliente_ocasional' =>
                                        $nombreOcasional,

                                    'id_usuario' =>
                                        $this->actorUsuarioId,

                                    'fecha_venta' =>
                                        $fechaVenta,

                                    'total' =>
                                        0,

                                    'moneda' =>
                                        'BOB',

                                    'estado' =>
                                        $estado,

                                    'operacion_stock_id' =>
                                        $operacionStock,

                                    'id_usuario_confirmacion' =>
                                        $estado === 'CONFIRMADA'
                                            ? $this->actorUsuarioId
                                            : null,

                                    'fecha_confirmacion' =>
                                        $estado === 'CONFIRMADA'
                                            ? $fechaVenta
                                                ->copy()
                                                ->addMinutes(5)
                                            : null,

                                    'observaciones' =>
                                        $observacion,

                                    'id_usuario_cancelacion' =>
                                        $estado === 'CANCELADA'
                                            ? $this->actorUsuarioId
                                            : null,

                                    'motivo_cancelacion' =>
                                        $estado === 'CANCELADA'
                                            ? 'Cancelación demo solicitada por el cliente.'
                                            : null,

                                    'fecha_cancelacion' =>
                                        $estado === 'CANCELADA'
                                            ? $fechaVenta
                                                ->copy()
                                                ->addMinutes(30)
                                            : null,

                                    'created_at' =>
                                        $fechaVenta,

                                    'updated_at' =>
                                        $fechaVenta,
                                ],
                                'id_venta'
                            );

                    /*
                     * Ahora sí insertamos los detalles.
                     */
                    $total =
                        $this->crearDetalles(
                            $ventaId,
                            $i,
                            true
                        );
                } else {
                    /*
                     * Venta demo existente:
                     * conservamos su UUID de stock.
                     */
                    $operacionStock =
                        $estado === 'CONFIRMADA'
                            ? (
                                $venta->operacion_stock_id
                                ?: (string) Str::uuid()
                            )
                            : null;

                    $total =
                        $this->crearDetalles(
                            $ventaId,
                            $i,
                            true
                        );

                    DB::table('venta')
                        ->where(
                            'id_venta',
                            $ventaId
                        )
                        ->update([
                            'id_cliente' =>
                                $idCliente,

                            'nombre_cliente_ocasional' =>
                                $nombreOcasional,

                            'id_usuario' =>
                                $this->actorUsuarioId,

                            'fecha_venta' =>
                                $fechaVenta,

                            'total' =>
                                $total,

                            'moneda' =>
                                'BOB',

                            'estado' =>
                                $estado,

                            'operacion_stock_id' =>
                                $operacionStock,

                            'id_usuario_confirmacion' =>
                                $estado === 'CONFIRMADA'
                                    ? $this->actorUsuarioId
                                    : null,

                            'fecha_confirmacion' =>
                                $estado === 'CONFIRMADA'
                                    ? $fechaVenta
                                        ->copy()
                                        ->addMinutes(5)
                                    : null,

                            'id_usuario_cancelacion' =>
                                $estado === 'CANCELADA'
                                    ? $this->actorUsuarioId
                                    : null,

                            'motivo_cancelacion' =>
                                $estado === 'CANCELADA'
                                    ? 'Cancelación demo solicitada por el cliente.'
                                    : null,

                            'fecha_cancelacion' =>
                                $estado === 'CANCELADA'
                                    ? $fechaVenta
                                        ->copy()
                                        ->addMinutes(30)
                                    : null,

                            'updated_at' =>
                                $fechaVenta,
                        ]);
                }

                /*
                 * En la creación inicial todavía faltaba guardar
                 * el total calculado.
                 */
                DB::table('venta')
                    ->where(
                        'id_venta',
                        $ventaId
                    )
                    ->update([
                        'total' => $total,
                    ]);

                if ($estado === 'CONFIRMADA') {
                    $this->crearConfirmacion(
                        $ventaId,
                        $i,
                        $fechaVenta
                    );
                } else {
                    /*
                     * BORRADOR y CANCELADA no deben conservar
                     * una confirmación APLICADA.
                     */
                    DB::table('venta_confirmacion')
                        ->where(
                            'id_venta',
                            $ventaId
                        )
                        ->delete();
                }
            }
        });

        $this->command?->info(
            'SalesDemoSeeder cargado correctamente.'
        );
    }

    private function estadoVenta(
        int $i
    ): string {
        if ($i <= 350) {
            return 'CONFIRMADA';
        }

        if ($i <= 380) {
            return 'CANCELADA';
        }

        return 'BORRADOR';
    }

    private function fechaVenta(
        int $i
    ): Carbon {
        /*
         * 300 ventas confirmadas distribuidas
         * entre enero y octubre de 2026.
         */
        if ($i <= 300) {
            $mes =
                intdiv($i - 1, 30) + 1;

            $posicion =
                ($i - 1) % 30;

            $dia =
                1 + (
                    ($posicion * 23 + $i) %
                    27
                );

            return Carbon::create(
                2026,
                $mes,
                $dia,
                8 + ($i % 11),
                ($i * 7) % 60,
                0
            );
        }

        /*
         * 30 ventas entre el 1 y 14 de noviembre.
         */
        if ($i <= 330) {
            $indice =
                $i - 301;

            return Carbon::create(
                2026,
                11,
                1 + ($indice % 14),
                8 + ($indice % 11),
                ($indice * 9) % 60,
                0
            );
        }

        /*
         * Las últimas 20 CONFIRMADAS quedan
         * dentro de los últimos siete días.
         *
         * Las últimas ocho son HOY.
         */
        if ($i <= 350) {
            $indice =
                $i - 331;

            if ($indice >= 12) {
                return Carbon::now()
                    ->startOfDay()
                    ->addHours(
                        8 + (($indice - 12) % 11)
                    )
                    ->addMinutes(
                        ($indice * 7) % 50
                    );
            }

            return Carbon::now()
                ->subDays(
                    1 + ($indice % 6)
                )
                ->startOfDay()
                ->addHours(
                    9 + ($indice % 10)
                )
                ->addMinutes(
                    ($indice * 11) % 50
                );
        }

        /*
         * Ventas CANCELADAS:
         * histórico de febrero a noviembre.
         */
        if ($i <= 380) {
            $indice =
                $i - 351;

            $mes =
                2 + ($indice % 10);

            $dia =
                2 + (($indice * 3) % 18);

            return Carbon::create(
                2026,
                $mes,
                $dia,
                9 + ($indice % 9),
                ($indice * 13) % 60,
                0
            );
        }

        /*
         * BORRADORES recientes.
         */
        $indice =
            $i - 381;

        return Carbon::now()
            ->subDays(
                $indice % 8
            )
            ->startOfDay()
            ->addHours(
                8 + ($indice % 11)
            )
            ->addMinutes(
                ($indice * 5) % 55
            );
    }

    private function crearDetalles(
        int $ventaId,
        int $indiceVenta,
        bool $insertar
    ): float {
        $cantidadLineas =
            1 + ($indiceVenta % 3);

        $total = 0;

        $utilizados = [];

        for (
            $linea = 0;
            $linea < $cantidadLineas;
            $linea++
        ) {
            $presentacionId =
                2 + (
                    (
                        $indiceVenta * 7 +
                        $linea * 11
                    ) %
                    48
                );

            while (
                isset(
                    $utilizados[
                        $presentacionId
                    ]
                )
            ) {
                $presentacionId++;

                if ($presentacionId > 49) {
                    $presentacionId = 2;
                }
            }

            $utilizados[
                $presentacionId
            ] = true;

            [
                $nombre,
                $precio
            ] =
                $this->presentaciones[
                    $presentacionId
                ];

            $cantidad =
                1 + (
                    (
                        $indiceVenta +
                        $linea
                    ) %
                    3
                );

            $personalizacion =
                0;

            $detallePersonalizacion =
                null;

            /*
             * Las tortas admiten personalización.
             */
            if (
                $presentacionId >= 2 &&
                $presentacionId <= 19 &&
                (
                    (
                        $indiceVenta +
                        $linea
                    ) %
                    4 === 0
                )
            ) {
                $personalizacion =
                    [
                        10,
                        15,
                        20,
                        25,
                    ][
                        (
                            $indiceVenta +
                            $linea
                        ) %
                        4
                    ];

                $detallePersonalizacion =
                    [
                        'Mensaje de cumpleaños',
                        'Decoración temática',
                        'Nombre personalizado',
                        'Decoración floral',
                    ][
                        (
                            $indiceVenta +
                            $linea
                        ) %
                        4
                    ];
            }

            $subtotal =
                round(
                    ($precio * $cantidad) +
                    $personalizacion,
                    2
                );

            $total +=
                $subtotal;

            if ($insertar) {
                DB::table(
                    'detalle_venta'
                )->insert([
                    'id_venta' =>
                        $ventaId,

                    'presentacion_id' =>
                        $presentacionId,

                    'nombre_presentacion_snapshot' =>
                        $nombre,

                    'precio_unitario_snapshot' =>
                        $precio,

                    'cantidad' =>
                        $cantidad,

                    'costo_personalizacion' =>
                        $personalizacion,

                    'detalle_personalizacion' =>
                        $detallePersonalizacion,

                    'subtotal' =>
                        $subtotal,

                    'created_at' =>
                        now(),

                    'updated_at' =>
                        now(),
                ]);
            }
        }

        return round(
            $total,
            2
        );
    }

    private function crearConfirmacion(
        int $ventaId,
        int $indiceVenta,
        Carbon $fechaVenta
    ): void {
        $clave =
            'DEMO-VENTA-CONFIRMAR-' .
            str_pad(
                (string) $indiceVenta,
                4,
                '0',
                STR_PAD_LEFT
            );

        $items =
            DB::table('detalle_venta')
                ->where(
                    'id_venta',
                    $ventaId
                )
                ->orderBy(
                    'id_detalle_venta'
                )
                ->get([
                    'presentacion_id',
                    'cantidad',
                    'subtotal',
                ])
                ->map(
                    fn ($item) => [
                        'presentacion_id' =>
                            (int)
                            $item->presentacion_id,

                        'cantidad' =>
                            (int)
                            $item->cantidad,

                        'subtotal' =>
                            (float)
                            $item->subtotal,
                    ]
                )
                ->values()
                ->all();

        $existente =
            DB::table(
                'venta_confirmacion'
            )
                ->where(
                    'id_venta',
                    $ventaId
                )
                ->first();

        $datos = [
            'clave' =>
                $clave,

            'hash_solicitud' =>
                hash(
                    'sha256',
                    json_encode($items)
                ),

            'id_usuario' =>
                $this->actorUsuarioId,

            'estado' =>
                'APLICADA',

            'items_snapshot' =>
                json_encode(
                    $items,
                    JSON_UNESCAPED_UNICODE
                ),

            'codigo_http' =>
                200,

            'codigo_resultado' =>
                'VENTA_CONFIRMADA',

            'respuesta_snapshot' =>
                json_encode(
                    [
                        'demo' => true,
                        'id_venta' => $ventaId,
                        'estado' => 'CONFIRMADA',
                    ],
                    JSON_UNESCAPED_UNICODE
                ),

            'confirmado_at' =>
                $fechaVenta
                    ->copy()
                    ->addMinutes(5),

            'rechazado_at' =>
                null,

            'updated_at' =>
                $fechaVenta
                    ->copy()
                    ->addMinutes(5),
        ];

        if ($existente) {
            DB::table(
                'venta_confirmacion'
            )
                ->where(
                    'id_venta_confirmacion',
                    $existente
                        ->id_venta_confirmacion
                )
                ->update($datos);

            return;
        }

        DB::table(
            'venta_confirmacion'
        )->insert(
            array_merge(
                $datos,
                [
                    'id_venta' =>
                        $ventaId,

                    'operacion_id' =>
                        (string) Str::uuid(),

                    'created_at' =>
                        $fechaVenta,
                ]
            )
        );
    }
}