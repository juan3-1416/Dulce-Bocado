<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventario\StoreIngresoRequest;
use App\Models\Ingreso;
use App\Models\DetalleIngreso;
use App\Models\Inventario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IngresoController extends Controller
{
    /**
     * Listar todos los ingresos.
     */
    public function index(Request $request): JsonResponse
    {
        $ingresos = Ingreso::with('usuario:id_usuario,nombre')
            ->orderBy('fecha_ingreso', 'desc')
            ->get();

        return response()->json($ingresos);
    }

    /**
     * Registrar un nuevo ingreso de inventario.
     */
    public function store(StoreIngresoRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            // 1. Crear el ingreso general
            $ingreso = Ingreso::create([
                'fecha_ingreso' => now(),
                'glosa' => $validated['glosa'],
                'id_usuario' => $request->user()->id_usuario,
            ]);

            // 2. Procesar detalles y actualizar inventario
            foreach ($validated['detalles'] as $detalle) {
                // Guardar historial del ingreso
                DetalleIngreso::create([
                    'id_ingreso' => $ingreso->id_ingreso,
                    'id_almacen' => $detalle['id_almacen'],
                    'id_producto_presentacion' => $detalle['id_producto_presentacion'] ?? null,
                    'id_materia_prima' => $detalle['id_materia_prima'] ?? null,
                    'cantidad' => $detalle['cantidad'],
                ]);

                // Actualizar tabla inventario
                $inventarioQuery = Inventario::where('id_almacen', $detalle['id_almacen']);
                
                if (!empty($detalle['id_materia_prima'])) {
                    $inventarioQuery->where('id_materia_prima', $detalle['id_materia_prima'])
                                   ->whereNull('id_producto_presentacion');
                } else {
                    $inventarioQuery->where('id_producto_presentacion', $detalle['id_producto_presentacion'])
                                   ->whereNull('id_materia_prima');
                }

                $inventario = $inventarioQuery->first();

                if ($inventario) {
                    $inventario->cantidad += $detalle['cantidad'];
                    $inventario->ultima_actualizacion = now();
                    $inventario->save();
                } else {
                    Inventario::create([
                        'id_almacen' => $detalle['id_almacen'],
                        'id_producto_presentacion' => $detalle['id_producto_presentacion'] ?? null,
                        'id_materia_prima' => $detalle['id_materia_prima'] ?? null,
                        'cantidad' => $detalle['cantidad'],
                        'ultima_actualizacion' => now(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Ingreso de inventario registrado correctamente.',
                'ingreso' => $ingreso->load('detalles'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al registrar el ingreso.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener el detalle de un ingreso.
     */
    public function show(int $id): JsonResponse
    {
        $ingreso = Ingreso::with([
            'usuario:id_usuario,nombre',
            'detalles.almacen',
            'detalles.productoPresentacion.producto',
            'detalles.materiaPrima'
        ])->findOrFail($id);

        return response()->json($ingreso);
    }
}
