<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Pago;
use App\Models\PagoInternet;
use App\Models\Pedido;
use App\Models\Presentacion;
use App\Models\Producto;
use App\Models\ProductoPresentacion;
use App\Models\Recibo;
use App\Models\Usuario;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class DemoDataSeeder extends Seeder
{
    private const MARCA = 'DEMO_REPORTES_2026';

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'DemoDataSeeder no puede ejecutarse en producción.'
            );
        }

        if (
            Venta::query()
                ->where(
                    'observaciones',
                    'LIKE',
                    self::MARCA . '%'
                )
                ->exists()
        ) {
            throw new RuntimeException(
                'La población DEMO_REPORTES_2026 ya fue cargada. No se volvió a ejecutar para evitar duplicados.'
            );
        }

        mt_srand(260924);

        DB::transaction(function () {
            $usuarios = Usuario::query()
                ->where('activo', true)
                ->pluck('id_usuario')
                ->values();

            if ($usuarios->isEmpty()) {
                throw new RuntimeException(
                    'No existe ningún usuario activo para asociar a la población demo.'
                );
            }

            $productosPresentaciones =
                $this->crearCatalogo();

            if (
                $productosPresentaciones->count() < 10
            ) {
                throw new RuntimeException(
                    'No se pudieron obtener suficientes productos/presentaciones activos para generar la población demo.'
                );
            }

            $clientes = $this->crearClientes();

            $this->crearVentasPagadas(
                $clientes,
                $productosPresentaciones,
                $usuarios
            );

            $this->crearVentasAnuladas(
                $clientes,
                $productosPresentaciones,
                $usuarios
            );

            $this->crearVentasPendientes(
                $clientes,
                $productosPresentaciones,
                $usuarios
            );

            $this->crearPedidos(
                $clientes,
                $productosPresentaciones,
                $usuarios
            );
        });

        $this->command?->info(
            'Población demo comercial cargada correctamente.'
        );
        $this->command?->info(
            'Incluye catálogo, 100 clientes, 300 ventas pagadas, 12 anuladas, 5 pendientes y 80 pedidos.'
        );
    }

    private function crearCatalogo(): Collection
    {
        $categoriasConfig = [
            'Tortas' =>
                'Tortas clásicas y personalizadas.',
            'Postres' =>
                'Postres individuales y enteros.',
            'Cupcakes' =>
                'Cupcakes por unidad y en cajas.',
            'Galletas' =>
                'Galletas artesanales.',
            'Panadería' =>
                'Productos horneados y masas dulces.',
        ];

        $categorias = [];

        foreach (
            $categoriasConfig as
            $nombre => $descripcion
        ) {
            $categoria = Categoria::query()
                ->whereRaw(
                    'LOWER(nombre) = LOWER(?)',
                    [$nombre]
                )
                ->first();

            if (!$categoria) {
                $categoria = Categoria::create([
                    'nombre' => $nombre,
                    'descripcion' => $descripcion,
                    'estado' => true,
                ]);
            }

            $categorias[$nombre] =
                $categoria;
        }

        $presentacionesConfig = [
            'Pequeña' =>
                'Tamaño pequeño.',
            'Mediana' =>
                'Tamaño mediano.',
            'Grande' =>
                'Tamaño grande.',
            'Unidad' =>
                'Venta por unidad.',
            'Porción' =>
                'Venta por porción.',
            'Entero' =>
                'Producto entero.',
            'Caja x6' =>
                'Caja de 6 unidades.',
            'Caja x12' =>
                'Caja de 12 unidades.',
        ];

        $presentaciones = [];

        foreach (
            $presentacionesConfig as
            $nombre => $descripcion
        ) {
            $presentacion =
                Presentacion::query()
                    ->whereRaw(
                        'LOWER(nombre) = LOWER(?)',
                        [$nombre]
                    )
                    ->first();

            if (!$presentacion) {
                $presentacion =
                    Presentacion::create([
                        'nombre' => $nombre,
                        'descripcion' =>
                            $descripcion,
                        'estado' => true,
                    ]);
            }

            $presentaciones[$nombre] =
                $presentacion;
        }

        $productosConfig = [
            [
                'categoria' => 'Tortas',
                'nombre' => 'Torta de Chocolate',
                'descripcion' => 'Bizcocho de chocolate con relleno y cobertura de chocolate.',
                'personalizable' => true,
                'precios' => [
                    'Pequeña' => 95,
                    'Mediana' => 150,
                    'Grande' => 220,
                ],
            ],
            [
                'categoria' => 'Tortas',
                'nombre' => 'Torta de Vainilla',
                'descripcion' => 'Bizcocho de vainilla con relleno suave.',
                'personalizable' => true,
                'precios' => [
                    'Pequeña' => 90,
                    'Mediana' => 145,
                    'Grande' => 210,
                ],
            ],
            [
                'categoria' => 'Tortas',
                'nombre' => 'Torta Selva Negra',
                'descripcion' => 'Chocolate, crema y cerezas.',
                'personalizable' => true,
                'precios' => [
                    'Pequeña' => 110,
                    'Mediana' => 175,
                    'Grande' => 250,
                ],
            ],
            [
                'categoria' => 'Tortas',
                'nombre' => 'Torta Red Velvet',
                'descripcion' => 'Red velvet con cobertura cremosa.',
                'personalizable' => true,
                'precios' => [
                    'Pequeña' => 115,
                    'Mediana' => 185,
                    'Grande' => 265,
                ],
            ],
            [
                'categoria' => 'Tortas',
                'nombre' => 'Torta Tres Leches',
                'descripcion' => 'Bizcocho húmedo de tres leches.',
                'personalizable' => true,
                'precios' => [
                    'Pequeña' => 105,
                    'Mediana' => 165,
                    'Grande' => 235,
                ],
            ],
            [
                'categoria' => 'Tortas',
                'nombre' => 'Torta de Zanahoria',
                'descripcion' => 'Torta de zanahoria con especias y cobertura cremosa.',
                'personalizable' => true,
                'precios' => [
                    'Pequeña' => 100,
                    'Mediana' => 160,
                    'Grande' => 230,
                ],
            ],
            [
                'categoria' => 'Postres',
                'nombre' => 'Cheesecake de Frutos Rojos',
                'descripcion' => 'Cheesecake con salsa de frutos rojos.',
                'personalizable' => false,
                'precios' => [
                    'Porción' => 25,
                    'Entero' => 180,
                ],
            ],
            [
                'categoria' => 'Postres',
                'nombre' => 'Pie de Limón',
                'descripcion' => 'Pie de limón con merengue.',
                'personalizable' => false,
                'precios' => [
                    'Porción' => 18,
                    'Entero' => 120,
                ],
            ],
            [
                'categoria' => 'Postres',
                'nombre' => 'Brownie Clásico',
                'descripcion' => 'Brownie de chocolate artesanal.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 15,
                    'Caja x6' => 80,
                ],
            ],
            [
                'categoria' => 'Postres',
                'nombre' => 'Alfajor de Chocolate',
                'descripcion' => 'Alfajor relleno de dulce de leche con cobertura de chocolate.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 12,
                    'Caja x6' => 65,
                ],
            ],
            [
                'categoria' => 'Cupcakes',
                'nombre' => 'Cupcake de Chocolate',
                'descripcion' => 'Cupcake de chocolate con frosting.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 14,
                    'Caja x6' => 78,
                    'Caja x12' => 145,
                ],
            ],
            [
                'categoria' => 'Cupcakes',
                'nombre' => 'Cupcake de Vainilla',
                'descripcion' => 'Cupcake de vainilla con frosting.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 13,
                    'Caja x6' => 72,
                    'Caja x12' => 135,
                ],
            ],
            [
                'categoria' => 'Cupcakes',
                'nombre' => 'Cupcake Red Velvet',
                'descripcion' => 'Cupcake red velvet con cobertura cremosa.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 15,
                    'Caja x6' => 84,
                    'Caja x12' => 158,
                ],
            ],
            [
                'categoria' => 'Galletas',
                'nombre' => 'Galleta con Chispas de Chocolate',
                'descripcion' => 'Galleta artesanal con chispas de chocolate.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 8,
                    'Caja x6' => 42,
                    'Caja x12' => 78,
                ],
            ],
            [
                'categoria' => 'Galletas',
                'nombre' => 'Galleta de Avena',
                'descripcion' => 'Galleta de avena horneada.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 8,
                    'Caja x6' => 42,
                    'Caja x12' => 78,
                ],
            ],
            [
                'categoria' => 'Panadería',
                'nombre' => 'Roll de Canela',
                'descripcion' => 'Roll de canela con glaseado.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 14,
                    'Caja x6' => 75,
                    'Caja x12' => 140,
                ],
            ],
            [
                'categoria' => 'Panadería',
                'nombre' => 'Croissant de Chocolate',
                'descripcion' => 'Croissant relleno de chocolate.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 16,
                    'Caja x6' => 88,
                ],
            ],
            [
                'categoria' => 'Panadería',
                'nombre' => 'Empanada de Manjar',
                'descripcion' => 'Empanada dulce rellena de manjar.',
                'personalizable' => false,
                'precios' => [
                    'Unidad' => 10,
                    'Caja x6' => 55,
                ],
            ],
        ];

        $resultado = collect();

        foreach ($productosConfig as $config) {
            $categoria =
                $categorias[
                    $config['categoria']
                ];

            $producto = Producto::query()
                ->whereRaw(
                    'LOWER(nombre) = LOWER(?)',
                    [$config['nombre']]
                )
                ->first();

            if (!$producto) {
                $producto = Producto::create([
                    'id_categoria' =>
                        $categoria->id_categoria,
                    'nombre' =>
                        $config['nombre'],
                    'descripcion' =>
                        $config['descripcion'],
                    'imagen' => null,
                    'estado' => true,
                ]);
            }

            if (!$producto->estado) {
                continue;
            }

            foreach (
                $config['precios'] as
                $nombrePresentacion => $precio
            ) {
                $presentacion =
                    $presentaciones[
                        $nombrePresentacion
                    ];

                if (!$presentacion->estado) {
                    continue;
                }

                $pp =
                    ProductoPresentacion::query()
                        ->where(
                            'id_producto',
                            $producto->id_producto
                        )
                        ->where(
                            'id_presentacion',
                            $presentacion
                                ->id_presentacion
                        )
                        ->first();

                if (!$pp) {
                    $pp =
                        ProductoPresentacion::create([
                            'id_producto' =>
                                $producto->id_producto,
                            'id_presentacion' =>
                                $presentacion
                                    ->id_presentacion,
                            'precio' => $precio,
                            'permite_personalizacion' =>
                                $config[
                                    'personalizable'
                                ],
                        ]);
                }

                $pp->load([
                    'producto',
                    'presentacion',
                ]);

                $resultado->push($pp);
            }
        }

        return $resultado->values();
    }

    private function crearClientes(): Collection
    {
        $nombres = [
            'María', 'José', 'Ana', 'Carlos',
            'Daniela', 'Luis', 'Camila', 'Jorge',
            'Valeria', 'Miguel', 'Fernanda', 'Diego',
            'Paola', 'Andrés', 'Gabriela', 'Sergio',
            'Lucía', 'Rodrigo', 'Natalia', 'Fernando',
        ];

        $apellidos = [
            'Gonzales Rojas', 'Vargas Peña',
            'Mendoza Suárez', 'Ribera Flores',
            'Salvatierra López', 'Pérez Chávez',
            'Morales Ortiz', 'Rojas Vaca',
            'Sánchez Méndez', 'Torrez Aguilera',
            'Romero Justiniano', 'Cuéllar Pinto',
            'Gutiérrez Cabrera', 'Álvarez Mercado',
            'Castro Céspedes', 'Vaca Rodríguez',
            'Flores Daza', 'Méndez Parada',
            'Suárez Arce', 'López Molina',
        ];

        $zonas = [
            'Av. Monseñor Santistevan',
            'Av. Circunvalación',
            'Barrio La Floresta',
            'Barrio Urkupiña',
            'Zona Norte',
            'Zona Central',
            'Av. Kennedy',
            'Barrio Municipal',
            'Av. Paurito',
            'Barrio El Carmen',
        ];

        $clientes = collect();

        for ($i = 1; $i <= 100; $i++) {
            $nombre =
                $nombres[($i - 1) % count($nombres)];

            $apellido =
                $apellidos[(($i - 1) * 3) % count($apellidos)];

            $correo = sprintf(
                'cliente.demo%03d@dulcebocado.test',
                $i
            );

            $cliente = Cliente::updateOrCreate(
                [
                    'correo_electronico' =>
                        $correo,
                ],
                [
                    'nombre' => $nombre,
                    'apellido' => $apellido,
                    'ci_nit' =>
                        (string) (9500000 + $i),
                    'telefono' =>
                        (string) (70000000 + $i),
                    'direccion' =>
                        $zonas[
                            ($i - 1) % count($zonas)
                        ] .
                        ' #' .
                        (100 + $i),
                    'observaciones' =>
                        self::MARCA .
                        ' | Cliente de prueba para reportes.',
                    'estado' => true,
                ]
            );

            $clientes->push($cliente);
        }

        return $clientes;
    }

    private function crearVentasPagadas(
        Collection $clientes,
        Collection $productosPresentaciones,
        Collection $usuarios
    ): void {
        $distribucion = [
            ['2026-04-01', '2026-04-30', 36],
            ['2026-05-01', '2026-05-31', 42],
            ['2026-06-01', '2026-06-30', 48],
            ['2026-07-01', '2026-07-31', 54],
            ['2026-08-01', '2026-08-31', 62],
            ['2026-09-01', '2026-09-24', 58],
        ];

        $contador = 1;

        foreach ($distribucion as [
            $inicio,
            $fin,
            $cantidadVentas,
        ]) {
            for (
                $i = 0;
                $i < $cantidadVentas;
                $i++
            ) {
                $fecha =
                    $this->fechaAleatoria(
                        $inicio,
                        $fin
                    );

                $usuarioId =
                    $this->usuarioAleatorio(
                        $usuarios
                    );

                $usaClienteRegistrado =
                    mt_rand(1, 100) <= 85;

                $cliente =
                    $usaClienteRegistrado
                        ? $clientes[
                            mt_rand(
                                0,
                                $clientes->count() - 1
                            )
                        ]
                        : null;

                $venta = Venta::create([
                    'id_cliente' =>
                        $cliente?->id_cliente,
                    'id_usuario' =>
                        $usuarioId,
                    'nombre_cliente_ocasional' =>
                        $cliente
                            ? null
                            : 'Cliente ocasional ' .
                                sprintf(
                                    '%03d',
                                    $contador
                                ),
                    'fecha_venta' => $fecha,
                    'total' => 0,
                    'estado' =>
                        'PENDIENTE_PAGO',
                    'observaciones' =>
                        self::MARCA .
                        ' | Venta pagada #' .
                        $contador,
                ]);

                $total =
                    $this->crearDetallesVenta(
                        $venta,
                        $productosPresentaciones
                    );

                $venta->update([
                    'total' => $total,
                ]);

                $esOnline =
                    mt_rand(1, 100) <= 30;

                $metodo =
                    $esOnline
                        ? 'ONLINE'
                        : 'EFECTIVO';

                $referencia =
                    $esOnline
                        ? 'DEMO-LIBELULA-' .
                            $venta->id_venta .
                            '-' .
                            Str::upper(
                                Str::random(8)
                            )
                        : null;

                $pago =
                    $this->crearPagoYRecibo(
                        venta: $venta,
                        pedido: null,
                        usuarioId: $usuarioId,
                        monto: $total,
                        metodo: $metodo,
                        fechaPago: $fecha
                            ->copy()
                            ->addMinutes(
                                mt_rand(2, 20)
                            ),
                        referencia: $referencia,
                        observacion:
                            self::MARCA .
                            ' | Pago total de venta.'
                    );

                if ($esOnline) {
                    PagoInternet::create([
                        'id_venta' =>
                            $venta->id_venta,
                        'id_pago' =>
                            $pago->id_pago,
                        'id_usuario' =>
                            $usuarioId,
                        'monto' => $total,
                        'proveedor' =>
                            'LIBELULA',
                        'referencia_transaccion' =>
                            $referencia,
                        'id_transaccion_libelula' =>
                            'DEMO-' .
                            (string) Str::uuid(),
                        'codigo_recaudacion' =>
                            'DEMO-' .
                            str_pad(
                                (string) $contador,
                                8,
                                '0',
                                STR_PAD_LEFT
                            ),
                        'qr_simple_url' => null,
                        'url_pasarela_pagos' => null,
                        'estado' =>
                            'APROBADO',
                        'motivo_rechazo' => null,
                        'respuesta_proveedor' => null,
                        'fecha_solicitud' =>
                            $fecha
                                ->copy()
                                ->addMinute(),
                        'fecha_confirmacion' =>
                            $pago->fecha_pago,
                        'token_qr' => null,
                        'fecha_vencimiento' => null,
                        'fecha_escaneo' =>
                            $pago->fecha_pago,
                    ]);
                }

                $venta->update([
                    'estado' => 'REGISTRADA',
                ]);

                $contador++;
            }
        }
    }

    private function crearVentasAnuladas(
        Collection $clientes,
        Collection $productosPresentaciones,
        Collection $usuarios
    ): void {
        for ($i = 1; $i <= 12; $i++) {
            $fecha =
                $this->fechaAleatoria(
                    '2026-05-01',
                    '2026-09-20'
                );

            $usuarioId =
                $this->usuarioAleatorio(
                    $usuarios
                );

            $cliente =
                $clientes[
                    mt_rand(
                        0,
                        $clientes->count() - 1
                    )
                ];

            $venta = Venta::create([
                'id_cliente' =>
                    $cliente->id_cliente,
                'id_usuario' =>
                    $usuarioId,
                'nombre_cliente_ocasional' => null,
                'fecha_venta' => $fecha,
                'total' => 0,
                'estado' =>
                    'PENDIENTE_PAGO',
                'observaciones' =>
                    self::MARCA .
                    ' | Venta anulada de prueba #' .
                    $i,
            ]);

            $total =
                $this->crearDetallesVenta(
                    $venta,
                    $productosPresentaciones
                );

            $venta->update([
                'total' => $total,
            ]);

            $venta->update([
                'estado' => 'ANULADA',
                'id_usuario_anulacion' =>
                    $usuarioId,
                'motivo_anulacion' =>
                    'Anulación demo para validar reportes.',
                'fecha_anulacion' =>
                    $fecha
                        ->copy()
                        ->addHours(2),
            ]);
        }
    }

    private function crearVentasPendientes(
        Collection $clientes,
        Collection $productosPresentaciones,
        Collection $usuarios
    ): void {
        for ($i = 1; $i <= 5; $i++) {
            $fecha = Carbon::create(
                2026,
                9,
                24,
                9 + $i,
                10,
                0
            );

            $usuarioId =
                $this->usuarioAleatorio(
                    $usuarios
                );

            $cliente =
                $clientes[
                    mt_rand(
                        0,
                        $clientes->count() - 1
                    )
                ];

            $venta = Venta::create([
                'id_cliente' =>
                    $cliente->id_cliente,
                'id_usuario' =>
                    $usuarioId,
                'nombre_cliente_ocasional' => null,
                'fecha_venta' => $fecha,
                'total' => 0,
                'estado' =>
                    'PENDIENTE_PAGO',
                'observaciones' =>
                    self::MARCA .
                    ' | Venta pendiente para validar exclusión de reportes #' .
                    $i,
            ]);

            $total =
                $this->crearDetallesVenta(
                    $venta,
                    $productosPresentaciones
                );

            $venta->update([
                'total' => $total,
            ]);
        }
    }

    private function crearPedidos(
        Collection $clientes,
        Collection $productosPresentaciones,
        Collection $usuarios
    ): void {
        for ($i = 1; $i <= 80; $i++) {
            if ($i <= 40) {
                $estadoFinal = 'ENTREGADO';
                $fechaPedido =
                    $this->fechaAleatoria(
                        '2026-04-01',
                        '2026-08-20'
                    );
            } elseif ($i <= 48) {
                $estadoFinal = 'CANCELADO';
                $fechaPedido =
                    $this->fechaAleatoria(
                        '2026-04-01',
                        '2026-08-31'
                    );
            } elseif ($i <= 64) {
                $estadoFinal = 'EN_PROCESO';
                $fechaPedido =
                    $this->fechaAleatoria(
                        '2026-09-01',
                        '2026-09-24'
                    );
            } else {
                $estadoFinal = 'PROGRAMADO';
                $fechaPedido =
                    $this->fechaAleatoria(
                        '2026-09-01',
                        '2026-09-24'
                    );
            }

            $usuarioId =
                $this->usuarioAleatorio(
                    $usuarios
                );

            $usaClienteRegistrado =
                mt_rand(1, 100) <= 90;

            $cliente =
                $usaClienteRegistrado
                    ? $clientes[
                        mt_rand(
                            0,
                            $clientes->count() - 1
                        )
                    ]
                    : null;

            $fechaEntrega =
                $fechaPedido
                    ->copy()
                    ->addDays(
                        mt_rand(2, 7)
                    );

            $pedido = Pedido::create([
                'id_cliente' =>
                    $cliente?->id_cliente,
                'nombre_cliente_ocasional' =>
                    $cliente
                        ? null
                        : 'Pedido ocasional ' .
                            sprintf('%03d', $i),
                'id_usuario' => $usuarioId,
                'fecha_pedido' =>
                    $fechaPedido,
                'fecha_entrega' =>
                    $fechaEntrega
                        ->format('Y-m-d'),
                'hora_entrega' =>
                    sprintf(
                        '%02d:00:00',
                        mt_rand(9, 19)
                    ),
                'total' => 0,
                'estado' => 'PROGRAMADO',
                'observaciones' =>
                    self::MARCA .
                    ' | Pedido demo #' .
                    $i,
            ]);

            $total =
                $this->crearDetallesPedido(
                    $pedido,
                    $productosPresentaciones
                );

            $pedido->update([
                'total' => $total,
            ]);

            if ($estadoFinal === 'ENTREGADO') {
                $primerPago = round(
                    $total * 0.40,
                    2
                );

                $segundoPago = round(
                    $total - $primerPago,
                    2
                );

                $this->crearPagoYRecibo(
                    venta: null,
                    pedido: $pedido,
                    usuarioId: $usuarioId,
                    monto: $primerPago,
                    metodo:
                        mt_rand(1, 100) <= 80
                            ? 'EFECTIVO'
                            : 'QR',
                    fechaPago:
                        $fechaPedido
                            ->copy()
                            ->addHours(1),
                    referencia:
                        null,
                    observacion:
                        self::MARCA .
                        ' | Anticipo de pedido.'
                );

                $this->crearPagoYRecibo(
                    venta: null,
                    pedido: $pedido,
                    usuarioId: $usuarioId,
                    monto: $segundoPago,
                    metodo:
                        mt_rand(1, 100) <= 75
                            ? 'EFECTIVO'
                            : 'QR',
                    fechaPago:
                        $fechaEntrega
                            ->copy()
                            ->setTime(12, 0),
                    referencia:
                        null,
                    observacion:
                        self::MARCA .
                        ' | Pago final de pedido.'
                );

                $pedido->update([
                    'estado' => 'ENTREGADO',
                    'id_usuario_entrega' =>
                        $usuarioId,
                    'fecha_entrega_efectiva' =>
                        $fechaEntrega
                            ->copy()
                            ->setTime(12, 15),
                    'id_usuario_cancelacion' =>
                        null,
                    'motivo_cancelacion' =>
                        null,
                    'fecha_cancelacion' =>
                        null,
                ]);

                continue;
            }

            if ($estadoFinal === 'CANCELADO') {
                $pedido->update([
                    'estado' => 'CANCELADO',
                    'id_usuario_entrega' => null,
                    'fecha_entrega_efectiva' =>
                        null,
                    'id_usuario_cancelacion' =>
                        $usuarioId,
                    'motivo_cancelacion' =>
                        'Cancelación demo solicitada por el cliente.',
                    'fecha_cancelacion' =>
                        $fechaPedido
                            ->copy()
                            ->addDay(),
                ]);

                continue;
            }

            if ($estadoFinal === 'EN_PROCESO') {
                $anticipo = round(
                    $total * 0.50,
                    2
                );

                $this->crearPagoYRecibo(
                    venta: null,
                    pedido: $pedido,
                    usuarioId: $usuarioId,
                    monto: $anticipo,
                    metodo:
                        mt_rand(1, 100) <= 80
                            ? 'EFECTIVO'
                            : 'QR',
                    fechaPago:
                        $fechaPedido
                            ->copy()
                            ->addMinutes(30),
                    referencia: null,
                    observacion:
                        self::MARCA .
                        ' | Anticipo 50% pedido en proceso.'
                );

                $pedido->update([
                    'estado' => 'EN_PROCESO',
                ]);

                continue;
            }

            /*
             * De los pedidos PROGRAMADOS,
             * la mitad queda con anticipo del 30%
             * y la otra mitad sin pago.
             */
            if ($i % 2 === 0) {
                $anticipo = round(
                    $total * 0.30,
                    2
                );

                $this->crearPagoYRecibo(
                    venta: null,
                    pedido: $pedido,
                    usuarioId: $usuarioId,
                    monto: $anticipo,
                    metodo: 'EFECTIVO',
                    fechaPago:
                        $fechaPedido
                            ->copy()
                            ->addMinutes(20),
                    referencia: null,
                    observacion:
                        self::MARCA .
                        ' | Anticipo 30% pedido programado.'
                );
            }
        }
    }

    private function crearDetallesVenta(
        Venta $venta,
        Collection $productosPresentaciones
    ): float {
        $cantidadLineas = mt_rand(1, 3);
        $seleccionados = [];
        $total = 0;

        while (
            count($seleccionados) <
            $cantidadLineas
        ) {
            $pp =
                $this->elegirPresentacionPonderada(
                    $productosPresentaciones
                );

            if (
                isset(
                    $seleccionados[
                        $pp->id_producto_presentacion
                    ]
                )
            ) {
                continue;
            }

            $seleccionados[
                $pp->id_producto_presentacion
            ] = true;

            $cantidad = mt_rand(1, 3);
            $precio = round(
                (float) $pp->precio,
                2
            );

            $costoPersonalizacion = 0;
            $detallePersonalizacion = null;

            if (
                (bool)
                    $pp->permite_personalizacion &&
                mt_rand(1, 100) <= 35
            ) {
                $costoPersonalizacion =
                    [10, 15, 20, 25][
                        mt_rand(0, 3)
                    ];

                $detallePersonalizacion =
                    [
                        'Mensaje de cumpleaños',
                        'Decoración floral',
                        'Nombre personalizado',
                        'Decoración temática',
                    ][mt_rand(0, 3)];
            }

            $subtotal = round(
                ($precio * $cantidad) +
                $costoPersonalizacion,
                2
            );

            DetalleVenta::create([
                'id_venta' =>
                    $venta->id_venta,
                'id_producto_presentacion' =>
                    $pp->id_producto_presentacion,
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
                'costo_personalizacion' =>
                    $costoPersonalizacion,
                'detalle_personalizacion' =>
                    $detallePersonalizacion,
                'subtotal' => $subtotal,
            ]);

            $total += $subtotal;
        }

        return round($total, 2);
    }

    private function crearDetallesPedido(
        Pedido $pedido,
        Collection $productosPresentaciones
    ): float {
        $cantidadLineas = mt_rand(1, 3);
        $seleccionados = [];
        $total = 0;

        while (
            count($seleccionados) <
            $cantidadLineas
        ) {
            $pp =
                $this->elegirPresentacionPonderada(
                    $productosPresentaciones
                );

            if (
                isset(
                    $seleccionados[
                        $pp->id_producto_presentacion
                    ]
                )
            ) {
                continue;
            }

            $seleccionados[
                $pp->id_producto_presentacion
            ] = true;

            $cantidad = mt_rand(1, 4);
            $precio = round(
                (float) $pp->precio,
                2
            );

            $costoPersonalizacion = 0;
            $detallePersonalizacion = null;

            if (
                (bool)
                    $pp->permite_personalizacion &&
                mt_rand(1, 100) <= 45
            ) {
                $costoPersonalizacion =
                    [15, 20, 25, 30][
                        mt_rand(0, 3)
                    ];

                $detallePersonalizacion =
                    [
                        'Diseño para cumpleaños',
                        'Diseño infantil',
                        'Dedicatoria personalizada',
                        'Decoración especial',
                    ][mt_rand(0, 3)];
            }

            $subtotal = round(
                ($precio * $cantidad) +
                $costoPersonalizacion,
                2
            );

            $pedido->detalles()->create([
                'id_producto_presentacion' =>
                    $pp->id_producto_presentacion,
                'cantidad' => $cantidad,
                'precio_congelado' => $precio,
                'detalle_personalizacion' =>
                    $detallePersonalizacion,
                'costo_personalizacion' =>
                    $costoPersonalizacion,
                'subtotal' => $subtotal,
            ]);

            $total += $subtotal;
        }

        return round($total, 2);
    }

    private function crearPagoYRecibo(
        ?Venta $venta,
        ?Pedido $pedido,
        int $usuarioId,
        float $monto,
        string $metodo,
        Carbon $fechaPago,
        ?string $referencia,
        string $observacion
    ): Pago {
        if (
            ($venta === null && $pedido === null) ||
            ($venta !== null && $pedido !== null)
        ) {
            throw new RuntimeException(
                'El pago demo debe pertenecer a una venta o a un pedido, pero no a ambos.'
            );
        }

        if (
            $metodo === 'QR' &&
            $referencia === null
        ) {
            $referencia =
                'QR-DEMO-' .
                ($pedido?->id_pedido ??
                    $venta?->id_venta) .
                '-' .
                Str::upper(
                    Str::random(8)
                );
        }

        $pago = Pago::create([
            'id_venta' =>
                $venta?->id_venta,
            'id_pedido' =>
                $pedido?->id_pedido,
            'id_usuario' => $usuarioId,
            'monto' => round($monto, 2),
            'metodo_pago' => $metodo,
            'referencia' => $referencia,
            'estado' => 'REGISTRADO',
            'observaciones' =>
                $observacion,
            'fecha_pago' => $fechaPago,
        ]);

        [$nombreCliente, $ciNit] =
            $this->datosCliente(
                $venta,
                $pedido
            );

        Recibo::create([
            'id_pago' => $pago->id_pago,
            'id_usuario_emision' =>
                $usuarioId,
            'nombre_cliente' =>
                $nombreCliente,
            'ci_nit_cliente' => $ciNit,
            'monto' => $pago->monto,
            'metodo_pago' =>
                $pago->metodo_pago,
            'referencia_pago' =>
                $pago->referencia,
            'fecha_pago' =>
                $fechaPago,
            'estado' => 'EMITIDO',
            'fecha_emision' =>
                $fechaPago
                    ->copy()
                    ->addMinute(),
            'cantidad_impresiones' => 0,
            'id_usuario_ultima_impresion' =>
                null,
            'fecha_ultima_impresion' =>
                null,
        ]);

        return $pago;
    }

    private function datosCliente(
        ?Venta $venta,
        ?Pedido $pedido
    ): array {
        $entidad = $venta ?? $pedido;

        $cliente = $entidad?->cliente;

        if ($cliente) {
            $nombre = trim(
                ($cliente->nombre ?? '') .
                ' ' .
                ($cliente->apellido ?? '')
            );

            return [
                $nombre !== ''
                    ? $nombre
                    : 'Cliente registrado',
                $cliente->ci_nit,
            ];
        }

        return [
            trim(
                (string) (
                    $entidad
                        ?->nombre_cliente_ocasional
                    ?? 'Cliente ocasional'
                )
            ),
            null,
        ];
    }

    private function elegirPresentacionPonderada(
        Collection $productosPresentaciones
    ): ProductoPresentacion {
        $ponderados = [];

        foreach (
            $productosPresentaciones as $pp
        ) {
            $nombre =
                $pp->producto?->nombre ?? '';

            $peso = match ($nombre) {
                'Torta de Chocolate' => 10,
                'Cupcake de Chocolate' => 9,
                'Galleta con Chispas de Chocolate' => 8,
                'Brownie Clásico' => 7,
                'Torta Tres Leches' => 7,
                'Roll de Canela' => 6,
                'Cheesecake de Frutos Rojos' => 5,
                default => 3,
            };

            for ($i = 0; $i < $peso; $i++) {
                $ponderados[] = $pp;
            }
        }

        return $ponderados[
            mt_rand(
                0,
                count($ponderados) - 1
            )
        ];
    }

    private function usuarioAleatorio(
        Collection $usuarios
    ): int {
        return (int) $usuarios[
            mt_rand(
                0,
                $usuarios->count() - 1
            )
        ];
    }

    private function fechaAleatoria(
        string $inicio,
        string $fin
    ): Carbon {
        $desde = Carbon::parse($inicio)
            ->startOfDay()
            ->timestamp;

        $hasta = Carbon::parse($fin)
            ->endOfDay()
            ->timestamp;

        $fecha = Carbon::createFromTimestamp(
            mt_rand($desde, $hasta)
        );

        return $fecha
            ->setSecond(0);
    }
}
