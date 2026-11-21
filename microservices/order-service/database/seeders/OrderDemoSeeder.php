<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class OrderDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    private int $actorUsuarioId = 7;

    private array $presentaciones = [
        2  => ['Torta de Chocolate', 'Pequeña', 95, true],
        3  => ['Torta de Chocolate', 'Mediana', 150, true],
        4  => ['Torta de Chocolate', 'Grande', 220, true],

        5  => ['Torta de Vainilla', 'Pequeña', 90, true],
        6  => ['Torta de Vainilla', 'Mediana', 145, true],
        7  => ['Torta de Vainilla', 'Grande', 210, true],

        8  => ['Torta Selva Negra', 'Pequeña', 110, true],
        9  => ['Torta Selva Negra', 'Mediana', 175, true],
        10 => ['Torta Selva Negra', 'Grande', 250, true],

        11 => ['Torta Red Velvet', 'Pequeña', 115, true],
        12 => ['Torta Red Velvet', 'Mediana', 185, true],
        13 => ['Torta Red Velvet', 'Grande', 265, true],

        14 => ['Torta Tres Leches', 'Pequeña', 105, true],
        15 => ['Torta Tres Leches', 'Mediana', 165, true],
        16 => ['Torta Tres Leches', 'Grande', 235, true],

        17 => ['Torta de Zanahoria', 'Pequeña', 100, true],
        18 => ['Torta de Zanahoria', 'Mediana', 160, true],
        19 => ['Torta de Zanahoria', 'Grande', 230, true],

        20 => ['Cheesecake de Frutos Rojos', 'Porción', 25, false],
        21 => ['Cheesecake de Frutos Rojos', 'Entero', 180, false],

        22 => ['Pie de Limón', 'Porción', 18, false],
        23 => ['Pie de Limón', 'Entero', 120, false],

        24 => ['Brownie Clásico', 'Unidad', 15, false],
        25 => ['Brownie Clásico', 'Caja x6', 80, false],

        26 => ['Alfajor de Chocolate', 'Unidad', 12, false],
        27 => ['Alfajor de Chocolate', 'Caja x6', 65, false],

        28 => ['Cupcake de Chocolate', 'Unidad', 14, false],
        29 => ['Cupcake de Chocolate', 'Caja x6', 78, false],
        30 => ['Cupcake de Chocolate', 'Caja x12', 145, false],

        31 => ['Cupcake de Vainilla', 'Unidad', 13, false],
        32 => ['Cupcake de Vainilla', 'Caja x6', 72, false],
        33 => ['Cupcake de Vainilla', 'Caja x12', 135, false],

        34 => ['Cupcake Red Velvet', 'Unidad', 15, false],
        35 => ['Cupcake Red Velvet', 'Caja x6', 84, false],
        36 => ['Cupcake Red Velvet', 'Caja x12', 158, false],

        37 => ['Galleta con Chispas de Chocolate', 'Unidad', 8, false],
        38 => ['Galleta con Chispas de Chocolate', 'Caja x6', 42, false],
        39 => ['Galleta con Chispas de Chocolate', 'Caja x12', 78, false],

        40 => ['Galleta de Avena', 'Unidad', 8, false],
        41 => ['Galleta de Avena', 'Caja x6', 42, false],
        42 => ['Galleta de Avena', 'Caja x12', 78, false],

        43 => ['Roll de Canela', 'Unidad', 14, false],
        44 => ['Roll de Canela', 'Caja x6', 75, false],
        45 => ['Roll de Canela', 'Caja x12', 140, false],

        46 => ['Croissant de Chocolate', 'Unidad', 16, false],
        47 => ['Croissant de Chocolate', 'Caja x6', 88, false],

        48 => ['Empanada de Manjar', 'Unidad', 10, false],
        49 => ['Empanada de Manjar', 'Caja x6', 55, false],
    ];

    private array $nombres = [
        'María', 'José', 'Ana', 'Carlos',
        'Daniela', 'Luis', 'Camila', 'Jorge',
        'Valeria', 'Miguel', 'Fernanda', 'Diego',
        'Paola', 'Andrés', 'Gabriela', 'Sergio',
        'Lucía', 'Rodrigo', 'Natalia', 'Fernando',
    ];

    private array $apellidos = [
        'Gonzales Rojas',
        'Vargas Peña',
        'Mendoza Suárez',
        'Ribera Flores',
        'Salvatierra López',
        'Pérez Chávez',
        'Morales Ortiz',
        'Rojas Vaca',
        'Sánchez Méndez',
        'Torrez Aguilera',
        'Romero Justiniano',
        'Cuéllar Pinto',
        'Gutiérrez Cabrera',
        'Álvarez Mercado',
        'Castro Céspedes',
        'Vaca Rodríguez',
        'Flores Daza',
        'Méndez Parada',
        'Suárez Arce',
        'López Molina',
    ];

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'OrderDemoSeeder no puede ejecutarse en producción.'
            );
        }

        $this->actorUsuarioId =
            (int) env('DEMO_ACTOR_USUARIO_ID', 7);

        DB::transaction(function (): void {
            for ($i = 1; $i <= 100; $i++) {
                $estado = $this->estadoPedido($i);

                $fechaPedido =
                    $this->fechaPedido($i, $estado);

                $fechaEntrega =
                    $this->fechaEntrega(
                        $fechaPedido,
                        $i,
                        $estado
                    );

                $observacion =
                    self::MARCA .
                    ' | Pedido demo #' .
                    str_pad(
                        (string) $i,
                        3,
                        '0',
                        STR_PAD_LEFT
                    );

                /*
                 * 90% clientes registrados.
                 * 10% clientes ocasionales.
                 */
                $esOcasional =
                    ($i % 10 === 0);

                if ($esOcasional) {
                    $clienteId = null;
                    $clienteSnapshot = null;
                    $clienteOcasional =
                        'Cliente ocasional pedido ' .
                        str_pad(
                            (string) $i,
                            3,
                            '0',
                            STR_PAD_LEFT
                        );
                } else {
                    $clienteId =
                        2 + (($i * 17) % 100);

                    $clienteSnapshot =
                        $this->nombreCliente(
                            $clienteId
                        );

                    $clienteOcasional = null;
                }

                $existente =
                    DB::table('pedido')
                        ->where(
                            'observaciones',
                            $observacion
                        )
                        ->first();

                $datosPedido = [
                    'id_cliente' =>
                        $clienteId,

                    'nombre_cliente_snapshot' =>
                        $clienteSnapshot,

                    'nombre_cliente_ocasional' =>
                        $clienteOcasional,

                    'id_usuario' =>
                        $this->actorUsuarioId,

                    'fecha_pedido' =>
                        $fechaPedido,

                    'fecha_entrega' =>
                        $fechaEntrega
                            ->format('Y-m-d'),

                    'hora_entrega' =>
                        sprintf(
                            '%02d:00:00',
                            9 + ($i % 10)
                        ),

                    'total' => 0,

                    'moneda' =>
                        'BOB',

                    'estado' =>
                        $estado,

                    'observaciones' =>
                        $observacion,

                    'id_usuario_entrega' =>
                        $estado === 'ENTREGADO'
                            ? $this->actorUsuarioId
                            : null,

                    'fecha_entrega_efectiva' =>
                        $estado === 'ENTREGADO'
                            ? $fechaEntrega
                                ->copy()
                                ->setHour(12)
                                ->setMinute(
                                    ($i * 3) % 60
                                )
                            : null,

                    'id_usuario_cancelacion' =>
                        $estado === 'CANCELADO'
                            ? $this->actorUsuarioId
                            : null,

                    'motivo_cancelacion' =>
                        $estado === 'CANCELADO'
                            ? 'Cancelación demo solicitada por el cliente.'
                            : null,

                    'fecha_cancelacion' =>
                        $estado === 'CANCELADO'
                            ? $fechaPedido
                                ->copy()
                                ->addHours(6)
                            : null,

                    'fecha_actualizacion' =>
                        $fechaPedido,
                ];

                if ($existente) {
                    $pedidoId =
                        (int) $existente->id_pedido;

                    DB::table('detalle_pedido')
                        ->where(
                            'id_pedido',
                            $pedidoId
                        )
                        ->delete();

                    DB::table('pedido')
                        ->where(
                            'id_pedido',
                            $pedidoId
                        )
                        ->update($datosPedido);
                } else {
                    $pedidoId =
                        (int) DB::table('pedido')
                            ->insertGetId(
                                array_merge(
                                    $datosPedido,
                                    [
                                        'fecha_creacion' =>
                                            $fechaPedido,
                                    ]
                                ),
                                'id_pedido'
                            );
                }

                $total =
                    $this->crearDetalles(
                        $pedidoId,
                        $i,
                        $fechaPedido
                    );

                DB::table('pedido')
                    ->where(
                        'id_pedido',
                        $pedidoId
                    )
                    ->update([
                        'total' => $total,
                    ]);
            }
        });

        $this->command?->info(
            'OrderDemoSeeder cargado correctamente.'
        );
    }

    private function estadoPedido(int $i): string
    {
        if ($i <= 55) {
            return 'ENTREGADO';
        }

        if ($i <= 70) {
            return 'CANCELADO';
        }

        if ($i <= 85) {
            return 'EN_PROCESO';
        }

        return 'PROGRAMADO';
    }

    private function fechaPedido(
        int $i,
        string $estado
    ): Carbon {
        /*
         * 55 entregados:
         * enero a noviembre.
         */
        if ($estado === 'ENTREGADO') {
            $mes =
                1 + (($i - 1) % 11);

            $dia =
                2 + (($i * 3) % 18);

            return Carbon::create(
                2026,
                $mes,
                $dia,
                8 + ($i % 10),
                ($i * 7) % 60,
                0
            );
        }

        /*
         * 15 cancelados históricos.
         */
        if ($estado === 'CANCELADO') {
            $indice = $i - 56;

            $mes =
                2 + ($indice % 10);

            return Carbon::create(
                2026,
                $mes,
                3 + (($indice * 4) % 16),
                9 + ($indice % 8),
                ($indice * 11) % 60,
                0
            );
        }

        /*
         * EN_PROCESO:
         * pedidos recientes de los últimos días.
         */
        if ($estado === 'EN_PROCESO') {
            $indice =
                $i - 71;

            return Carbon::now()
                ->subDays(
                    $indice % 5
                )
                ->startOfDay()
                ->addHours(
                    8 + ($indice % 9)
                )
                ->addMinutes(
                    ($indice * 7) % 50
                );
        }

        /*
         * PROGRAMADO:
         * pedidos hechos recientemente.
         */
        $indice =
            $i - 86;

        return Carbon::now()
            ->subDays(
                $indice % 3
            )
            ->startOfDay()
            ->addHours(
                9 + ($indice % 8)
            )
            ->addMinutes(
                ($indice * 9) % 50
            );
    }

    private function fechaEntrega(
        Carbon $fechaPedido,
        int $i,
        string $estado
    ): Carbon {
        if ($estado === 'ENTREGADO') {
            return $fechaPedido
                ->copy()
                ->addDays(
                    2 + ($i % 4)
                );
        }

        if ($estado === 'CANCELADO') {
            return $fechaPedido
                ->copy()
                ->addDays(
                    3 + ($i % 5)
                );
        }

        if ($estado === 'EN_PROCESO') {
            return Carbon::now()
                ->startOfDay()
                ->addDays(
                    1 + ($i % 4)
                );
        }

        return Carbon::now()
            ->startOfDay()
            ->addDays(
                2 + (($i - 86) % 13)
            );
    }

    private function nombreCliente(
        int $clienteId
    ): string {
        /*
         * CustomerDemoSeeder creó:
         * ID 2 = demo #1
         * ...
         * ID 101 = demo #100
         */
        $indice =
            $clienteId - 2;

        $nombre =
            $this->nombres[
                $indice %
                count($this->nombres)
            ];

        $apellido =
            $this->apellidos[
                ($indice * 3) %
                count($this->apellidos)
            ];

        return $nombre . ' ' . $apellido;
    }

    private function crearDetalles(
        int $pedidoId,
        int $indicePedido,
        Carbon $fechaPedido
    ): float {
        $cantidadLineas =
            1 + ($indicePedido % 3);

        $utilizados = [];
        $total = 0;

        for (
            $linea = 0;
            $linea < $cantidadLineas;
            $linea++
        ) {
            $presentacionId =
                2 + (
                    (
                        $indicePedido * 5 +
                        $linea * 13
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
                $producto,
                $presentacion,
                $precio,
                $personalizable
            ] =
                $this->presentaciones[
                    $presentacionId
                ];

            $cantidad =
                1 + (
                    (
                        $indicePedido +
                        $linea
                    ) %
                    4
                );

            $costoPersonalizacion = 0;
            $detallePersonalizacion = null;

            if (
                $personalizable &&
                (
                    (
                        $indicePedido +
                        $linea
                    ) %
                    3 === 0
                )
            ) {
                $costoPersonalizacion =
                    [
                        15,
                        20,
                        25,
                        30,
                    ][
                        (
                            $indicePedido +
                            $linea
                        ) %
                        4
                    ];

                $detallePersonalizacion =
                    [
                        'Diseño para cumpleaños',
                        'Decoración infantil',
                        'Dedicatoria personalizada',
                        'Decoración especial',
                    ][
                        (
                            $indicePedido +
                            $linea
                        ) %
                        4
                    ];
            }

            $subtotal =
                round(
                    ($precio * $cantidad) +
                    $costoPersonalizacion,
                    2
                );

            DB::table('detalle_pedido')
                ->insert([
                    'id_pedido' =>
                        $pedidoId,

                    'presentacion_id' =>
                        $presentacionId,

                    'nombre_producto_snapshot' =>
                        $producto,

                    'nombre_presentacion_snapshot' =>
                        $presentacion,

                    'precio_unitario_snapshot' =>
                        $precio,

                    'cantidad' =>
                        $cantidad,

                    'detalle_personalizacion' =>
                        $detallePersonalizacion,

                    'costo_personalizacion' =>
                        $costoPersonalizacion,

                    'subtotal' =>
                        $subtotal,

                    'fecha_creacion' =>
                        $fechaPedido,

                    'fecha_actualizacion' =>
                        $fechaPedido,
                ]);

            $total += $subtotal;
        }

        return round($total, 2);
    }
}