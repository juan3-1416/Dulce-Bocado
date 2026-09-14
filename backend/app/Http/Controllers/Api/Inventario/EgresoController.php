<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventario\StoreEgresoRequest;
use App\Models\Almacen;
use App\Models\DetalleEgreso;
use App\Models\Egreso;
use App\Models\Inventario;
use App\Models\MateriaPrima;
use App\Models\ProductoPresentacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EgresoController extends Controller
{
    /**
     * Listar todos los egresos de inventario.
     */
    public function index(Request $request): JsonResponse
    {
        $egresos = Egreso::with([
            'usuario:id_usuario,nombre',
            'detalles'
        ])
        ->orderBy('fecha_egreso', 'desc')
        ->orderBy('id_egreso', 'desc')
        ->get();

        return response()->json($egresos);
    }

    /**
     * Registrar un nuevo egreso de inventario.
     */
    public function store(StoreEgresoRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            // 1. Validar disponibilidad de stock suficiente para todos los detalles antes de modificar
            foreach ($validated['detalles'] as $index => $detalle) {
                $inventarioQuery = Inventario::where('id_almacen', $detalle['id_almacen']);

                if (!empty($detalle['id_materia_prima'])) {
                    $inventarioQuery->where('id_materia_prima', $detalle['id_materia_prima'])
                        ->whereNull('id_producto_presentacion');
                } else {
                    $inventarioQuery->where('id_producto_presentacion', $detalle['id_producto_presentacion'])
                        ->whereNull('id_materia_prima');
                }

                $inventario = $inventarioQuery->lockForUpdate()->first();
                $stockDisponible = $inventario ? (float) $inventario->cantidad : 0.0;
                $cantidadSolicitada = (float) $detalle['cantidad'];

                if ($stockDisponible < $cantidadSolicitada) {
                    $almacen = Almacen::find($detalle['id_almacen']);
                    $nombreAlmacen = $almacen ? $almacen->nombre : "Almacén #{$detalle['id_almacen']}";

                    if (!empty($detalle['id_materia_prima'])) {
                        $mp = MateriaPrima::find($detalle['id_materia_prima']);
                        $nombreItem = $mp ? $mp->nombre : "Materia Prima #{$detalle['id_materia_prima']}";
                    } else {
                        $pp = ProductoPresentacion::with(['producto', 'presentacion'])->find($detalle['id_producto_presentacion']);
                        $nombreItem = $pp ? ($pp->producto->nombre . ' - ' . $pp->presentacion->nombre) : "Producto #{$detalle['id_producto_presentacion']}";
                    }

                    DB::rollBack();

                    return response()->json([
                        'message' => 'Stock insuficiente para registrar el egreso.',
                        'errors' => [
                            "detalles.{$index}" => [
                                "Stock insuficiente de '{$nombreItem}' en el almacén '{$nombreAlmacen}'. Disponible: {$stockDisponible}, Solicitado: {$cantidadSolicitada}."
                            ]
                        ]
                    ], 422);
                }
            }

            // 2. Crear cabecera del egreso
            $egreso = Egreso::create([
                'fecha_egreso' => now(),
                'glosa' => trim($validated['glosa']),
                'id_usuario' => $request->user()->id_usuario,
            ]);

            // 3. Registrar detalles y descontar inventario
            foreach ($validated['detalles'] as $detalle) {
                DetalleEgreso::create([
                    'id_egreso' => $egreso->id_egreso,
                    'id_almacen' => $detalle['id_almacen'],
                    'id_producto_presentacion' => $detalle['id_producto_presentacion'] ?? null,
                    'id_materia_prima' => $detalle['id_materia_prima'] ?? null,
                    'cantidad' => $detalle['cantidad'],
                ]);

                $inventarioQuery = Inventario::where('id_almacen', $detalle['id_almacen']);
                if (!empty($detalle['id_materia_prima'])) {
                    $inventarioQuery->where('id_materia_prima', $detalle['id_materia_prima'])
                        ->whereNull('id_producto_presentacion');
                } else {
                    $inventarioQuery->where('id_producto_presentacion', $detalle['id_producto_presentacion'])
                        ->whereNull('id_materia_prima');
                }

                $inventario = $inventarioQuery->first();
                $inventario->cantidad = round((float) $inventario->cantidad - (float) $detalle['cantidad'], 3);
                $inventario->ultima_actualizacion = now();
                $inventario->save();
            }

            DB::commit();

            return response()->json([
                'message' => 'Egreso de inventario registrado correctamente.',
                'egreso' => $egreso->load([
                    'usuario:id_usuario,nombre',
                    'detalles.almacen',
                    'detalles.productoPresentacion.producto',
                    'detalles.productoPresentacion.presentacion',
                    'detalles.materiaPrima',
                ]),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error interno al registrar el egreso.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener el detalle de un egreso específico.
     */
    public function show(int $id): JsonResponse
    {
        $egreso = Egreso::with([
            'usuario:id_usuario,nombre',
            'detalles.almacen',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
            'detalles.materiaPrima'
        ])->find($id);

        if (!$egreso) {
            return response()->json([
                'message' => 'Egreso de inventario no encontrado.',
            ], 404);
        }

        return response()->json($egreso);
    }
}
