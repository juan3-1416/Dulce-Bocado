<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Throwable;

class DashboardAggregatorService
{
    /**
     * Resumen completo de métricas, KPIs, gráficos y tablas para el dashboard.
     * Totalmente desacoplado: consume los microservicios mediante REST y Bearer token.
     */
    public function obtenerResumen(string $periodo, ?string $fechaInicioStr, ?string $fechaFinStr, string $token): array
    {
        [$fechaInicio, $fechaFin, $tipoPeriodo, $descripcionPeriodo] = $this->resolverRangoFechas(
            $periodo,
            $fechaInicioStr,
            $fechaFinStr
        );

        // Consultas con tolerancia a fallos
        $datosVentas = $this->consultarVentas($fechaInicio, $fechaFin, $token);
        $datosPagos = $this->consultarPagos($token);
        $datosPedidos = $this->consultarPedidos($fechaInicio, $fechaFin, $token);
        $datosInventario = $this->consultarInventario($token);
        $datosProduccion = $this->consultarProduccion($fechaInicio, $fechaFin, $token);

        // Métricas de rentabilidad / costos
        $ventasTotal = $datosVentas['total_monto'];
        $costoVentas = round($ventasTotal * 0.65, 2); // Costo referencial estimado 65% si no hay recetas directas
        $gananciaBruta = round($ventasTotal - $costoVentas, 2);
        $margenBruto = $ventasTotal > 0 ? round(($gananciaBruta / $ventasTotal) * 100, 1) : 0.0;
        $coberturaCostos = 100.0;

        $kpis = [
            'ventas_total' => $ventasTotal,
            'ventas_cantidad' => $datosVentas['cantidad'],
            'ventas_hoy' => $datosVentas['monto_hoy'],
            'ganancia_bruta' => $gananciaBruta,
            'costo_ventas' => $costoVentas,
            'margen_bruto' => $margenBruto,
            'cobertura_costos' => $coberturaCostos,
            'pagos_total' => $datosPagos['total_pagado'],
            'pagos_efectivo' => $datosPagos['total_efectivo'],
            'pagos_qr' => $datosPagos['total_qr'],
            'pedidos_activos' => $datosPedidos['activos'],
            'pedidos_en_proceso' => $datosPedidos['en_proceso'],
            'pedidos_programados' => $datosPedidos['programados'],
            'produccion_activa' => $datosProduccion['activas'],
            'produccion_finalizada' => $datosProduccion['completadas'],
            'alertas_stock' => $datosInventario['alertas_criticas'],
        ];

        return [
            'periodo' => [
                'tipo' => $tipoPeriodo,
                'descripcion' => $descripcionPeriodo,
                'inicio' => $fechaInicio->format('d/m/Y'),
                'fin' => $fechaFin->format('d/m/Y'),
            ],
            'fecha_inicio' => $fechaInicio->toIso8601String(),
            'fecha_fin' => $fechaFin->toIso8601String(),
            'actualizado_at' => now()->toIso8601String(),
            'kpis' => $kpis,
            'graficos' => [
                'tendencia_ventas' => $datosVentas['tendencia'],
                'estados_pedidos' => $datosPedidos['distribucion_estados'],
                'top_productos' => $datosVentas['top_productos'],
                'almacenes' => $datosInventario['almacenes'],
            ],
            'tablas' => [
                'proximos_pedidos' => $datosPedidos['proximos_pedidos'],
                'ultimas_ventas' => $datosVentas['ultimas_ventas'],
                'stock_bajo' => $datosInventario['items_stock_bajo'],
            ],
            'fuentes_estado' => [
                'sales' => $datosVentas['estado_fuente'],
                'payments' => $datosPagos['estado_fuente'],
                'orders' => $datosPedidos['estado_fuente'],
                'inventory' => $datosInventario['estado_fuente'],
                'production' => $datosProduccion['estado_fuente'],
            ],
        ];
    }

    private function resolverRangoFechas(string $periodo, ?string $fechaInicioStr, ?string $fechaFinStr): array
    {
        $ahora = Carbon::now('America/La_Paz');

        if ($periodo === 'hoy') {
            $inicio = $ahora->copy()->startOfDay();
            $fin = $ahora->copy()->endOfDay();
            return [$inicio, $fin, 'hoy', 'Hoy: ' . $ahora->format('d/m/Y')];
        }

        if ($periodo === '7d') {
            $inicio = $ahora->copy()->subDays(6)->startOfDay();
            $fin = $ahora->copy()->endOfDay();
            return [$inicio, $fin, '7d', 'Últimos 7 días: ' . $inicio->format('d/m') . ' al ' . $fin->format('d/m/Y')];
        }

        if ($periodo === 'anio') {
            $inicio = $ahora->copy()->startOfYear();
            $fin = $ahora->copy()->endOfYear();
            return [$inicio, $fin, 'anio', 'Año ' . $ahora->year];
        }

        if ($periodo === 'personalizado' && $fechaInicioStr && $fechaFinStr) {
            try {
                $inicio = Carbon::parse($fechaInicioStr)->startOfDay();
                $fin = Carbon::parse($fechaFinStr)->endOfDay();
                return [$inicio, $fin, 'personalizado', 'Del ' . $inicio->format('d/m/Y') . ' al ' . $fin->format('d/m/Y')];
            } catch (Throwable) {
                // fallback a mes
            }
        }

        $inicio = $ahora->copy()->startOfMonth();
        $fin = $ahora->copy()->endOfMonth();
        return [$inicio, $fin, 'mes', 'Mes actual: ' . $inicio->format('d/m/Y') . ' al ' . $fin->format('d/m/Y')];
    }

    private function consultarVentas(Carbon $inicio, Carbon $fin, string $token): array
    {
        $url = config('integrations.sales.url') . '/api/ventas?per_page=100';
        try {
            $resp = Http::timeout(config('integrations.sales.timeout', 4))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if (!$resp->successful()) {
                return $this->ventasFallback('HTTP ' . $resp->status());
            }

            $ventas = $resp->json('data') ?? $resp->json('ventas') ?? [];

            $totalMonto = 0.0;
            $cantidad = 0;
            $montoHoy = 0.0;
            $hoyStr = Carbon::now('America/La_Paz')->format('Y-m-d');
            $porFecha = [];
            $productosVendidos = [];
            $ultimasVentas = [];

            foreach ($ventas as $v) {
                $estado = $v['estado'] ?? 'REGISTRADA';
                if ($estado === 'ANULADA' || $estado === 'CANCELADA') {
                    continue;
                }

                $fechaVenta = isset($v['fecha_venta']) ? Carbon::parse($v['fecha_venta']) : null;
                if ($fechaVenta && ($fechaVenta->lt($inicio) || $fechaVenta->gt($fin))) {
                    continue;
                }

                $monto = (float) ($v['total'] ?? 0);
                $totalMonto += $monto;
                $cantidad++;

                if ($fechaVenta && $fechaVenta->format('Y-m-d') === $hoyStr) {
                    $montoHoy += $monto;
                }

                // Serie de tendencia
                $claveFecha = $fechaVenta ? $fechaVenta->format('Y-m-d') : 'Sin fecha';
                $porFecha[$claveFecha] = ($porFecha[$claveFecha] ?? 0.0) + $monto;

                // Armar datos de últimas ventas (máx 6)
                if (count($ultimasVentas) < 6) {
                    $clienteNombre = 'Cliente ocasional';
                    if (is_array($v['cliente'] ?? null)) {
                        $clienteNombre = $v['cliente']['nombre_completo'] ?? $v['cliente']['nombre'] ?? 'Cliente';
                    } elseif (is_string($v['cliente'] ?? null) && !empty($v['cliente'])) {
                        $clienteNombre = $v['cliente'];
                    } elseif (!empty($v['nombre_cliente_ocasional'])) {
                        $clienteNombre = $v['nombre_cliente_ocasional'];
                    }

                    $vendedorNombre = 'Cajero';
                    if (is_array($v['usuario'] ?? null)) {
                        $vendedorNombre = $v['usuario']['nombre'] ?? 'Cajero';
                    } elseif (is_string($v['vendedor'] ?? null)) {
                        $vendedorNombre = $v['vendedor'];
                    }

                    $ultimasVentas[] = [
                        'id_venta' => $v['id_venta'] ?? $v['id'] ?? 0,
                        'cliente' => $clienteNombre,
                        'fecha_venta' => $fechaVenta ? $fechaVenta->format('d/m/Y H:i') : '-',
                        'vendedor' => $vendedorNombre,
                        'total' => $monto,
                        'estado' => $estado,
                    ];
                }

                // Desglose de detalles para Top Productos
                $detalles = $v['detalles'] ?? $v['items'] ?? [];
                if (is_array($detalles)) {
                    foreach ($detalles as $d) {
                        $prodId = $d['id_producto_presentacion'] ?? $d['producto_id'] ?? 1;
                        $nombreProd = $d['producto'] ?? $d['producto_snapshot'] ?? ('Producto #' . $prodId);
                        $nombrePres = $d['presentacion'] ?? 'Unidad';
                        $cantItem = (int) ($d['cantidad'] ?? 1);
                        $subtotalItem = (float) ($d['subtotal'] ?? ($cantItem * ($d['precio_unitario'] ?? 0)));

                        if (!isset($productosVendidos[$prodId])) {
                            $productosVendidos[$prodId] = [
                                'id_producto_presentacion' => $prodId,
                                'producto' => $nombreProd,
                                'presentacion' => $nombrePres,
                                'unidades' => 0,
                                'monto' => 0.0,
                            ];
                        }
                        $productosVendidos[$prodId]['unidades'] += $cantItem;
                        $productosVendidos[$prodId]['monto'] += $subtotalItem;
                    }
                }
            }

            // Top 5 productos
            usort($productosVendidos, fn ($a, $b) => $b['unidades'] <=> $a['unidades']);
            $topProductos = array_slice($productosVendidos, 0, 5);

            // Tendencia diaria
            ksort($porFecha);
            $tendencia = [];
            foreach ($porFecha as $fecha => $m) {
                $tendencia[] = [
                    'fecha' => $fecha,
                    'etiqueta' => Carbon::parse($fecha)->format('d/m'),
                    'total' => round($m, 2),
                ];
            }

            return [
                'total_monto' => round($totalMonto, 2),
                'cantidad' => $cantidad,
                'monto_hoy' => round($montoHoy, 2),
                'tendencia' => $tendencia,
                'top_productos' => $topProductos,
                'ultimas_ventas' => $ultimasVentas,
                'estado_fuente' => 'DISPONIBLE',
            ];
        } catch (Throwable $e) {
            return $this->ventasFallback($e->getMessage());
        }
    }

    private function ventasFallback(string $motivo): array
    {
        return [
            'total_monto' => 0.0,
            'cantidad' => 0,
            'monto_hoy' => 0.0,
            'tendencia' => [],
            'top_productos' => [],
            'ultimas_ventas' => [],
            'estado_fuente' => 'DEGRADADO: ' . $motivo,
        ];
    }

    private function consultarPagos(string $token): array
    {
        $url = config('integrations.payments.url') . '/api/pagos';
        try {
            $resp = Http::timeout(config('integrations.payments.timeout', 4))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if (!$resp->successful()) {
                return [
                    'total_pagado' => 0.0,
                    'total_efectivo' => 0.0,
                    'total_qr' => 0.0,
                    'estado_fuente' => 'NO_DISPONIBLE',
                ];
            }

            $pagos = $resp->json('pagos') ?? $resp->json('data') ?? [];
            $totalPagado = 0.0;
            $totalEfectivo = 0.0;
            $totalQr = 0.0;

            foreach ($pagos as $p) {
                if (($p['estado'] ?? '') === 'CONFIRMADO') {
                    $m = (float) ($p['monto'] ?? 0);
                    $totalPagado += $m;
                    if (strtoupper($p['medio'] ?? '') === 'QR' || strtoupper($p['metodo'] ?? '') === 'QR') {
                        $totalQr += $m;
                    } else {
                        $totalEfectivo += $m;
                    }
                }
            }

            return [
                'total_pagado' => round($totalPagado, 2),
                'total_efectivo' => round($totalEfectivo, 2),
                'total_qr' => round($totalQr, 2),
                'estado_fuente' => 'DISPONIBLE',
            ];
        } catch (Throwable) {
            return [
                'total_pagado' => 0.0,
                'total_efectivo' => 0.0,
                'total_qr' => 0.0,
                'estado_fuente' => 'TIMEOUT',
            ];
        }
    }

    private function consultarPedidos(Carbon $inicio, Carbon $fin, string $token): array
    {
        $url = config('integrations.orders.url') . '/api/pedidos';
        try {
            $resp = Http::timeout(config('integrations.orders.timeout', 4))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if (!$resp->successful()) {
                return [
                    'activos' => 0,
                    'en_proceso' => 0,
                    'programados' => 0,
                    'distribucion_estados' => [],
                    'proximos_pedidos' => [],
                    'estado_fuente' => 'NO_DISPONIBLE',
                ];
            }

            $pedidos = $resp->json('pedidos') ?? $resp->json('data') ?? [];
            $estadosContador = [
                'PROGRAMADO' => 0,
                'EN_PROCESO' => 0,
                'ENTREGADO' => 0,
                'CANCELADO' => 0,
            ];

            $proximos = [];

            foreach ($pedidos as $p) {
                $rawEstado = strtoupper($p['estado'] ?? 'PROGRAMADO');
                $est = match ($rawEstado) {
                    'EN PROCESO', 'EN_PROCESO', 'PROCESO' => 'EN_PROCESO',
                    'ENTREGADO', 'FINALIZADO' => 'ENTREGADO',
                    'CANCELADO', 'ANULADO' => 'CANCELADO',
                    default => 'PROGRAMADO',
                };

                $estadosContador[$est] = ($estadosContador[$est] ?? 0) + 1;

                // Próximos pedidos a entregar (no cancelados ni entregados)
                if (in_array($est, ['PROGRAMADO', 'EN_PROCESO'], true)) {
                    $clienteNombre = 'Cliente';
                    if (is_array($p['cliente'] ?? null)) {
                        $clienteNombre = $p['cliente']['nombre_completo'] ?? $p['cliente']['nombre'] ?? 'Cliente';
                    } elseif (is_string($p['cliente'] ?? null)) {
                        $clienteNombre = $p['cliente'];
                    }

                    $totalPed = (float) ($p['total'] ?? 0);
                    $totalPagado = (float) ($p['total_pagado'] ?? $p['pagado'] ?? 0);
                    $saldo = (float) ($p['saldo'] ?? max(0, $totalPed - $totalPagado));

                    $proximos[] = [
                        'id_pedido' => $p['id_pedido'] ?? $p['id'] ?? 0,
                        'cliente' => $clienteNombre,
                        'fecha_entrega' => $p['fecha_entrega'] ?? Carbon::now()->format('Y-m-d'),
                        'hora_entrega' => $p['hora_entrega'] ?? '12:00',
                        'total' => $totalPed,
                        'saldo' => $saldo,
                        'estado' => $est,
                    ];
                }
            }

            // Ordenar próximos pedidos por fecha de entrega
            usort($proximos, fn ($a, $b) => strcmp($a['fecha_entrega'] . ' ' . $a['hora_entrega'], $b['fecha_entrega'] . ' ' . $b['hora_entrega']));
            $proximos = array_slice($proximos, 0, 5);

            $distribucionEstados = [
                ['estado' => 'PROGRAMADO', 'cantidad' => $estadosContador['PROGRAMADO']],
                ['estado' => 'EN_PROCESO', 'cantidad' => $estadosContador['EN_PROCESO']],
                ['estado' => 'ENTREGADO', 'cantidad' => $estadosContador['ENTREGADO']],
                ['estado' => 'CANCELADO', 'cantidad' => $estadosContador['CANCELADO']],
            ];

            return [
                'activos' => $estadosContador['PROGRAMADO'] + $estadosContador['EN_PROCESO'],
                'en_proceso' => $estadosContador['EN_PROCESO'],
                'programados' => $estadosContador['PROGRAMADO'],
                'distribucion_estados' => $distribucionEstados,
                'proximos_pedidos' => $proximos,
                'estado_fuente' => 'DISPONIBLE',
            ];
        } catch (Throwable) {
            return [
                'activos' => 0,
                'en_proceso' => 0,
                'programados' => 0,
                'distribucion_estados' => [],
                'proximos_pedidos' => [],
                'estado_fuente' => 'TIMEOUT',
            ];
        }
    }

    private function consultarInventario(string $token): array
    {
        $inventoryUrl = rtrim(
            (string) config('integrations.inventory.url'),
            '/'
        );

        $catalogUrl = rtrim(
            (string) config('integrations.catalog.url'),
            '/'
        );

        $headers = [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ];

        try {
            $respExistencias = Http::timeout(
                config('integrations.inventory.timeout', 4)
            )
                ->withHeaders($headers)
                ->get($inventoryUrl.'/api/existencias');

            if (!$respExistencias->successful()) {
                return [
                    'alertas_criticas' => 0,
                    'items_stock_bajo' => [],
                    'almacenes' => [],
                    'estado_fuente' => 'NO_DISPONIBLE',
                ];
            }

            $existencias =
                $respExistencias->json('existencias')
                ?? $respExistencias->json('data')
                ?? [];

            /*
            |--------------------------------------------------------------------------
            | Almacenes
            |--------------------------------------------------------------------------
            */
            $almacenesCatalogo = [];

            try {
                $respAlmacenes = Http::timeout(
                    config('integrations.inventory.timeout', 4)
                )
                    ->withHeaders($headers)
                    ->get($inventoryUrl.'/api/almacenes');

                if ($respAlmacenes->successful()) {
                    foreach (
                        $respAlmacenes->json('almacenes') ?? []
                        as $almacen
                    ) {
                        $id = (int) (
                            $almacen['id_almacen']
                            ?? $almacen['almacen_id']
                            ?? 0
                        );

                        if ($id > 0) {
                            $almacenesCatalogo[$id] =
                                $almacen['nombre']
                                ?? "Almacén #{$id}";
                        }
                    }
                }
            } catch (Throwable) {
                // El Dashboard sigue funcionando con respaldo por ID.
            }

            /*
            |--------------------------------------------------------------------------
            | Presentaciones
            |--------------------------------------------------------------------------
            */
            $presentaciones = [];

            try {
                $respPresentaciones = Http::timeout(
                    config('integrations.catalog.timeout', 4)
                )
                    ->withHeaders($headers)
                    ->get($catalogUrl.'/api/presentaciones');

                if ($respPresentaciones->successful()) {
                    foreach (
                        $respPresentaciones->json('presentaciones') ?? []
                        as $presentacion
                    ) {
                        $id = (int) (
                            $presentacion['presentacion_id']
                            ?? $presentacion['id_presentacion']
                            ?? 0
                        );

                        if ($id < 1) {
                            continue;
                        }

                        $producto =
                            is_array(
                                $presentacion['producto'] ?? null
                            )
                                ? trim(
                                    (string) (
                                        $presentacion['producto']['nombre']
                                        ?? ''
                                    )
                                )
                                : '';

                        $nombrePresentacion = trim(
                            (string) (
                                $presentacion['nombre']
                                ?? ''
                            )
                        );

                        $presentaciones[$id] = [
                            'nombre' =>
                                $producto !== ''
                                    ? $producto
                                    : "Producto #{$id}",

                            'detalle' =>
                                $nombrePresentacion !== ''
                                    ? $nombrePresentacion
                                    : "Presentación #{$id}",
                        ];
                    }
                }
            } catch (Throwable) {
                // El Dashboard sigue funcionando con respaldo por ID.
            }

            /*
            |--------------------------------------------------------------------------
            | Materias primas
            |--------------------------------------------------------------------------
            */
            $materiasPrimas = [];

            try {
                $respMaterias = Http::timeout(
                    config('integrations.catalog.timeout', 4)
                )
                    ->withHeaders($headers)
                    ->get($catalogUrl.'/api/materias-primas');

                if ($respMaterias->successful()) {
                    foreach (
                        $respMaterias->json('materias_primas') ?? []
                        as $materia
                    ) {
                        $id = (int) (
                            $materia['id_materia_prima']
                            ?? 0
                        );

                        if ($id < 1) {
                            continue;
                        }

                        $materiasPrimas[$id] = [
                            'nombre' =>
                                trim(
                                    (string) (
                                        $materia['nombre']
                                        ?? ''
                                    )
                                ),

                            'unidad' =>
                                trim(
                                    (string) (
                                        $materia['unidad_medida']
                                        ?? ''
                                    )
                                ),
                        ];
                    }
                }
            } catch (Throwable) {
                // El Dashboard sigue funcionando con respaldo por ID.
            }

            $alertas = 0;
            $itemsBajoStock = [];
            $almacenesMap = [];

            foreach ($existencias as $item) {
                $cantidad = (float) (
                    $item['stock_disponible']
                    ?? $item['cantidad']
                    ?? 0
                );

                $almacenId = (int) (
                    $item['almacen_id']
                    ?? $item['id_almacen']
                    ?? 0
                );

                $tipoArticulo = strtoupper(
                    (string) (
                        $item['tipo_articulo']
                        ?? $item['tipo']
                        ?? ''
                    )
                );

                $articuloId = (int) (
                    $item['articulo_id']
                    ?? $item['presentacion_id']
                    ?? $item['id_materia_prima']
                    ?? 0
                );

                $almacenNombre =
                    $almacenesCatalogo[$almacenId]
                    ?? (
                        $almacenId > 0
                            ? "Almacén #{$almacenId}"
                            : 'Almacén'
                    );

                $nombre = "Artículo #{$articuloId}";
                $detalle = '';
                $unidad = (string) (
                    $item['unidad']
                    ?? ''
                );

                if ($tipoArticulo === 'PRESENTACION') {
                    $meta =
                        $presentaciones[$articuloId]
                        ?? null;

                    if ($meta) {
                        $nombre = $meta['nombre'];
                        $detalle = $meta['detalle'];
                    } else {
                        $nombre =
                            "Presentación #{$articuloId}";
                    }

                    if ($unidad === '') {
                        $unidad = 'unidad';
                    }
                }

                if ($tipoArticulo === 'MATERIA_PRIMA') {
                    $meta =
                        $materiasPrimas[$articuloId]
                        ?? null;

                    if ($meta) {
                        $nombre =
                            $meta['nombre'] !== ''
                                ? $meta['nombre']
                                : "Materia prima #{$articuloId}";

                        if (
                            $unidad === ''
                            && $meta['unidad'] !== ''
                        ) {
                            $unidad = $meta['unidad'];
                        }
                    } else {
                        $nombre =
                            "Materia prima #{$articuloId}";
                    }

                    $detalle = $unidad;
                }

                if (!isset($almacenesMap[$almacenId])) {
                    $almacenesMap[$almacenId] = [
                        'id_almacen' => $almacenId,
                        'nombre' => $almacenNombre,
                        'total_items' => 0,
                        'stock_total' => 0.0,
                        'stock_critico' => 0,
                    ];
                }

                $almacenesMap[$almacenId]['total_items']++;
                $almacenesMap[$almacenId]['stock_total'] +=
                    $cantidad;

                if ($cantidad <= 5) {
                    $alertas++;

                    $almacenesMap[
                        $almacenId
                    ]['stock_critico']++;

                    $itemsBajoStock[] = [
                        'id_inventario' =>
                            "{$almacenId}-{$tipoArticulo}-{$articuloId}",

                        'almacen' =>
                            $almacenNombre,

                        'nombre' =>
                            $nombre,

                        'detalle' =>
                            $detalle,

                        'cantidad' =>
                            $cantidad,

                        'unidad' =>
                            $unidad,

                        'tipo_articulo' =>
                            $tipoArticulo,

                        'articulo_id' =>
                            $articuloId,
                    ];
                }
            }

            usort(
                $itemsBajoStock,
                fn (array $a, array $b) =>
                    $a['cantidad'] <=> $b['cantidad']
            );

            $itemsBajoStock =
                array_slice(
                    $itemsBajoStock,
                    0,
                    6
                );

            return [
                'alertas_criticas' => $alertas,
                'items_stock_bajo' => $itemsBajoStock,
                'almacenes' => array_values($almacenesMap),
                'estado_fuente' => 'DISPONIBLE',
            ];
        } catch (Throwable) {
            return [
                'alertas_criticas' => 0,
                'items_stock_bajo' => [],
                'almacenes' => [],
                'estado_fuente' => 'TIMEOUT',
            ];
        }
    }

    private function consultarProduccion(Carbon $inicio, Carbon $fin, string $token): array
    {
        $url = config('integrations.production.url') . '/api/producciones';
        try {
            $resp = Http::timeout(config('integrations.production.timeout', 4))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if (!$resp->successful()) {
                return ['activas' => 0, 'completadas' => 0, 'estado_fuente' => 'NO_DISPONIBLE'];
            }

            $producciones = $resp->json('producciones') ?? $resp->json('data') ?? [];
            $activas = 0;
            $completadas = 0;

            foreach ($producciones as $prod) {
                $estado = strtoupper($prod['estado'] ?? 'PROGRAMADA');
                if (in_array($estado, ['PROGRAMADA', 'EN_PROCESO', 'INICIADA'], true)) {
                    $activas++;
                } elseif (in_array($estado, ['COMPLETADA', 'FINALIZADA'], true)) {
                    $completadas++;
                }
            }

            return [
                'activas' => $activas,
                'completadas' => $completadas,
                'estado_fuente' => 'DISPONIBLE',
            ];
        } catch (Throwable) {
            return ['activas' => 0, 'completadas' => 0, 'estado_fuente' => 'TIMEOUT'];
        }
    }
}
