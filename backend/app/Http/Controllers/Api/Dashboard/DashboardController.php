<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Inventario;
use App\Models\Almacen;
use App\Models\Pedido;
use App\Models\Produccion;
use App\Models\Venta;
use App\Models\Visita;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Devuelve el resumen general de métricas, KPIs, gráficos y accesos rápidos del dashboard.
     */
    public function index(Request $request): JsonResponse
    {
        // 1. Determinar rango de fechas según período seleccionado
        $periodo = $request->query('periodo', 'mes'); // hoy, 7d, mes, anio, personalizado
        $ahora = Carbon::now();

        if ($periodo === 'hoy') {
            $fechaInicio = $ahora->copy()->startOfDay();
            $fechaFin = $ahora->copy()->endOfDay();
        } elseif ($periodo === '7d') {
            $fechaInicio = $ahora->copy()->subDays(6)->startOfDay();
            $fechaFin = $ahora->copy()->endOfDay();
        } elseif ($periodo === 'anio') {
            $fechaInicio = $ahora->copy()->startOfYear();
            $fechaFin = $ahora->copy()->endOfYear();
        } elseif ($periodo === 'personalizado' && $request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
            $fechaInicio = Carbon::parse($request->query('fecha_inicio'))->startOfDay();
            $fechaFin = Carbon::parse($request->query('fecha_fin'))->endOfDay();
        } else {
            // Por defecto: este mes
            $periodo = 'mes';
            $fechaInicio = $ahora->copy()->startOfMonth();
            $fechaFin = $ahora->copy()->endOfMonth();
        }

        // 2. KPIs Globales
        // Ventas del período (excluyendo anuladas)
        $ventasPeriodo = Venta::where('estado', '!=', 'ANULADA')
            ->whereBetween('fecha_venta', [$fechaInicio, $fechaFin]);

        $ventasTotal = (float) $ventasPeriodo->sum('total');
        $ventasCantidad = $ventasPeriodo->count();

        // Ventas de hoy
        $ventasHoyTotal = (float) Venta::where('estado', '!=', 'ANULADA')
            ->whereBetween('fecha_venta', [$ahora->copy()->startOfDay(), $ahora->copy()->endOfDay()])
            ->sum('total');

        // Pedidos activos (no entregados ni cancelados)
        $pedidosActivos = Pedido::whereNotIn('estado', ['ENTREGADO', 'CANCELADO'])->count();
        $pedidosListosEntrega = Pedido::where('estado', 'EN_PROCESO')->count(); // En proceso / listos
        $pedidosProgramados = Pedido::where('estado', 'PROGRAMADO')->count();

        // Producción activa
        $produccionActiva = Produccion::whereIn('estado', ['PROGRAMADA', 'EN_PROCESO'])->count();
        $produccionFinalizadaPeriodo = Produccion::where('estado', 'COMPLETADA')
            ->whereBetween('fecha_produccion', [$fechaInicio, $fechaFin])
            ->count();

        // Alertas de Stock Bajo (cantidad <= 5 unidades o umbral crítico)
        $alertasStockCritico = Inventario::where('cantidad', '<=', 5)->count();

        // Clientes registrados activos (campo estado en tabla cliente)
        $totalClientes = Cliente::where('estado', true)->count();

        // Total de visitas acumuladas a la plataforma
        $totalVisitas = (int) Visita::sum('cantidad');

        // 3. Gráficos Interactivos

        // A) Tendencia de Ventas (por hora si es hoy, por día si es semana/mes, o por mes si es año)
        $tendenciaVentas = $this->calcularTendenciaVentas($fechaInicio, $fechaFin, $periodo);

        // B) Top 5 Productos / Presentaciones Más Vendidos en el período
        $topProductos = DetalleVenta::select(
                'producto_presentacion.id_producto_presentacion',
                'producto.nombre as producto_nombre',
                'presentacion.nombre as presentacion_nombre',
                DB::raw('SUM(detalle_venta.cantidad) as total_unidades'),
                DB::raw('SUM(detalle_venta.subtotal) as total_monto')
            )
            ->join('venta', 'detalle_venta.id_venta', '=', 'venta.id_venta')
            ->join('producto_presentacion', 'detalle_venta.id_producto_presentacion', '=', 'producto_presentacion.id_producto_presentacion')
            ->join('producto', 'producto_presentacion.id_producto', '=', 'producto.id_producto')
            ->join('presentacion', 'producto_presentacion.id_presentacion', '=', 'presentacion.id_presentacion')
            ->where('venta.estado', '!=', 'ANULADA')
            ->whereBetween('venta.fecha_venta', [$fechaInicio, $fechaFin])
            ->groupBy(
                'producto_presentacion.id_producto_presentacion',
                'producto.nombre',
                'presentacion.nombre'
            )
            ->orderByDesc('total_unidades')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'id_producto_presentacion' => $item->id_producto_presentacion,
                    'nombre' => $item->producto_nombre . ' (' . $item->presentacion_nombre . ')',
                    'producto' => $item->producto_nombre,
                    'presentacion' => $item->presentacion_nombre,
                    'unidades' => (int) $item->total_unidades,
                    'monto' => (float) $item->total_monto,
                ];
            });

        // C) Distribución de Estados de Pedidos en el período
        $estadosPedidos = Pedido::select('estado', DB::raw('COUNT(*) as total'), DB::raw('SUM(total) as monto_total'))
            ->whereBetween('fecha_pedido', [$fechaInicio, $fechaFin])
            ->groupBy('estado')
            ->get()
            ->map(function ($item) {
                return [
                    'estado' => $item->estado,
                    'cantidad' => (int) $item->total,
                    'monto' => (float) $item->monto_total,
                ];
            });

        // D) Resumen de Almacenes y Existencias
        $almacenes = Almacen::all()->map(function ($almacen) {
            $totalItems = Inventario::where('id_almacen', $almacen->id_almacen)->count();
            $stockCritico = Inventario::where('id_almacen', $almacen->id_almacen)
                ->where('cantidad', '<=', 5)
                ->count();
            $stockTotal = (float) Inventario::where('id_almacen', $almacen->id_almacen)->sum('cantidad');

            return [
                'id_almacen' => $almacen->id_almacen,
                'nombre' => $almacen->nombre,
                'total_items' => $totalItems,
                'stock_critico' => $stockCritico,
                'stock_total' => $stockTotal,
            ];
        });

        // 4. Tablas y Monitoreo Rápido

        // A) Últimas 5 Ventas
        $ultimasVentas = Venta::with(['cliente', 'usuario'])
            ->orderByDesc('fecha_venta')
            ->limit(5)
            ->get()
            ->map(function ($venta) {
                return [
                    'id_venta' => $venta->id_venta,
                    'cliente' => $venta->cliente ? $venta->cliente->nombre_completo : ($venta->nombre_cliente_ocasional ?: 'Cliente Ocasional'),
                    'fecha_venta' => $venta->fecha_venta ? $venta->fecha_venta->format('d/m/Y H:i') : null,
                    'total' => (float) $venta->total,
                    'estado' => $venta->estado,
                    'vendedor' => $venta->usuario ? $venta->usuario->nombre : 'N/A',
                ];
            });

        // B) Próximos Pedidos a Entregar
        $proximosPedidos = Pedido::with(['cliente'])
            ->whereNotIn('estado', ['ENTREGADO', 'CANCELADO'])
            ->orderBy('fecha_entrega', 'asc')
            ->orderBy('hora_entrega', 'asc')
            ->limit(5)
            ->get()
            ->map(function ($pedido) {
                return [
                    'id_pedido' => $pedido->id_pedido,
                    'cliente' => $pedido->cliente ? $pedido->cliente->nombre_completo : ($pedido->nombre_cliente_ocasional ?: 'Cliente Ocasional'),
                    'fecha_entrega' => $pedido->fecha_entrega ? $pedido->fecha_entrega->format('d/m/Y') : 'N/A',
                    'hora_entrega' => $pedido->hora_entrega ?: 'Sin hora',
                    'total' => (float) $pedido->total,
                    'saldo' => (float) $pedido->saldo,
                    'estado' => $pedido->estado,
                ];
            });

        // C) Insumos y Productos con Stock Bajo / Crítico (hasta 6 items)
        $itemsStockBajo = Inventario::with([
                'almacen',
                'productoPresentacion.producto',
                'productoPresentacion.presentacion',
                'materiaPrima'
            ])
            ->where('cantidad', '<=', 5)
            ->orderBy('cantidad', 'asc')
            ->limit(6)
            ->get()
            ->map(function ($item) {
                $nombre = 'Item Desconocido';
                $detalle = '';

                if ($item->productoPresentacion) {
                    $prod = $item->productoPresentacion->producto->nombre ?? 'Producto';
                    $pres = $item->productoPresentacion->presentacion->nombre ?? 'Presentación';
                    $nombre = $prod;
                    $detalle = $pres;
                } elseif ($item->materiaPrima) {
                    $nombre = $item->materiaPrima->nombre;
                    $detalle = $item->materiaPrima->unidad_medida ?? 'Unidades';
                }

                return [
                    'id_inventario' => $item->id_inventario,
                    'almacen' => $item->almacen->nombre ?? 'Almacén',
                    'nombre' => $nombre,
                    'detalle' => $detalle,
                    'cantidad' => (float) $item->cantidad,
                ];
            });

        return response()->json([
            'periodo' => [
                'clave' => $periodo,
                'fecha_inicio' => $fechaInicio->format('Y-m-d'),
                'fecha_fin' => $fechaFin->format('Y-m-d'),
                'descripcion' => $this->obtenerDescripcionPeriodo($periodo, $fechaInicio, $fechaFin),
            ],
            'kpis' => [
                'ventas_total' => $ventasTotal,
                'ventas_cantidad' => $ventasCantidad,
                'ventas_hoy' => $ventasHoyTotal,
                'pedidos_activos' => $pedidosActivos,
                'pedidos_en_proceso' => $pedidosListosEntrega,
                'pedidos_programados' => $pedidosProgramados,
                'produccion_activa' => $produccionActiva,
                'produccion_finalizada' => $produccionFinalizadaPeriodo,
                'alertas_stock' => $alertasStockCritico,
                'total_clientes' => $totalClientes,
                'total_visitas' => $totalVisitas,
            ],
            'graficos' => [
                'tendencia_ventas' => $tendenciaVentas,
                'top_productos' => $topProductos,
                'estados_pedidos' => $estadosPedidos,
                'almacenes' => $almacenes,
            ],
            'tablas' => [
                'ultimas_ventas' => $ultimasVentas,
                'proximos_pedidos' => $proximosPedidos,
                'stock_bajo' => $itemsStockBajo,
            ],
        ]);
    }

    /**
     * Calcula la serie temporal de ventas según el rango y período.
     */
    private function calcularTendenciaVentas(Carbon $fechaInicio, Carbon $fechaFin, string $periodo): array
    {
        $dias = [];

        if ($periodo === 'hoy') {
            // Agrupación horaria (cada 2 horas durante el horario comercial/día)
            for ($h = 6; $h <= 22; $h += 2) {
                $inicioHora = $fechaInicio->copy()->setHour($h)->setMinute(0)->setSecond(0);
                $finHora = $inicioHora->copy()->addHours(2)->subSecond();

                $total = (float) Venta::where('estado', '!=', 'ANULADA')
                    ->whereBetween('fecha_venta', [$inicioHora, $finHora])
                    ->sum('total');

                $cantidad = Venta::where('estado', '!=', 'ANULADA')
                    ->whereBetween('fecha_venta', [$inicioHora, $finHora])
                    ->count();

                $dias[] = [
                    'clave' => $inicioHora->format('H:i'),
                    'etiqueta' => $inicioHora->format('H:i'),
                    'total' => $total,
                    'cantidad' => $cantidad,
                ];
            }
        } elseif ($periodo === 'anio') {
            // Agrupación mensual
            $nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            for ($m = 1; $m <= 12; $m++) {
                $inicioMes = Carbon::create($fechaInicio->year, $m, 1, 0, 0, 0);
                $finMes = $inicioMes->copy()->endOfMonth();

                $total = (float) Venta::where('estado', '!=', 'ANULADA')
                    ->whereBetween('fecha_venta', [$inicioMes, $finMes])
                    ->sum('total');

                $cantidad = Venta::where('estado', '!=', 'ANULADA')
                    ->whereBetween('fecha_venta', [$inicioMes, $finMes])
                    ->count();

                $dias[] = [
                    'clave' => $inicioMes->format('Y-m'),
                    'etiqueta' => $nombresMeses[$m - 1],
                    'total' => $total,
                    'cantidad' => $cantidad,
                ];
            }
        } else {
            // Agrupación diaria
            $diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            $cursor = $fechaInicio->copy();

            while ($cursor->lte($fechaFin)) {
                $inicioDia = $cursor->copy()->startOfDay();
                $finDia = $cursor->copy()->endOfDay();

                $total = (float) Venta::where('estado', '!=', 'ANULADA')
                    ->whereBetween('fecha_venta', [$inicioDia, $finDia])
                    ->sum('total');

                $cantidad = Venta::where('estado', '!=', 'ANULADA')
                    ->whereBetween('fecha_venta', [$inicioDia, $finDia])
                    ->count();

                $nombreDia = $diasSemana[$cursor->dayOfWeek];
                $etiqueta = $nombreDia . ' ' . $cursor->format('d/m');

                $dias[] = [
                    'clave' => $cursor->format('Y-m-d'),
                    'etiqueta' => $etiqueta,
                    'total' => $total,
                    'cantidad' => $cantidad,
                ];

                $cursor->addDay();
            }
        }

        return $dias;
    }

    /**
     * Devuelve una descripción legible del período.
     */
    private function obtenerDescripcionPeriodo(string $periodo, Carbon $fechaInicio, Carbon $fechaFin): string
    {
        switch ($periodo) {
            case 'hoy':
                return 'Hoy (' . $fechaInicio->format('d/m/Y') . ')';
            case '7d':
                return 'Últimos 7 días (' . $fechaInicio->format('d/m') . ' - ' . $fechaFin->format('d/m/Y') . ')';
            case 'anio':
                return 'Año ' . $fechaInicio->format('Y');
            case 'mes':
            default:
                $meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                return $meses[$fechaInicio->month - 1] . ' ' . $fechaInicio->format('Y');
        }
    }
}
