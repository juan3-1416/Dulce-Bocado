<?php

namespace Database\Seeders;

use App\Models\Usuario;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DashboardDemo2026Seeder extends Seeder
{
    private const MARCA = 'DASHBOARD_DEMO_2026';

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'DashboardDemo2026Seeder no puede ejecutarse en producción.'
            );
        }

        $usuarios = Usuario::query()
            ->where('activo', true)
            ->pluck('id_usuario')
            ->values();

        if ($usuarios->isEmpty()) {
            throw new RuntimeException(
                'No existen usuarios activos.'
            );
        }

        $clientes = DB::table('cliente')
            ->where('estado', true)
            ->pluck('id_cliente')
            ->values();

        if ($clientes->isEmpty()) {
            throw new RuntimeException(
                'No existen clientes activos.'
            );
        }

        $presentaciones =
            DB::table('producto_presentacion')
                ->orderBy(
                    'id_producto_presentacion'
                )
                ->get([
                    'id_producto_presentacion',
                    'precio',
                    'permite_personalizacion',
                ])
                ->values();

        if ($presentaciones->isEmpty()) {
            throw new RuntimeException(
                'No existen producto_presentacion.'
            );
        }

        DB::transaction(function () use (
            $usuarios,
            $clientes,
            $presentaciones
        ): void {
            $this->crearVentas(
                $usuarios,
                $clientes,
                $presentaciones
            );

            $this->crearPedidos(
                $usuarios,
                $clientes
            );

            $this->crearProduccion(
                $usuarios,
                $presentaciones
            );

            $this->actualizarVisitas();
        });

        $this->command?->info(
            'DashboardDemo2026Seeder cargado correctamente.'
        );
    }

    private function crearVentas(
        $usuarios,
        $clientes,
        $presentaciones
    ): void {
        for ($i = 1; $i <= 80; $i++) {
            $observacion =
                self::MARCA .
                ' | Venta noviembre #' .
                str_pad(
                    (string) $i,
                    3,
                    '0',
                    STR_PAD_LEFT
                );

            $fecha =
                $this->fechaVenta($i);

            /*
             * Dejamos 4 ventas anuladas,
             * todas fuera de los últimos 7 días.
             */
            $anulada = in_array(
                $i,
                [12, 24, 36, 48],
                true
            );

            $usuarioId =
                (int) $usuarios[
                    ($i - 1) %
                    $usuarios->count()
                ];

            /*
             * Aproximadamente 85% cliente registrado.
             */
            $esOcasional =
                ($i % 7 === 0);

            $clienteId =
                $esOcasional
                    ? null
                    : (int) $clientes[
                        ($i * 11) %
                        $clientes->count()
                    ];

            $nombreOcasional =
                $esOcasional
                    ? 'Cliente dashboard ' .
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
                $ventaId =
                    (int) DB::table('venta')
                        ->insertGetId(
                            [
                                'id_cliente' =>
                                    $clienteId,

                                'id_usuario' =>
                                    $usuarioId,

                                'nombre_cliente_ocasional' =>
                                    $nombreOcasional,

                                'fecha_venta' =>
                                    $fecha,

                                'total' =>
                                    0,

                                'estado' =>
                                    'REGISTRADA',

                                'observaciones' =>
                                    $observacion,

                                'fecha_creacion' =>
                                    $fecha,

                                'fecha_actualizacion' =>
                                    $fecha,

                                'id_usuario_anulacion' =>
                                    null,

                                'motivo_anulacion' =>
                                    null,

                                'fecha_anulacion' =>
                                    null,
                            ],
                            'id_venta'
                        );
            }

            $total =
                $this->crearDetallesVenta(
                    $ventaId,
                    $i,
                    $fecha,
                    $presentaciones
                );

            DB::table('venta')
                ->where(
                    'id_venta',
                    $ventaId
                )
                ->update([
                    'id_cliente' =>
                        $clienteId,

                    'id_usuario' =>
                        $usuarioId,

                    'nombre_cliente_ocasional' =>
                        $nombreOcasional,

                    'fecha_venta' =>
                        $fecha,

                    'total' =>
                        $total,

                    'estado' =>
                        $anulada
                            ? 'ANULADA'
                            : 'REGISTRADA',

                    'id_usuario_anulacion' =>
                        $anulada
                            ? $usuarioId
                            : null,

                    'motivo_anulacion' =>
                        $anulada
                            ? 'Anulación demo para dashboard.'
                            : null,

                    'fecha_anulacion' =>
                        $anulada
                            ? $fecha
                                ->copy()
                                ->addHours(2)
                            : null,

                    'fecha_actualizacion' =>
                        $fecha,
                ]);
        }
    }

    private function fechaVenta(int $i): Carbon
    {
        /*
         * Ventas 1-50:
         * 1 al 14 de noviembre.
         */
        if ($i <= 50) {
            $x = $i - 1;

            return Carbon::create(
                2026,
                11,
                1 + ($x % 14),
                8 + ($x % 11),
                ($x * 7) % 60,
                0
            );
        }

        /*
         * Ventas 51-70:
         * 15 al 20 de noviembre.
         */
        if ($i <= 70) {
            $x = $i - 51;

            return Carbon::create(
                2026,
                11,
                15 + ($x % 6),
                8 + ($x % 11),
                ($x * 11) % 60,
                0
            );
        }

        /*
         * Últimas 10 ventas:
         * hoy, 21/11/2026.
         */
        $x = $i - 71;

        return Carbon::create(
            2026,
            11,
            21,
            8 + $x,
            ($x * 5) % 60,
            0
        );
    }

    private function crearDetallesVenta(
        int $ventaId,
        int $indiceVenta,
        Carbon $fecha,
        $presentaciones
    ): float {
        $lineas =
            1 + ($indiceVenta % 3);

        $total = 0;
        $usados = [];

        for ($j = 0; $j < $lineas; $j++) {
            $pos =
                (
                    $indiceVenta * 7 +
                    $j * 5
                ) %
                $presentaciones->count();

            $pp =
                $presentaciones[$pos];

            $ppId =
                (int)
                $pp->id_producto_presentacion;

            while (isset($usados[$ppId])) {
                $pos =
                    ($pos + 1) %
                    $presentaciones->count();

                $pp =
                    $presentaciones[$pos];

                $ppId =
                    (int)
                    $pp->id_producto_presentacion;
            }

            $usados[$ppId] = true;

            $precio =
                round(
                    (float) $pp->precio,
                    2
                );

            $cantidad =
                1 + (
                    (
                        $indiceVenta +
                        $j
                    ) %
                    3
                );

            $costoPersonalizacion = 0;
            $detallePersonalizacion = null;

            if (
                (bool)
                    $pp->permite_personalizacion &&
                (
                    (
                        $indiceVenta +
                        $j
                    ) %
                    4 === 0
                )
            ) {
                $opciones =
                    [10, 15, 20, 25];

                $costoPersonalizacion =
                    $opciones[
                        (
                            $indiceVenta +
                            $j
                        ) %
                        count($opciones)
                    ];

                $detallePersonalizacion =
                    'Personalización demo dashboard';
            }

            $subtotal =
                round(
                    ($precio * $cantidad) +
                    $costoPersonalizacion,
                    2
                );

            /*
             * Costo histórico realista:
             * aproximadamente 55% del precio.
             */
            $costoUnitario =
                round(
                    $precio * 0.55,
                    2
                );

            $costoTotal =
                round(
                    ($costoUnitario * $cantidad) +
                    ($costoPersonalizacion * 0.25),
                    2
                );

            DB::table('detalle_venta')
                ->insert([
                    'id_venta' =>
                        $ventaId,

                    'id_producto_presentacion' =>
                        $ppId,

                    'cantidad' =>
                        $cantidad,

                    'precio_unitario' =>
                        $precio,

                    'costo_personalizacion' =>
                        $costoPersonalizacion,

                    'detalle_personalizacion' =>
                        $detallePersonalizacion,

                    'subtotal' =>
                        $subtotal,

                    'fecha_creacion' =>
                        $fecha,

                    'fecha_actualizacion' =>
                        $fecha,

                    'costo_unitario_produccion' =>
                        $costoUnitario,

                    'costo_total_produccion' =>
                        $costoTotal,
                ]);

            $total += $subtotal;
        }

        return round($total, 2);
    }

    private function crearPedidos(
        $usuarios,
        $clientes
    ): void {
        for ($i = 1; $i <= 25; $i++) {
            if ($i <= 8) {
                $estado = 'ENTREGADO';
            } elseif ($i <= 11) {
                $estado = 'CANCELADO';
            } elseif ($i <= 18) {
                $estado = 'EN_PROCESO';
            } else {
                $estado = 'PROGRAMADO';
            }

            $observacion =
                self::MARCA .
                ' | Pedido noviembre #' .
                str_pad(
                    (string) $i,
                    3,
                    '0',
                    STR_PAD_LEFT
                );

            $usuarioId =
                (int) $usuarios[
                    ($i * 3) %
                    $usuarios->count()
                ];

            $esOcasional =
                ($i % 8 === 0);

            $clienteId =
                $esOcasional
                    ? null
                    : (int) $clientes[
                        ($i * 9) %
                        $clientes->count()
                    ];

            $nombreOcasional =
                $esOcasional
                    ? 'Pedido ocasional dashboard ' .
                        str_pad(
                            (string) $i,
                            3,
                            '0',
                            STR_PAD_LEFT
                        )
                    : null;

            $fechaPedido =
                $this->fechaPedido(
                    $i,
                    $estado
                );

            $fechaEntrega =
                $this->fechaEntregaPedido(
                    $i,
                    $estado,
                    $fechaPedido
                );

            $total =
                round(
                    90 +
                    (($i * 47) % 520),
                    2
                );

            $datos = [
                'id_cliente' =>
                    $clienteId,

                'nombre_cliente_ocasional' =>
                    $nombreOcasional,

                'id_usuario' =>
                    $usuarioId,

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

                'total' =>
                    $total,

                'estado' =>
                    $estado,

                'observaciones' =>
                    $observacion,

                'fecha_actualizacion' =>
                    $fechaPedido,

                'id_usuario_entrega' =>
                    $estado === 'ENTREGADO'
                        ? $usuarioId
                        : null,

                'fecha_entrega_efectiva' =>
                    $estado === 'ENTREGADO'
                        ? $fechaEntrega
                            ->copy()
                            ->setHour(12)
                        : null,

                'id_usuario_cancelacion' =>
                    $estado === 'CANCELADO'
                        ? $usuarioId
                        : null,

                'motivo_cancelacion' =>
                    $estado === 'CANCELADO'
                        ? 'Cancelación demo dashboard.'
                        : null,

                'fecha_cancelacion' =>
                    $estado === 'CANCELADO'
                        ? $fechaPedido
                            ->copy()
                            ->addHours(5)
                        : null,
            ];

            $existente =
                DB::table('pedido')
                    ->where(
                        'observaciones',
                        $observacion
                    )
                    ->first();

            if ($existente) {
                DB::table('pedido')
                    ->where(
                        'id_pedido',
                        $existente->id_pedido
                    )
                    ->update($datos);
            } else {
                DB::table('pedido')
                    ->insert(
                        array_merge(
                            $datos,
                            [
                                'fecha_creacion' =>
                                    $fechaPedido,
                            ]
                        )
                    );
            }
        }
    }

    private function fechaPedido(
        int $i,
        string $estado
    ): Carbon {
        if (
            $estado === 'ENTREGADO' ||
            $estado === 'CANCELADO'
        ) {
            return Carbon::create(
                2026,
                11,
                2 + (($i * 2) % 13),
                9 + ($i % 8),
                ($i * 7) % 60,
                0
            );
        }

        return Carbon::create(
            2026,
            11,
            17 + ($i % 5),
            8 + ($i % 10),
            ($i * 9) % 60,
            0
        );
    }

    private function fechaEntregaPedido(
        int $i,
        string $estado,
        Carbon $fechaPedido
    ): Carbon {
        if ($estado === 'ENTREGADO') {
            return $fechaPedido
                ->copy()
                ->addDays(
                    2 + ($i % 3)
                );
        }

        if ($estado === 'CANCELADO') {
            return $fechaPedido
                ->copy()
                ->addDays(4);
        }

        if ($estado === 'EN_PROCESO') {
            return Carbon::create(
                2026,
                11,
                22 + (($i - 12) % 6),
                0,
                0,
                0
            );
        }

        return Carbon::create(
            2026,
            11,
            24,
            0,
            0,
            0
        )->addDays(
            ($i - 19) * 2
        );
    }

    private function crearProduccion(
        $usuarios,
        $presentaciones
    ): void {
        for ($i = 1; $i <= 30; $i++) {
            if ($i <= 20) {
                $estado = 'COMPLETADA';
            } elseif ($i <= 25) {
                $estado = 'EN_PROCESO';
            } else {
                $estado = 'PROGRAMADA';
            }

            $observacion =
                self::MARCA .
                ' | Producción noviembre #' .
                str_pad(
                    (string) $i,
                    3,
                    '0',
                    STR_PAD_LEFT
                );

            $pp =
                $presentaciones[
                    ($i * 5) %
                    $presentaciones->count()
                ];

            $usuarioId =
                (int) $usuarios[
                    ($i * 2) %
                    $usuarios->count()
                ];

            if ($estado === 'COMPLETADA') {
                $fecha =
                    Carbon::create(
                        2026,
                        11,
                        1 + (($i * 3) % 20),
                        7 + ($i % 10),
                        ($i * 5) % 60,
                        0
                    );
            } elseif ($estado === 'EN_PROCESO') {
                $fecha =
                    Carbon::create(
                        2026,
                        11,
                        21,
                        7 + ($i % 8),
                        ($i * 7) % 60,
                        0
                    );
            } else {
                $fecha =
                    Carbon::create(
                        2026,
                        11,
                        22 + ($i - 26),
                        8 + ($i % 7),
                        0,
                        0
                    );
            }

            DB::table('produccion')
                ->updateOrInsert(
                    [
                        'observaciones' =>
                            $observacion,
                    ],
                    [
                        'id_producto_presentacion' =>
                            $pp
                                ->id_producto_presentacion,

                        'id_usuario' =>
                            $usuarioId,

                        'fecha_produccion' =>
                            $fecha,

                        'estado' =>
                            $estado,

                        'created_at' =>
                            $fecha,

                        'updated_at' =>
                            $fecha,
                    ]
                );
        }
    }

    private function actualizarVisitas(): void
    {
        $dashboard =
            DB::table('visita')
                ->where(
                    'ruta',
                    '/dashboard'
                )
                ->first();

        if ($dashboard) {
            if (
                (int) $dashboard->cantidad <
                180
            ) {
                DB::table('visita')
                    ->where(
                        'id_visita',
                        $dashboard->id_visita
                    )
                    ->update([
                        'cantidad' =>
                            180,

                        'fecha_actualizacion' =>
                            Carbon::create(
                                2026,
                                11,
                                21,
                                18,
                                0,
                                0
                            ),
                    ]);
            }

            return;
        }

        DB::table('visita')
            ->insert([
                'ruta' =>
                    '/dashboard',

                'cantidad' =>
                    180,

                'fecha_creacion' =>
                    Carbon::create(
                        2026,
                        11,
                        1,
                        8,
                        0,
                        0
                    ),

                'fecha_actualizacion' =>
                    Carbon::create(
                        2026,
                        11,
                        21,
                        18,
                        0,
                        0
                    ),
            ]);
    }
}