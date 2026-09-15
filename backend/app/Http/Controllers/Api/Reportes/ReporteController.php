<?php

namespace App\Http\Controllers\Api\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Inventario;
use App\Models\Pedido;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ReporteController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Reporte de Ventas
    |--------------------------------------------------------------------------
    */
    public function ventas(Request $request): JsonResponse
    {
        $request->validate([
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date', 'after_or_equal:fecha_desde'],
            'estado' => ['nullable', 'string', 'max:50'],
            'id_cliente' => ['nullable', 'integer', 'exists:cliente,id_cliente'],
            'id_usuario' => ['nullable', 'integer', 'exists:usuarios,id_usuario'],
        ]);

        [$fechaDesde, $fechaHasta] = $this->resolverRangoFechas($request);

        $query = Venta::with([
            'cliente',
            'usuario',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ])
            ->whereBetween('fecha_venta', [$fechaDesde, $fechaHasta]);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('id_cliente')) {
            $query->where('id_cliente', $request->integer('id_cliente'));
        }

        if ($request->filled('id_usuario')) {
            $query->where('id_usuario', $request->integer('id_usuario'));
        }

        $ventas = $query
            ->orderByDesc('fecha_venta')
            ->get();

        $resultado = $ventas->map(function (Venta $venta) {
            return [
                'id_venta' => $venta->id_venta,
                'fecha_venta' => $venta->fecha_venta?->format('Y-m-d H:i:s'),
                'cliente' => $venta->cliente
                    ? $venta->cliente->nombre_completo
                    : ($venta->nombre_cliente_ocasional ?: 'Cliente ocasional'),
                'vendedor' => $venta->usuario?->nombre ?? 'Sin usuario',
                'estado' => $venta->estado,
                'total' => (float) $venta->total,
                'observaciones' => $venta->observaciones,
                'detalles' => $venta->detalles->map(function ($detalle) {
                    $producto = $detalle->productoPresentacion?->producto?->nombre
                        ?? 'Producto';

                    $presentacion = $detalle->productoPresentacion?->presentacion?->nombre
                        ?? 'Presentación';

                    return [
                        'producto' => $producto,
                        'presentacion' => $presentacion,
                        'cantidad' => (int) $detalle->cantidad,
                        'precio_unitario' => (float) $detalle->precio_unitario,
                        'costo_personalizacion' => (float) $detalle->costo_personalizacion,
                        'subtotal' => (float) $detalle->subtotal,
                    ];
                })->values(),
            ];
        });

        $ventasValidas = $ventas->where('estado', '!=', 'ANULADA');

        return response()->json([
            'tipo' => 'ventas',
            'titulo' => 'Reporte de Ventas',
            'filtros' => [
                'fecha_desde' => $fechaDesde->format('Y-m-d'),
                'fecha_hasta' => $fechaHasta->format('Y-m-d'),
                'estado' => $request->input('estado'),
                'id_cliente' => $request->input('id_cliente'),
                'id_usuario' => $request->input('id_usuario'),
            ],
            'resumen' => [
                'cantidad_registros' => $ventas->count(),
                'ventas_validas' => $ventasValidas->count(),
                'ventas_anuladas' => $ventas->where('estado', 'ANULADA')->count(),
                'total_ventas' => round(
                    (float) $ventasValidas->sum(fn ($venta) => (float) $venta->total),
                    2
                ),
            ],
            'datos' => $resultado,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Reporte de Pedidos
    |--------------------------------------------------------------------------
    */
    public function pedidos(Request $request): JsonResponse
    {
        $request->validate([
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date', 'after_or_equal:fecha_desde'],
            'estado' => ['nullable', 'string', 'max:50'],
            'id_cliente' => ['nullable', 'integer', 'exists:cliente,id_cliente'],
            'id_usuario' => ['nullable', 'integer', 'exists:usuarios,id_usuario'],
            'entrega_desde' => ['nullable', 'date'],
            'entrega_hasta' => ['nullable', 'date', 'after_or_equal:entrega_desde'],
        ]);

        [$fechaDesde, $fechaHasta] = $this->resolverRangoFechas($request);

        $query = Pedido::with([
            'cliente',
            'usuario',
            'pagos',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ])
            ->whereBetween('fecha_pedido', [$fechaDesde, $fechaHasta]);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('id_cliente')) {
            $query->where('id_cliente', $request->integer('id_cliente'));
        }

        if ($request->filled('id_usuario')) {
            $query->where('id_usuario', $request->integer('id_usuario'));
        }

        if ($request->filled('entrega_desde')) {
            $query->whereDate('fecha_entrega', '>=', $request->input('entrega_desde'));
        }

        if ($request->filled('entrega_hasta')) {
            $query->whereDate('fecha_entrega', '<=', $request->input('entrega_hasta'));
        }

        $pedidos = $query
            ->orderByDesc('fecha_pedido')
            ->get();

        $resultado = $pedidos->map(function (Pedido $pedido) {
            return [
                'id_pedido' => $pedido->id_pedido,
                'fecha_pedido' => $pedido->fecha_pedido?->format('Y-m-d H:i:s'),
                'fecha_entrega' => $pedido->fecha_entrega?->format('Y-m-d'),
                'hora_entrega' => $pedido->hora_entrega,
                'cliente' => $pedido->cliente
                    ? $pedido->cliente->nombre_completo
                    : ($pedido->nombre_cliente_ocasional ?: 'Cliente ocasional'),
                'responsable' => $pedido->usuario?->nombre ?? 'Sin usuario',
                'estado' => $pedido->estado,
                'total' => (float) $pedido->total,
                'total_pagado' => (float) $pedido->total_pagado,
                'saldo' => (float) $pedido->saldo,
                'pagado_completo' => (bool) $pedido->pagado_completo,
                'observaciones' => $pedido->observaciones,
                'detalles' => $pedido->detalles->map(function ($detalle) {
                    $producto = $detalle->productoPresentacion?->producto?->nombre
                        ?? 'Producto';

                    $presentacion = $detalle->productoPresentacion?->presentacion?->nombre
                        ?? 'Presentación';

                    return [
                        'producto' => $producto,
                        'presentacion' => $presentacion,
                        'cantidad' => (int) $detalle->cantidad,
                        'precio_congelado' => (float) $detalle->precio_congelado,
                        'costo_personalizacion' => (float) $detalle->costo_personalizacion,
                        'subtotal' => (float) $detalle->subtotal,
                    ];
                })->values(),
            ];
        });

        return response()->json([
            'tipo' => 'pedidos',
            'titulo' => 'Reporte de Pedidos',
            'filtros' => [
                'fecha_desde' => $fechaDesde->format('Y-m-d'),
                'fecha_hasta' => $fechaHasta->format('Y-m-d'),
                'estado' => $request->input('estado'),
                'id_cliente' => $request->input('id_cliente'),
                'id_usuario' => $request->input('id_usuario'),
                'entrega_desde' => $request->input('entrega_desde'),
                'entrega_hasta' => $request->input('entrega_hasta'),
            ],
            'resumen' => [
                'cantidad_registros' => $pedidos->count(),
                'total_pedidos' => round(
                    (float) $pedidos->sum(fn ($pedido) => (float) $pedido->total),
                    2
                ),
                'total_pagado' => round(
                    (float) $pedidos->sum(fn ($pedido) => (float) $pedido->total_pagado),
                    2
                ),
                'saldo_pendiente' => round(
                    (float) $pedidos->sum(fn ($pedido) => (float) $pedido->saldo),
                    2
                ),
            ],
            'datos' => $resultado,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Reporte de Inventario
    |--------------------------------------------------------------------------
    */
    public function inventario(Request $request): JsonResponse
    {
        $request->validate([
            'id_almacen' => ['nullable', 'integer', 'exists:almacen,id_almacen'],
            'tipo' => ['nullable', 'in:materia_prima,producto'],
            'stock_critico' => ['nullable', 'boolean'],
        ]);

        $query = Inventario::with([
            'almacen',
            'materiaPrima',
            'productoPresentacion.producto',
            'productoPresentacion.presentacion',
        ]);

        if ($request->filled('id_almacen')) {
            $query->where('id_almacen', $request->integer('id_almacen'));
        }

        if ($request->input('tipo') === 'materia_prima') {
            $query->whereNotNull('id_materia_prima');
        }

        if ($request->input('tipo') === 'producto') {
            $query->whereNotNull('id_producto_presentacion');
        }

        if ($request->boolean('stock_critico')) {
            $query->where('cantidad', '<=', 5);
        }

        $inventario = $query
            ->orderBy('id_almacen')
            ->orderBy('id_inventario')
            ->get();

        $resultado = $inventario->map(function (Inventario $item) {
            if ($item->materiaPrima) {
                $tipo = 'materia_prima';
                $nombre = $item->materiaPrima->nombre;
                $presentacion = null;
                $unidad = $item->materiaPrima->unidad_medida ?? 'Unidad';
            } else {
                $tipo = 'producto';
                $nombre = $item->productoPresentacion?->producto?->nombre ?? 'Producto';
                $presentacion = $item->productoPresentacion?->presentacion?->nombre;
                $unidad = 'unidad';
            }

            return [
                'id_inventario' => $item->id_inventario,
                'almacen' => $item->almacen?->nombre ?? 'Sin almacén',
                'tipo' => $tipo,
                'nombre' => $nombre,
                'presentacion' => $presentacion,
                'unidad_medida' => $unidad,
                'cantidad' => (float) $item->cantidad,
                'stock_critico' => (float) $item->cantidad <= 5,
                'ultima_actualizacion' => $item->ultima_actualizacion,
            ];
        });

        return response()->json([
            'tipo' => 'inventario',
            'titulo' => 'Reporte de Inventario',
            'filtros' => [
                'id_almacen' => $request->input('id_almacen'),
                'tipo' => $request->input('tipo'),
                'stock_critico' => $request->boolean('stock_critico'),
            ],
            'resumen' => [
                'cantidad_registros' => $inventario->count(),
                'stock_total' => round(
                    (float) $inventario->sum(fn ($item) => (float) $item->cantidad),
                    3
                ),
                'items_stock_critico' => $inventario
                    ->filter(fn ($item) => (float) $item->cantidad <= 5)
                    ->count(),
            ],
            'datos' => $resultado,
        ]);
    }
/*
|--------------------------------------------------------------------------
| Generar PDF
|--------------------------------------------------------------------------
*/
public function pdf(Request $request, string $tipo)
{
    $reporte = $this->obtenerDatosReporte($tipo, $request);

    $pdf = Pdf::loadView('reportes.reporte-pdf', [
        'reporte' => $reporte,
    ])->setPaper('a4', 'landscape');

    $nombreArchivo = 'reporte_' .
        $tipo . '_' .
        now()->format('Ymd_His') .
        '.pdf';

    return $pdf->download($nombreArchivo);
}

/*
|--------------------------------------------------------------------------
| Obtener datos reutilizando los reportes existentes
|--------------------------------------------------------------------------
*/
private function obtenerDatosReporte(string $tipo, Request $request): array
{
    $respuesta = match ($tipo) {
        'ventas' => $this->ventas($request),
        'pedidos' => $this->pedidos($request),
        'inventario' => $this->inventario($request),
        default => abort(404, 'Tipo de reporte no válido.'),
    };

    return $respuesta->getData(true);
}
    /*
    |--------------------------------------------------------------------------
    | Rango de fechas común
    |--------------------------------------------------------------------------
    */
    private function resolverRangoFechas(Request $request): array
    {
        $ahora = Carbon::now();

        $fechaDesde = $request->filled('fecha_desde')
            ? Carbon::parse($request->input('fecha_desde'))->startOfDay()
            : $ahora->copy()->startOfMonth();

        $fechaHasta = $request->filled('fecha_hasta')
            ? Carbon::parse($request->input('fecha_hasta'))->endOfDay()
            : $ahora->copy()->endOfDay();

        return [$fechaDesde, $fechaHasta];
    }
    /*
|--------------------------------------------------------------------------
| Enviar reporte por correo
|--------------------------------------------------------------------------
*/
public function enviar(Request $request, string $tipo): JsonResponse
{
    $request->validate([
        'correos' => ['required', 'array', 'min:1'],
        'correos.*' => ['required', 'email'],
    ]);

    if (!in_array($tipo, ['ventas', 'pedidos', 'inventario'], true)) {
        return response()->json([
            'message' => 'Tipo de reporte no válido.',
        ], 404);
    }

    /*
     * Generar los mismos datos utilizados por la consulta
     * y por la descarga PDF.
     */
    $reporte = $this->obtenerDatosReporte($tipo, $request);

    $pdf = Pdf::loadView('reportes.reporte-pdf', [
        'reporte' => $reporte,
    ])->setPaper('a4', 'landscape');

    $contenidoPdf = $pdf->output();

    $nombreArchivo = 'reporte_' .
        $tipo . '_' .
        now()->format('Ymd_His') .
        '.pdf';

    /*
     * La copia se guarda ANTES de intentar enviar el correo.
     * De esta forma el reporte no se pierde si SMTP falla.
     */
    $rutaRelativa = 'reportes/' . $nombreArchivo;

    Storage::disk('local')->put(
        $rutaRelativa,
        $contenidoPdf
    );

    $correos = array_values(
        array_unique($request->input('correos'))
    );

    try {
        Mail::send(
            'emails.reporte',
            [
                'titulo' => $reporte['titulo'],
                'tipo' => $tipo,
                'reporte' => $reporte,
            ],
            function ($message) use (
                $correos,
                $contenidoPdf,
                $nombreArchivo,
                $reporte
            ) {
                $message
                    ->to($correos)
                    ->subject(
                        'Dulce Bocado - ' . $reporte['titulo']
                    )
                    ->attachData(
                        $contenidoPdf,
                        $nombreArchivo,
                        [
                            'mime' => 'application/pdf',
                        ]
                    );
            }
        );

        return response()->json([
            'message' => 'Reporte generado y enviado correctamente.',
            'envio' => true,
            'tipo' => $tipo,
            'correos' => $correos,
            'archivo' => $nombreArchivo,
            'ruta_guardada' => $rutaRelativa,
        ]);
    } catch (Throwable $exception) {
        report($exception);

        return response()->json([
            'message' => 'El reporte fue generado y guardado, pero no pudo enviarse por correo.',
            'envio' => false,
            'tipo' => $tipo,
            'correos' => $correos,
            'archivo' => $nombreArchivo,
            'ruta_guardada' => $rutaRelativa,
        ], 503);
    }
}
}