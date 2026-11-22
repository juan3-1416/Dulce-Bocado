<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Throwable;

class ReporteDataService
{
    /**
     * Obtiene los datos unificados para el reporte solicitado.
     */
    public function obtenerDatosReporte(string $tipo, array $filtros, string $token): array
    {
        return match ($tipo) {
            'ventas' => $this->obtenerReporteVentas($filtros, $token),
            'pedidos' => $this->obtenerReportePedidos($filtros, $token),
            'inventario' => $this->obtenerReporteInventario($filtros, $token),
            default => throw new \InvalidArgumentException("Tipo de reporte no soportado: {$tipo}"),
        };
    }

    /**
     * Reporte parametrizado de ventas.
     */
    public function obtenerReporteVentas(array $filtros, string $token): array
    {
        [$fechaDesde, $fechaHasta] = $this->resolverRangoFechas($filtros);
        $estadoFiltro = $filtros['estado'] ?? null;
        $idClienteFiltro = isset($filtros['id_cliente']) && $filtros['id_cliente'] !== '' ? (int) $filtros['id_cliente'] : null;
        $idUsuarioFiltro = isset($filtros['id_usuario']) && $filtros['id_usuario'] !== '' ? (int) $filtros['id_usuario'] : null;

        $url = config('integrations.sales.url') . '/api/ventas?per_page=200';
        $ventasRaw = [];

        try {
            $resp = Http::timeout(config('integrations.sales.timeout', 5))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if ($resp->successful()) {
                $ventasRaw = $resp->json('data') ?? $resp->json('ventas') ?? [];
            }
        } catch (Throwable) {
            $ventasRaw = [];
        }

        $datos = [];
        $totalVentas = 0.0;
        $ventasValidas = 0;
        $ventasAnuladas = 0;

        foreach ($ventasRaw as $v) {
            $fechaVenta = isset($v['fecha_venta']) ? Carbon::parse($v['fecha_venta']) : null;

            if ($fechaVenta && ($fechaVenta->lt($fechaDesde) || $fechaVenta->gt($fechaHasta))) {
                continue;
            }

            $estado = $v['estado'] ?? 'REGISTRADA';
            if ($estadoFiltro && strcasecmp($estado, $estadoFiltro) !== 0) {
                continue;
            }

            if ($idClienteFiltro && (int) ($v['id_cliente'] ?? 0) !== $idClienteFiltro) {
                continue;
            }

            if ($idUsuarioFiltro && (int) ($v['id_usuario'] ?? 0) !== $idUsuarioFiltro) {
                continue;
            }

            $monto = (float) ($v['total'] ?? 0);
            $esAnulada = in_array(strtoupper($estado), ['ANULADA', 'CANCELADA'], true);

            if ($esAnulada) {
                $ventasAnuladas++;
            } else {
                $ventasValidas++;
                $totalVentas += $monto;
            }

            $clienteNombre = 'Cliente ocasional';
            if (is_array($v['cliente'] ?? null)) {
                $clienteNombre = $v['cliente']['nombre_completo'] ?? $v['cliente']['nombre'] ?? 'Cliente';
            } elseif (is_string($v['cliente'] ?? null) && !empty($v['cliente'])) {
                $clienteNombre = $v['cliente'];
            } elseif (!empty($v['nombre_cliente_ocasional'])) {
                $clienteNombre = $v['nombre_cliente_ocasional'];
            }

            $vendedorNombre = 'Sin usuario';
            if (is_array($v['usuario'] ?? null)) {
                $vendedorNombre = $v['usuario']['nombre'] ?? 'Sin usuario';
            } elseif (is_string($v['vendedor'] ?? null)) {
                $vendedorNombre = $v['vendedor'];
            }

            $detalles = [];
            foreach ($v['detalles'] ?? [] as $d) {
                $detalles[] = [
                    'producto' => $d['producto'] ?? $d['producto_snapshot'] ?? 'Producto',
                    'presentacion' => $d['presentacion'] ?? 'Unidad',
                    'cantidad' => (int) ($d['cantidad'] ?? 1),
                    'precio_unitario' => (float) ($d['precio_unitario'] ?? 0),
                    'costo_personalizacion' => (float) ($d['costo_personalizacion'] ?? 0),
                    'subtotal' => (float) ($d['subtotal'] ?? 0),
                ];
            }

            $datos[] = [
                'id_venta' => $v['id_venta'] ?? $v['id'] ?? 0,
                'fecha_venta' => $fechaVenta ? $fechaVenta->format('Y-m-d H:i:s') : '-',
                'cliente' => $clienteNombre,
                'vendedor' => $vendedorNombre,
                'estado' => $estado,
                'total' => $monto,
                'observaciones' => $v['observaciones'] ?? '',
                'detalles' => $detalles,
            ];
        }

        // Ordenar desc por fecha
        usort($datos, fn ($a, $b) => strcmp($b['fecha_venta'], $a['fecha_venta']));

        return [
            'tipo' => 'ventas',
            'titulo' => 'Reporte de Ventas',
            'filtros' => [
                'fecha_desde' => $fechaDesde->format('Y-m-d'),
                'fecha_hasta' => $fechaHasta->format('Y-m-d'),
                'estado' => $estadoFiltro ?: 'Todos',
                'id_cliente' => $idClienteFiltro,
                'id_usuario' => $idUsuarioFiltro,
            ],
            'resumen' => [
                'cantidad_registros' => count($datos),
                'ventas_validas' => $ventasValidas,
                'ventas_anuladas' => $ventasAnuladas,
                'total_ventas' => round($totalVentas, 2),
            ],
            'datos' => $datos,
        ];
    }

    /**
     * Reporte parametrizado de pedidos con pagos y saldos.
     */
    public function obtenerReportePedidos(array $filtros, string $token): array
    {
        [$fechaDesde, $fechaHasta] = $this->resolverRangoFechas($filtros);
        $estadoFiltro = $filtros['estado'] ?? null;
        $idClienteFiltro = isset($filtros['id_cliente']) && $filtros['id_cliente'] !== '' ? (int) $filtros['id_cliente'] : null;

        $url = config('integrations.orders.url') . '/api/pedidos';
        $pedidosRaw = [];

        try {
            $resp = Http::timeout(config('integrations.orders.timeout', 5))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if ($resp->successful()) {
                $pedidosRaw = $resp->json('data') ?? $resp->json('pedidos') ?? [];
            }
        } catch (Throwable) {
            $pedidosRaw = [];
        }

        $datos = [];
        $totalGeneral = 0.0;
        $totalPagadoGeneral = 0.0;
        $totalSaldoGeneral = 0.0;

        foreach ($pedidosRaw as $p) {
            $fechaPedido = isset($p['fecha_pedido']) ? Carbon::parse($p['fecha_pedido']) : null;

            if ($fechaPedido && ($fechaPedido->lt($fechaDesde) || $fechaPedido->gt($fechaHasta))) {
                continue;
            }

            $estado = $p['estado'] ?? 'PROGRAMADO';
            if ($estadoFiltro && strcasecmp($estado, $estadoFiltro) !== 0) {
                continue;
            }

            if ($idClienteFiltro && (int) ($p['id_cliente'] ?? 0) !== $idClienteFiltro) {
                continue;
            }

            $total = (float) ($p['total'] ?? 0);
            $pagado = (float) ($p['total_pagado'] ?? $p['pagado'] ?? 0);
            $saldo = (float) ($p['saldo'] ?? max(0, $total - $pagado));

            $totalGeneral += $total;
            $totalPagadoGeneral += $pagado;
            $totalSaldoGeneral += $saldo;

            $clienteNombre = 'Cliente';
            if (is_array($p['cliente'] ?? null)) {
                $clienteNombre = $p['cliente']['nombre_completo'] ?? $p['cliente']['nombre'] ?? 'Cliente';
            } elseif (is_string($p['cliente'] ?? null)) {
                $clienteNombre = $p['cliente'];
            }

            $datos[] = [
                'id_pedido' => $p['id_pedido'] ?? $p['id'] ?? 0,
                'fecha_pedido' => $fechaPedido ? $fechaPedido->format('Y-m-d') : '-',
                'fecha_entrega' => $p['fecha_entrega'] ?? '-',
                'hora_entrega' => $p['hora_entrega'] ?? '',
                'cliente' => $clienteNombre,
                'estado' => $estado,
                'total' => $total,
                'total_pagado' => $pagado,
                'saldo' => $saldo,
            ];
        }

        return [
            'tipo' => 'pedidos',
            'titulo' => 'Reporte de Pedidos',
            'filtros' => [
                'fecha_desde' => $fechaDesde->format('Y-m-d'),
                'fecha_hasta' => $fechaHasta->format('Y-m-d'),
                'estado' => $estadoFiltro ?: 'Todos',
                'id_cliente' => $idClienteFiltro,
            ],
            'resumen' => [
                'cantidad_registros' => count($datos),
                'total_pedidos' => round($totalGeneral, 2),
                'total_pagado' => round($totalPagadoGeneral, 2),
                'total_saldo_pendiente' => round($totalSaldoGeneral, 2),
            ],
            'datos' => $datos,
        ];
    }

    /**
     * Reporte parametrizado de inventario y existencias.
     */
    public function obtenerReporteInventario(array $filtros, string $token): array
    {
        $idAlmacenFiltro = isset($filtros['id_almacen']) && $filtros['id_almacen'] !== '' ? (int) $filtros['id_almacen'] : null;
        $tipoFiltro = $filtros['tipo'] ?? null; // 'materia_prima' o 'producto'
        $soloCritico = !empty($filtros['stock_critico']) && filter_var($filtros['stock_critico'], FILTER_VALIDATE_BOOLEAN);

        $url = config('integrations.inventory.url') . '/api/existencias';
        $existenciasRaw = [];

        try {
            $resp = Http::timeout(config('integrations.inventory.timeout', 5))
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if ($resp->successful()) {
                $existenciasRaw = $resp->json('data') ?? $resp->json('existencias') ?? [];
            }
        } catch (Throwable) {
            $existenciasRaw = [];
        }

        $datos = [];
        $stockTotal = 0.0;
        $itemsCriticos = 0;

        foreach ($existenciasRaw as $item) {
            $almacenId = (int) ($item['id_almacen'] ?? (is_array($item['almacen'] ?? null) ? $item['almacen']['id_almacen'] : 1));
            if ($idAlmacenFiltro && $almacenId !== $idAlmacenFiltro) {
                continue;
            }

            $tipoItem = $item['tipo'] ?? (isset($item['id_materia_prima']) ? 'materia_prima' : 'producto');
            if ($tipoFiltro && $tipoItem !== $tipoFiltro) {
                continue;
            }

            $cant = (float) ($item['stock_disponible'] ?? $item['cantidad'] ?? 0);
            $esCritico = $cant <= 5.0;

            if ($soloCritico && !$esCritico) {
                continue;
            }

            $stockTotal += $cant;
            if ($esCritico) {
                $itemsCriticos++;
            }

            $almacenNombre = $item['almacen_nombre'] ?? (is_array($item['almacen'] ?? null) ? $item['almacen']['nombre'] : ($item['almacen'] ?? 'Principal'));
            $nombreItem = $item['nombre'] ?? $item['articulo'] ?? 'Ítem';
            $presentacion = $item['presentacion'] ?? null;
            $unidadMedida = $item['unidad_medida'] ?? ($tipoItem === 'producto' ? 'unidad' : 'Kg');

            $datos[] = [
                'id_inventario' => $item['id_inventario'] ?? $item['id'] ?? 0,
                'almacen' => $almacenNombre,
                'tipo' => $tipoItem,
                'nombre' => $nombreItem,
                'presentacion' => $presentacion,
                'unidad_medida' => $unidadMedida,
                'cantidad' => $cant,
                'stock_critico' => $esCritico,
                'ultima_actualizacion' => $item['updated_at'] ?? now()->toDateTimeString(),
            ];
        }

        return [
            'tipo' => 'inventario',
            'titulo' => 'Reporte de Inventario',
            'filtros' => [
                'id_almacen' => $idAlmacenFiltro,
                'tipo' => $tipoFiltro ?: 'Todos',
                'stock_critico' => $soloCritico,
            ],
            'resumen' => [
                'cantidad_registros' => count($datos),
                'stock_total' => round($stockTotal, 3),
                'items_stock_critico' => $itemsCriticos,
            ],
            'datos' => $datos,
        ];
    }

    private function resolverRangoFechas(array $filtros): array
    {
        $ahora = Carbon::now('America/La_Paz');

        $fechaDesde = !empty($filtros['fecha_desde'])
            ? Carbon::parse($filtros['fecha_desde'])->startOfDay()
            : $ahora->copy()->startOfMonth();

        $fechaHasta = !empty($filtros['fecha_hasta'])
            ? Carbon::parse($filtros['fecha_hasta'])->endOfDay()
            : $ahora->copy()->endOfDay();

        return [$fechaDesde, $fechaHasta];
    }
}
