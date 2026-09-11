<?php

namespace App\Http\Controllers\Api\Produccion;

use App\Http\Controllers\Controller;
use App\Http\Requests\Produccion\CompletarProduccionRequest;
use App\Http\Requests\Produccion\StoreProduccionRequest;
use App\Models\Almacen;
use App\Models\DetalleEgreso;
use App\Models\DetalleProduccion;
use App\Models\Egreso;
use App\Models\Inventario;
use App\Models\Produccion;
use App\Models\Receta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProduccionController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Listar órdenes de producción
    |--------------------------------------------------------------------------
    */
    public function index(Request $request): JsonResponse
    {
        $query = Produccion::with(['productoPresentacion.producto', 'usuario']);

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha_produccion', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha_produccion', '<=', $request->fecha_hasta);
        }

        $ordenes = $query->orderBy('fecha_produccion', 'desc')->get();

        return response()->json($ordenes, 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Crear orden de producción
    |--------------------------------------------------------------------------
    */
    public function store(StoreProduccionRequest $request): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request) {
                // 1. Buscar receta asociada
                $receta = Receta::with('detalles.materiaPrima')
                    ->where('id_producto_presentacion', $request->id_producto_presentacion)
                    ->first();

                if (!$receta) {
                    return response()->json([
                        'message' => 'La presentación seleccionada no tiene una receta asociada.'
                    ], 422);
                }

                // 2. Buscar almacén de "Materias Primas"
                $almacenMateriasPrimas = Almacen::where('nombre', 'Materias Primas')->first();
                
                if (!$almacenMateriasPrimas) {
                    return response()->json([
                        'message' => 'El almacén de Materias Primas no está configurado.'
                    ], 500);
                }

                // 3. Verificar stock
                $faltantes = [];
                foreach ($receta->detalles as $detalle) {
                    $cantidadRequerida = $detalle->cantidad * $request->cantidad;
                    
                    $inventario = Inventario::where('id_almacen', $almacenMateriasPrimas->id_almacen)
                        ->where('id_materia_prima', $detalle->id_materia_prima)
                        ->first();

                    $disponible = $inventario ? $inventario->cantidad : 0;

                    if ($disponible < $cantidadRequerida) {
                        $faltantes[] = [
                            'materia_prima' => $detalle->materiaPrima->nombre,
                            'requerido' => $cantidadRequerida,
                            'disponible' => $disponible,
                            'faltante' => $cantidadRequerida - $disponible
                        ];
                    }
                }

                // 4. Si hay faltantes, retornar error 422
                if (!empty($faltantes)) {
                    return response()->json([
                        'message' => 'Stock insuficiente para producir la cantidad solicitada.',
                        'faltantes' => $faltantes
                    ], 422);
                }

                // 5. Crear orden de producción
                $produccion = Produccion::create([
                    'id_producto_presentacion' => $request->id_producto_presentacion,
                    'id_usuario' => $request->user()->id_usuario,
                    'fecha_produccion' => now(),
                    'estado' => 'PROGRAMADA',
                    'observaciones' => $request->observaciones
                ]);

                // 6. Crear detalle de producción
                DetalleProduccion::create([
                    'id_produccion' => $produccion->id_produccion,
                    'id_almacen' => $almacenMateriasPrimas->id_almacen,
                    'cantidad_esperada' => $request->cantidad,
                    'cantidad_producida' => null
                ]);

                $produccion->load(['detalles.almacen', 'productoPresentacion.producto']);

                return response()->json([
                    'message' => 'Orden de producción creada con éxito.',
                    'produccion' => $produccion
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear la orden de producción.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Ver detalle de orden de producción
    |--------------------------------------------------------------------------
    */
    public function show(int $id): JsonResponse
    {
        $produccion = Produccion::with([
            'productoPresentacion.producto',
            'usuario',
            'detalles.almacen'
        ])->find($id);

        if (!$produccion) {
            return response()->json([
                'message' => 'Orden de producción no encontrada.'
            ], 404);
        }

        $receta = Receta::with('detalles.materiaPrima')
            ->where('id_producto_presentacion', $produccion->id_producto_presentacion)
            ->first();

        $almacenMateriasPrimas = Almacen::where('nombre', 'Materias Primas')->first();
        
        $insumos = [];
        if ($receta && $almacenMateriasPrimas) {
            $cantidadProduccion = $produccion->detalles->first()->cantidad_esperada;
            foreach ($receta->detalles as $detalle) {
                $inventario = Inventario::where('id_almacen', $almacenMateriasPrimas->id_almacen)
                    ->where('id_materia_prima', $detalle->id_materia_prima)
                    ->first();
                
                $insumos[] = [
                    'materia_prima' => $detalle->materiaPrima->nombre,
                    'requerido_unitario' => $detalle->cantidad,
                    'requerido_total' => $detalle->cantidad * $cantidadProduccion,
                    'stock_actual' => $inventario ? $inventario->cantidad : 0,
                    'unidad_medida' => $detalle->materiaPrima->unidad_medida
                ];
            }
        }

        return response()->json([
            'produccion' => $produccion,
            'receta' => $receta,
            'insumos' => $insumos
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Actualizar estado de orden de producción
    |--------------------------------------------------------------------------
    */
    public function updateEstado(Request $request, int $id): JsonResponse
    {
        // 1. Cargar la orden
        $produccion = Produccion::with(['detalles', 'productoPresentacion'])->find($id);

        if (!$produccion) {
            return response()->json([
                'message' => 'Orden de producción no encontrada.'
            ], 404);
        }

        // 2. Leer el nuevo estado
        $nuevoEstado = $request->input('estado');

        if (!$nuevoEstado) {
            return response()->json([
                'message' => 'El campo estado es obligatorio.'
            ], 422);
        }

        // 3. Validar la transición de estados
        $transicionesPermitidas = [
            'PROGRAMADA' => ['EN_PROCESO', 'CANCELADA'],
            'EN_PROCESO'  => ['COMPLETADA', 'CANCELADA'],
            'COMPLETADA'  => [],
            'CANCELADA'   => [],
        ];

        $estadoActual = $produccion->estado;

        if (!isset($transicionesPermitidas[$estadoActual]) ||
            !in_array($nuevoEstado, $transicionesPermitidas[$estadoActual])) {
            return response()->json([
                'message' => 'Transición de estado no permitida.'
            ], 422);
        }

        // 4a. EN_PROCESO — solo cambio de estado
        if ($nuevoEstado === 'EN_PROCESO') {
            $produccion->estado = 'EN_PROCESO';
            $produccion->save();

            $produccion->load(['detalles.almacen', 'productoPresentacion.producto', 'usuario']);

            return response()->json([
                'message'    => 'Orden pasada a EN PROCESO.',
                'produccion' => $produccion
            ], 200);
        }

        // 4b. CANCELADA — solo cambio de estado
        if ($nuevoEstado === 'CANCELADA') {
            $produccion->estado = 'CANCELADA';
            $produccion->save();

            $produccion->load(['detalles.almacen', 'productoPresentacion.producto', 'usuario']);

            return response()->json([
                'message'    => 'Orden cancelada.',
                'produccion' => $produccion
            ], 200);
        }

        // 4c. COMPLETADA — dentro de transacción
        if ($nuevoEstado === 'COMPLETADA') {
            // Validar campos adicionales
            $completarRequest = CompletarProduccionRequest::createFrom($request);
            $completarRequest->setContainer(app())->setRedirector(app('redirect'));
            $validator = app('validator')->make(
                $request->all(),
                (new CompletarProduccionRequest())->rules(),
                (new CompletarProduccionRequest())->messages()
            );

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Error de validación.',
                    'errors'  => $validator->errors()
                ], 422);
            }

            try {
                return DB::transaction(function () use ($request, $produccion) {
                    // Buscar detalle de producción
                    $detalle = $produccion->detalles->first();

                    if (!$detalle) {
                        return response()->json([
                            'message' => 'La orden no tiene detalle de producción registrado.'
                        ], 422);
                    }

                    // Buscar almacén de Materias Primas
                    $almacenMateriasPrimas = Almacen::where('nombre', 'Materias Primas')->first();

                    if (!$almacenMateriasPrimas) {
                        return response()->json([
                            'message' => 'El almacén de Materias Primas no está configurado.'
                        ], 500);
                    }

                    // Re-cargar receta
                    $receta = Receta::with('detalles.materiaPrima')
                        ->where('id_producto_presentacion', $produccion->id_producto_presentacion)
                        ->first();

                    if (!$receta) {
                        return response()->json([
                            'message' => 'La presentación no tiene receta asociada.'
                        ], 422);
                    }

                    // Re-verificar stock
                    $cantidadProduccion = $detalle->cantidad_esperada;
                    $faltantes = [];

                    foreach ($receta->detalles as $detalleReceta) {
                        $cantidadRequerida = $detalleReceta->cantidad * $cantidadProduccion;

                        $inventario = Inventario::where('id_almacen', $almacenMateriasPrimas->id_almacen)
                            ->where('id_materia_prima', $detalleReceta->id_materia_prima)
                            ->first();

                        $disponible = $inventario ? $inventario->cantidad : 0;

                        if ($disponible < $cantidadRequerida) {
                            $faltantes[] = [
                                'materia_prima' => $detalleReceta->materiaPrima->nombre,
                                'requerido'     => $cantidadRequerida,
                                'disponible'    => $disponible,
                                'faltante'      => $cantidadRequerida - $disponible
                            ];
                        }
                    }

                    if (!empty($faltantes)) {
                        return response()->json([
                            'message'   => 'Stock insuficiente para completar la producción.',
                            'faltantes' => $faltantes
                        ], 422);
                    }

                    // Crear registro de egreso
                    $egreso = Egreso::create([
                        'glosa'        => 'Consumo producción #' . $produccion->id_produccion,
                        'id_usuario'   => $request->user()->id_usuario,
                        'fecha_egreso' => now(),
                    ]);

                    // Crear detalles de egreso y decrementar inventario
                    foreach ($receta->detalles as $detalleReceta) {
                        $cantidadRequerida = $detalleReceta->cantidad * $cantidadProduccion;

                        DetalleEgreso::create([
                            'id_egreso'               => $egreso->id_egreso,
                            'id_almacen'              => $almacenMateriasPrimas->id_almacen,
                            'id_materia_prima'        => $detalleReceta->id_materia_prima,
                            'id_producto_presentacion' => null,
                            'cantidad'                => $cantidadRequerida,
                        ]);

                        $inventario = Inventario::where('id_almacen', $almacenMateriasPrimas->id_almacen)
                            ->where('id_materia_prima', $detalleReceta->id_materia_prima)
                            ->first();

                        $inventario->cantidad -= $cantidadRequerida;

                        if ($inventario->cantidad < 0) {
                            return response()->json([
                                'message' => 'Stock negativo detectado tras el decremento. Operación cancelada.'
                            ], 422);
                        }

                        $inventario->save();
                    }

                    // Actualizar detalle de producción
                    $detalle->cantidad_producida = $request->input('unidades_producidas');
                    $detalle->save();

                    // Actualizar orden
                    $produccion->estado = 'COMPLETADA';
                    if ($request->filled('observaciones')) {
                        $produccion->observaciones = $request->input('observaciones');
                    }
                    $produccion->save();

                    // TODO CU18: Registrar ingreso de producto terminado al almacén "Producción" o "Mostrador"
                    // unidades_producidas = $request->input('unidades_producidas')

                    $produccion->load(['detalles.almacen', 'productoPresentacion.producto', 'usuario']);

                    return response()->json([
                        'message'    => 'Orden completada. Materias primas descontadas del inventario.',
                        'produccion' => $produccion,
                        'id_egreso'  => $egreso->id_egreso,
                    ], 200);
                });
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Error al completar la orden de producción.',
                    'error'   => $e->getMessage()
                ], 500);
            }
        }

        // Estado no reconocido (no debería llegar aquí)
        return response()->json([
            'message' => 'Estado no reconocido.'
        ], 422);
    }
}
