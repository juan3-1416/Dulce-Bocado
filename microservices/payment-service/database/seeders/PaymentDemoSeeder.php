<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PaymentDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    private int $actorUsuarioId = 7;
    private int $numeroRecibo = 2;

    private array $productos = [
        2=>['Torta de Chocolate - Pequeña',95],
        3=>['Torta de Chocolate - Mediana',150],
        4=>['Torta de Chocolate - Grande',220],
        5=>['Torta de Vainilla - Pequeña',90],
        6=>['Torta de Vainilla - Mediana',145],
        7=>['Torta de Vainilla - Grande',210],
        8=>['Torta Selva Negra - Pequeña',110],
        9=>['Torta Selva Negra - Mediana',175],
        10=>['Torta Selva Negra - Grande',250],
        11=>['Torta Red Velvet - Pequeña',115],
        12=>['Torta Red Velvet - Mediana',185],
        13=>['Torta Red Velvet - Grande',265],
        14=>['Torta Tres Leches - Pequeña',105],
        15=>['Torta Tres Leches - Mediana',165],
        16=>['Torta Tres Leches - Grande',235],
        17=>['Torta de Zanahoria - Pequeña',100],
        18=>['Torta de Zanahoria - Mediana',160],
        19=>['Torta de Zanahoria - Grande',230],
        20=>['Cheesecake Frutos Rojos - Porción',25],
        21=>['Cheesecake Frutos Rojos - Entero',180],
        22=>['Pie de Limón - Porción',18],
        23=>['Pie de Limón - Entero',120],
        24=>['Brownie Clásico - Unidad',15],
        25=>['Brownie Clásico - Caja x6',80],
        26=>['Alfajor de Chocolate - Unidad',12],
        27=>['Alfajor de Chocolate - Caja x6',65],
        28=>['Cupcake de Chocolate - Unidad',14],
        29=>['Cupcake de Chocolate - Caja x6',78],
        30=>['Cupcake de Chocolate - Caja x12',145],
        31=>['Cupcake de Vainilla - Unidad',13],
        32=>['Cupcake de Vainilla - Caja x6',72],
        33=>['Cupcake de Vainilla - Caja x12',135],
        34=>['Cupcake Red Velvet - Unidad',15],
        35=>['Cupcake Red Velvet - Caja x6',84],
        36=>['Cupcake Red Velvet - Caja x12',158],
        37=>['Galleta Chispas Chocolate - Unidad',8],
        38=>['Galleta Chispas Chocolate - Caja x6',42],
        39=>['Galleta Chispas Chocolate - Caja x12',78],
        40=>['Galleta de Avena - Unidad',8],
        41=>['Galleta de Avena - Caja x6',42],
        42=>['Galleta de Avena - Caja x12',78],
        43=>['Roll de Canela - Unidad',14],
        44=>['Roll de Canela - Caja x6',75],
        45=>['Roll de Canela - Caja x12',140],
        46=>['Croissant de Chocolate - Unidad',16],
        47=>['Croissant de Chocolate - Caja x6',88],
        48=>['Empanada de Manjar - Unidad',10],
        49=>['Empanada de Manjar - Caja x6',55],
    ];

    private array $nombres = [
        'María','José','Ana','Carlos','Daniela',
        'Luis','Camila','Jorge','Valeria','Miguel',
        'Fernanda','Diego','Paola','Andrés','Gabriela',
        'Sergio','Lucía','Rodrigo','Natalia','Fernando',
    ];

    private array $apellidos = [
        'Gonzales Rojas','Vargas Peña','Mendoza Suárez',
        'Ribera Flores','Salvatierra López','Pérez Chávez',
        'Morales Ortiz','Rojas Vaca','Sánchez Méndez',
        'Torrez Aguilera','Romero Justiniano','Cuéllar Pinto',
        'Gutiérrez Cabrera','Álvarez Mercado','Castro Céspedes',
        'Vaca Rodríguez','Flores Daza','Méndez Parada',
        'Suárez Arce','López Molina',
    ];

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'PaymentDemoSeeder no puede ejecutarse en producción.'
            );
        }

        $this->actorUsuarioId =
            (int) env('DEMO_ACTOR_USUARIO_ID', 7);

        DB::transaction(function (): void {

            /*
             * 350 ventas CONFIRMADAS.
             * SalesDemoSeeder:
             * demo #1 = venta ID 5.
             */
            for ($i = 1; $i <= 350; $i++) {
                [$total, $detalles] =
                    $this->datosVenta($i);

                $ventaId = $i + 4;

                $medio =
                    ($i % 10 <= 2)
                        ? 'QR'
                        : 'EFECTIVO';

                $fechaPago =
                    $this->fechaVenta($i)
                        ->addMinutes(10);

                $this->crearPago(
                    origenTipo: 'VENTA',
                    origenId: $ventaId,
                    totalOrigen: $total,
                    monto: $total,
                    medio: $medio,
                    fechaPago: $fechaPago,
                    clave: 'VENTA-' . $i,
                    cliente: $this->clienteVenta($i),
                    detalles: $detalles,
                    acumulado: $total
                );
            }

            /*
             * 55 pedidos ENTREGADOS:
             * anticipo 40% + saldo 60%.
             *
             * Pedido demo #1 = ID 4.
             */
            for ($i = 1; $i <= 55; $i++) {
                [$total, $detalles] =
                    $this->datosPedido($i);

                $pedidoId = $i + 3;

                $fechaPedido =
                    $this->fechaPedido(
                        $i,
                        'ENTREGADO'
                    );

                $fechaEntrega =
                    $this->fechaEntrega(
                        $fechaPedido,
                        $i,
                        'ENTREGADO'
                    );

                $anticipo =
                    round($total * 0.40, 2);

                $saldo =
                    round(
                        $total - $anticipo,
                        2
                    );

                $this->crearPago(
                    origenTipo: 'PEDIDO',
                    origenId: $pedidoId,
                    totalOrigen: $total,
                    monto: $anticipo,
                    medio:
                        ($i % 5 === 0)
                            ? 'QR'
                            : 'EFECTIVO',
                    fechaPago:
                        $fechaPedido
                            ->copy()
                            ->addHour(),
                    clave:
                        'PEDIDO-' .
                        $i .
                        '-ANTICIPO',
                    cliente:
                        $this->clientePedido($i),
                    detalles: $detalles,
                    acumulado: $anticipo
                );

                $this->crearPago(
                    origenTipo: 'PEDIDO',
                    origenId: $pedidoId,
                    totalOrigen: $total,
                    monto: $saldo,
                    medio:
                        ($i % 7 === 0)
                            ? 'QR'
                            : 'EFECTIVO',
                    fechaPago:
                        $fechaEntrega
                            ->copy()
                            ->setHour(12)
                            ->setMinute(0),
                    clave:
                        'PEDIDO-' .
                        $i .
                        '-SALDO',
                    cliente:
                        $this->clientePedido($i),
                    detalles: $detalles,
                    acumulado: $total
                );
            }

            /*
             * Pedidos EN_PROCESO:
             * demo #71 a #85.
             * Anticipo del 50%.
             */
            for ($i = 71; $i <= 85; $i++) {
                [$total, $detalles] =
                    $this->datosPedido($i);

                $pedidoId = $i + 3;

                $monto =
                    round($total * 0.50, 2);

                $fecha =
                    $this->fechaPedido(
                        $i,
                        'EN_PROCESO'
                    )->addMinutes(30);

                $this->crearPago(
                    origenTipo: 'PEDIDO',
                    origenId: $pedidoId,
                    totalOrigen: $total,
                    monto: $monto,
                    medio:
                        ($i % 4 === 0)
                            ? 'QR'
                            : 'EFECTIVO',
                    fechaPago: $fecha,
                    clave:
                        'PEDIDO-' .
                        $i .
                        '-50',
                    cliente:
                        $this->clientePedido($i),
                    detalles: $detalles,
                    acumulado: $monto
                );
            }

            /*
             * Pedidos PROGRAMADOS:
             * solo los pares reciben anticipo 30%.
             */
            for ($i = 86; $i <= 100; $i++) {
                if ($i % 2 !== 0) {
                    continue;
                }

                [$total, $detalles] =
                    $this->datosPedido($i);

                $pedidoId = $i + 3;

                $monto =
                    round($total * 0.30, 2);

                $fecha =
                    $this->fechaPedido(
                        $i,
                        'PROGRAMADO'
                    )->addMinutes(20);

                $this->crearPago(
                    origenTipo: 'PEDIDO',
                    origenId: $pedidoId,
                    totalOrigen: $total,
                    monto: $monto,
                    medio:
                        ($i % 3 === 0)
                            ? 'QR'
                            : 'EFECTIVO',
                    fechaPago: $fecha,
                    clave:
                        'PEDIDO-' .
                        $i .
                        '-30',
                    cliente:
                        $this->clientePedido($i),
                    detalles: $detalles,
                    acumulado: $monto
                );
            }

            /*
             * Intentos QR rechazados históricos.
             * No generan pago ni recibo.
             */
            for ($i = 1; $i <= 8; $i++) {
                [$total] =
                    $this->datosVenta($i);

                $this->crearQrRechazado(
                    ventaId: $i + 4,
                    monto: $total,
                    indice: $i
                );
            }
        });

        $this->command?->info(
            'PaymentDemoSeeder cargado correctamente.'
        );
    }

    private function crearPago(
        string $origenTipo,
        int $origenId,
        float $totalOrigen,
        float $monto,
        string $medio,
        Carbon $fechaPago,
        string $clave,
        array $cliente,
        array $detalles,
        float $acumulado
    ): void {
        $intentoQrId = null;

        if ($medio === 'QR') {
            $intentoQrId =
                $this->crearQrConfirmado(
                    $origenTipo,
                    $origenId,
                    $monto,
                    $fechaPago,
                    $clave
                );
        }

        $operacionId =
            $this->uuidDeterministico(
                'PAGO|' . $clave
            );

        $existente =
            DB::table('pago')
                ->where(
                    'operacion_id',
                    $operacionId
                )
                ->first();

        $datos = [
            'origen_tipo' =>
                $origenTipo,

            'origen_id' =>
                $origenId,

            'total_origen_snapshot' =>
                $totalOrigen,

            'monto' =>
                $monto,

            'moneda' =>
                'BOB',

            'medio' =>
                $medio,

            'estado' =>
                'CONFIRMADO',

            'intento_qr_id' =>
                $intentoQrId,

            'actor_usuario_id' =>
                $this->actorUsuarioId,

            'confirmado_at' =>
                $fechaPago,

            'rechazado_at' =>
                null,

            'updated_at' =>
                $fechaPago,
        ];

        if ($existente) {
            $pagoId =
                (int) $existente->id_pago;

            DB::table('pago')
                ->where(
                    'id_pago',
                    $pagoId
                )
                ->update($datos);
        } else {
            $pagoId =
                (int) DB::table('pago')
                    ->insertGetId(
                        array_merge(
                            $datos,
                            [
                                'operacion_id' =>
                                    $operacionId,

                                'created_at' =>
                                    $fechaPago,
                            ]
                        ),
                        'id_pago'
                    );
        }

        DB::table('pago_idempotencia')
            ->updateOrInsert(
                [
                    'operacion' =>
                        'DEMO_PAGO',

                    'clave' =>
                        self::MARCA .
                        '|' .
                        $clave,
                ],
                [
                    'huella_request' =>
                        hash(
                            'sha256',
                            self::MARCA .
                            '|' .
                            $clave
                        ),

                    'estado' =>
                        'COMPLETADA',

                    'recurso_tipo' =>
                        'PAGO',

                    'recurso_id' =>
                        $pagoId,

                    'status_code' =>
                        201,

                    'respuesta_snapshot' =>
                        json_encode([
                            'demo' => true,
                            'id_pago' => $pagoId,
                            'estado' => 'CONFIRMADO',
                        ]),

                    'created_at' =>
                        $fechaPago,

                    'updated_at' =>
                        $fechaPago,
                ]
            );

        $this->crearRecibo(
            pagoId: $pagoId,
            operacionId: $operacionId,
            origenTipo: $origenTipo,
            origenId: $origenId,
            totalOrigen: $totalOrigen,
            monto: $monto,
            medio: $medio,
            fechaPago: $fechaPago,
            cliente: $cliente,
            detalles: $detalles,
            acumulado: $acumulado
        );
    }

    private function crearQrConfirmado(
        string $origenTipo,
        int $origenId,
        float $monto,
        Carbon $fechaPago,
        string $clave
    ): int {
        $operacionId =
            $this->uuidDeterministico(
                'QR|' . $clave
            );

        $referencia =
            'DEMO-QR-' .
            strtoupper(
                substr(
                    hash(
                        'sha256',
                        $clave
                    ),
                    0,
                    16
                )
            );

        $creado =
            $fechaPago
                ->copy()
                ->subMinutes(2);

        $existente =
            DB::table('intento_qr')
                ->where(
                    'operacion_id',
                    $operacionId
                )
                ->first();

        $datos = [
            'origen_tipo' =>
                $origenTipo,

            'origen_id' =>
                $origenId,

            'monto' =>
                $monto,

            'moneda' =>
                'BOB',

            'estado' =>
                'CONFIRMADA',

            'referencia_proveedor' =>
                $referencia,

            'qr_contenido' =>
                json_encode([
                    'demo' => true,
                    'referencia' => $referencia,
                    'codigo_recaudacion' =>
                        strtoupper(
                            substr(
                                hash(
                                    'sha256',
                                    'COD|' . $clave
                                ),
                                0,
                                12
                            )
                        ),
                ]),

            'expira_at' =>
                $creado
                    ->copy()
                    ->addMinutes(15),

            'confirmado_at' =>
                $fechaPago,

            'rechazado_at' =>
                null,

            'actor_usuario_id' =>
                $this->actorUsuarioId,

            'updated_at' =>
                $fechaPago,
        ];

        if ($existente) {
            $intentoId =
                (int)
                $existente->id_intento_qr;

            DB::table('intento_qr')
                ->where(
                    'id_intento_qr',
                    $intentoId
                )
                ->update($datos);
        } else {
            $intentoId =
                (int) DB::table(
                    'intento_qr'
                )->insertGetId(
                    array_merge(
                        $datos,
                        [
                            'operacion_id' =>
                                $operacionId,

                            'created_at' =>
                                $creado,
                        ]
                    ),
                    'id_intento_qr'
                );
        }

        $eventoId =
            'DEMO-EVT-' .
            strtoupper(
                substr(
                    hash(
                        'sha256',
                        'EVT|' . $clave
                    ),
                    0,
                    24
                )
            );

        DB::table('evento_qr')
            ->updateOrInsert(
                [
                    'evento_externo_id' =>
                        $eventoId,
                ],
                [
                    'intento_qr_id' =>
                        $intentoId,

                    'referencia_proveedor' =>
                        $referencia,

                    'estado_normalizado' =>
                        'CONFIRMADA',

                    'payload' =>
                        json_encode([
                            'demo' => true,
                            'error' => '0',
                            'message' => 'OK',
                            'monto_total' =>
                                number_format(
                                    $monto,
                                    2,
                                    '.',
                                    ''
                                ),
                            'transaction_id' =>
                                $referencia,
                            'payment_method' =>
                                'DEMO_QR',
                        ]),

                    'recibido_at' =>
                        $fechaPago,

                    'procesado_at' =>
                        $fechaPago,

                    'created_at' =>
                        $fechaPago,

                    'updated_at' =>
                        $fechaPago,
                ]
            );

        return $intentoId;
    }

    private function crearQrRechazado(
        int $ventaId,
        float $monto,
        int $indice
    ): void {
        $clave =
            'QR-RECHAZADO-' .
            $indice;

        $operacionId =
            $this->uuidDeterministico(
                $clave
            );

        $referencia =
            'DEMO-QR-RECH-' .
            str_pad(
                (string) $indice,
                3,
                '0',
                STR_PAD_LEFT
            );

        $fecha =
            Carbon::create(
                2026,
                11,
                10 + $indice,
                10 + ($indice % 6),
                15,
                0
            );

        $existente =
            DB::table('intento_qr')
                ->where(
                    'operacion_id',
                    $operacionId
                )
                ->first();

        $datos = [
            'origen_tipo' => 'VENTA',
            'origen_id' => $ventaId,
            'monto' => $monto,
            'moneda' => 'BOB',
            'estado' => 'RECHAZADA',
            'referencia_proveedor' =>
                $referencia,
            'qr_contenido' =>
                json_encode([
                    'demo' => true,
                ]),
            'expira_at' =>
                $fecha
                    ->copy()
                    ->addMinutes(15),
            'confirmado_at' => null,
            'rechazado_at' =>
                $fecha
                    ->copy()
                    ->addMinutes(2),
            'actor_usuario_id' =>
                $this->actorUsuarioId,
            'updated_at' =>
                $fecha
                    ->copy()
                    ->addMinutes(2),
        ];

        if ($existente) {
            $intentoId =
                (int)
                $existente->id_intento_qr;

            DB::table('intento_qr')
                ->where(
                    'id_intento_qr',
                    $intentoId
                )
                ->update($datos);
        } else {
            $intentoId =
                (int) DB::table(
                    'intento_qr'
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
                    'id_intento_qr'
                );
        }

        DB::table('evento_qr')
            ->updateOrInsert(
                [
                    'evento_externo_id' =>
                        'DEMO-EVT-RECH-' .
                        str_pad(
                            (string) $indice,
                            3,
                            '0',
                            STR_PAD_LEFT
                        ),
                ],
                [
                    'intento_qr_id' =>
                        $intentoId,
                    'referencia_proveedor' =>
                        $referencia,
                    'estado_normalizado' =>
                        'RECHAZADA',
                    'payload' =>
                        json_encode([
                            'demo' => true,
                            'error' => '1',
                            'message' =>
                                'Pago rechazado demo',
                        ]),
                    'recibido_at' =>
                        $fecha->copy()
                            ->addMinutes(2),
                    'procesado_at' =>
                        $fecha->copy()
                            ->addMinutes(2),
                    'created_at' =>
                        $fecha->copy()
                            ->addMinutes(2),
                    'updated_at' =>
                        $fecha->copy()
                            ->addMinutes(2),
                ]
            );
    }

    private function crearRecibo(
        int $pagoId,
        string $operacionId,
        string $origenTipo,
        int $origenId,
        float $totalOrigen,
        float $monto,
        string $medio,
        Carbon $fechaPago,
        array $cliente,
        array $detalles,
        float $acumulado
    ): void {
        $numero =
            sprintf(
                'REC-%06d',
                $this->numeroRecibo
            );

        $anulado =
            $this->numeroRecibo % 60 === 0;

        $emitidoAt =
            $fechaPago
                ->copy()
                ->addMinute();

        $snapshot = [
            'medio' => $medio,
            'monto' =>
                number_format(
                    $monto,
                    2,
                    '.',
                    ''
                ),
            'moneda' => 'BOB',
            'numero' => $numero,
            'cliente' => $cliente,
            'pago_id' => $pagoId,
            'detalles' => $detalles,
            'origen_id' => $origenId,
            'emitido_at' =>
                $emitidoAt->toIso8601String(),
            'fecha_pago' =>
                $fechaPago->toIso8601String(),
            'emitido_por' => [
                'id_usuario' =>
                    $this->actorUsuarioId,
            ],
            'origen_tipo' => $origenTipo,
            'operacion_id' => $operacionId,
            'total_origen' =>
                number_format(
                    $totalOrigen,
                    2,
                    '.',
                    ''
                ),
            'cantidad_impresiones' => 0,
            'fecha_ultima_impresion' => null,
            'total_pagado_acumulado' =>
                number_format(
                    $acumulado,
                    2,
                    '.',
                    ''
                ),
            'id_usuario_ultima_impresion' =>
                null,
            'demo' => true,
        ];

        DB::table('recibo')
            ->updateOrInsert(
                [
                    'pago_id' => $pagoId,
                ],
                [
                    'numero' => $numero,
                    'estado' =>
                        $anulado
                            ? 'ANULADO'
                            : 'EMITIDO',

                    'snapshot' =>
                        json_encode(
                            $snapshot,
                            JSON_UNESCAPED_UNICODE
                        ),

                    'emitido_por_usuario_id' =>
                        $this->actorUsuarioId,

                    'emitido_at' =>
                        $emitidoAt,

                    'motivo_anulacion' =>
                        $anulado
                            ? 'Anulación demo para pruebas.'
                            : null,

                    'anulado_por_usuario_id' =>
                        $anulado
                            ? $this->actorUsuarioId
                            : null,

                    'anulado_at' =>
                        $anulado
                            ? $emitidoAt
                                ->copy()
                                ->addMinutes(2)
                            : null,

                    'created_at' =>
                        $emitidoAt,

                    'updated_at' =>
                        $anulado
                            ? $emitidoAt
                                ->copy()
                                ->addMinutes(2)
                            : $emitidoAt,
                ]
            );

        $this->numeroRecibo++;
    }

    private function datosVenta(int $i): array
    {
        $lineas = 1 + ($i % 3);
        $total = 0;
        $detalles = [];
        $usados = [];

        for ($linea = 0; $linea < $lineas; $linea++) {
            $id =
                2 + (
                    (
                        $i * 7 +
                        $linea * 11
                    ) % 48
                );

            while (isset($usados[$id])) {
                $id++;
                if ($id > 49) {
                    $id = 2;
                }
            }

            $usados[$id] = true;

            [$nombre, $precio] =
                $this->productos[$id];

            $cantidad =
                1 + (($i + $linea) % 3);

            $personalizacion = 0;

            if (
                $id >= 2 &&
                $id <= 19 &&
                (($i + $linea) % 4 === 0)
            ) {
                $personalizacion = 10;
            }

            $subtotal =
                round(
                    ($precio * $cantidad) +
                    $personalizacion,
                    2
                );

            $total += $subtotal;

            $detalles[] = [
                'cantidad' => $cantidad,
                'subtotal' =>
                    number_format(
                        $subtotal,
                        2,
                        '.',
                        ''
                    ),
                'descripcion' => $nombre,
                'precio_unitario' =>
                    number_format(
                        $precio,
                        2,
                        '.',
                        ''
                    ),
            ];
        }

        return [
            round($total, 2),
            $detalles,
        ];
    }

    private function datosPedido(int $i): array
    {
        $lineas = 1 + ($i % 3);
        $total = 0;
        $detalles = [];
        $usados = [];

        for ($linea = 0; $linea < $lineas; $linea++) {
            $id =
                2 + (
                    (
                        $i * 5 +
                        $linea * 13
                    ) % 48
                );

            while (isset($usados[$id])) {
                $id++;
                if ($id > 49) {
                    $id = 2;
                }
            }

            $usados[$id] = true;

            [$nombre, $precio] =
                $this->productos[$id];

            $cantidad =
                1 + (($i + $linea) % 4);

            $personalizacion = 0;

            if (
                $id >= 2 &&
                $id <= 19 &&
                (($i + $linea) % 3 === 0)
            ) {
                $opciones =
                    [15,20,25,30];

                $personalizacion =
                    $opciones[
                        ($i + $linea) % 4
                    ];
            }

            $subtotal =
                round(
                    ($precio * $cantidad) +
                    $personalizacion,
                    2
                );

            $total += $subtotal;

            $detalles[] = [
                'cantidad' => $cantidad,
                'subtotal' =>
                    number_format(
                        $subtotal,
                        2,
                        '.',
                        ''
                    ),
                'descripcion' => $nombre,
                'precio_unitario' =>
                    number_format(
                        $precio,
                        2,
                        '.',
                        ''
                    ),
            ];
        }

        return [
            round($total, 2),
            $detalles,
        ];
    }

    private function clienteVenta(int $i): array
    {
        if ($i % 7 === 0) {
            return [
                'id_cliente' => null,
                'nombre' =>
                    'Cliente ocasional demo ' .
                    str_pad(
                        (string) $i,
                        3,
                        '0',
                        STR_PAD_LEFT
                    ),
                'ci_nit' => null,
            ];
        }

        $id =
            2 + (($i * 13) % 100);

        return $this->clienteRegistrado($id);
    }

    private function clientePedido(int $i): array
    {
        if ($i % 10 === 0) {
            return [
                'id_cliente' => null,
                'nombre' =>
                    'Cliente ocasional pedido ' .
                    str_pad(
                        (string) $i,
                        3,
                        '0',
                        STR_PAD_LEFT
                    ),
                'ci_nit' => null,
            ];
        }

        $id =
            2 + (($i * 17) % 100);

        return $this->clienteRegistrado($id);
    }

    private function clienteRegistrado(int $id): array
    {
        $indice = $id - 2;

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

        return [
            'id_cliente' => $id,
            'nombre' =>
                $nombre . ' ' . $apellido,
            'ci_nit' =>
                (string) (
                    9600000 +
                    ($id - 1)
                ),
        ];
    }

    private function fechaVenta(int $i): Carbon
    {
        if ($i <= 300) {
            $mes =
                intdiv($i - 1, 30) + 1;

            $pos =
                ($i - 1) % 30;

            return Carbon::create(
                2026,
                $mes,
                1 + (($pos * 23 + $i) % 27),
                8 + ($i % 11),
                ($i * 7) % 60,
                0
            );
        }

        if ($i <= 330) {
            $x = $i - 301;

            return Carbon::create(
                2026,
                11,
                1 + ($x % 14),
                8 + ($x % 11),
                ($x * 9) % 60,
                0
            );
        }

        $x = $i - 331;

        if ($x >= 12) {
            return Carbon::create(
                2026,
                11,
                21,
                8 + (($x - 12) % 11),
                ($x * 7) % 50,
                0
            );
        }

        return Carbon::create(
            2026,
            11,
            20 - ($x % 6),
            9 + ($x % 10),
            ($x * 11) % 50,
            0
        );
    }

    private function fechaPedido(
        int $i,
        string $estado
    ): Carbon {
        if ($estado === 'ENTREGADO') {
            return Carbon::create(
                2026,
                1 + (($i - 1) % 11),
                2 + (($i * 3) % 18),
                8 + ($i % 10),
                ($i * 7) % 60,
                0
            );
        }

        if ($estado === 'EN_PROCESO') {
            $x = $i - 71;

            return Carbon::create(
                2026,
                11,
                21 - ($x % 5),
                8 + ($x % 9),
                ($x * 7) % 50,
                0
            );
        }

        $x = $i - 86;

        return Carbon::create(
            2026,
            11,
            21 - ($x % 3),
            9 + ($x % 8),
            ($x * 9) % 50,
            0
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

        return $fechaPedido
            ->copy()
            ->addDays(2);
    }

    private function uuidDeterministico(
        string $clave
    ): string {
        $hash =
            substr(
                hash(
                    'sha256',
                    self::MARCA .
                    '|' .
                    $clave
                ),
                0,
                32
            );

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hash, 0, 8),
            substr($hash, 8, 4),
            substr($hash, 12, 4),
            substr($hash, 16, 4),
            substr($hash, 20, 12)
        );
    }
}