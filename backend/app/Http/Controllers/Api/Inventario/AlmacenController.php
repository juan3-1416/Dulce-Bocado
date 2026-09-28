<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\DetalleEgreso;
use App\Models\DetalleIngreso;
use App\Models\Egreso;
use App\Models\Ingreso;
use App\Models\Inventario;
use App\Models\ProductoPresentacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AlmacenController extends Controller
{
    /**
     * Listar todos los almacenes.
     */
    public function index(): JsonResponse
    {
        $almacenes = Almacen::orderBy('id_almacen')->get();

        return response()->json($almacenes, 200);
    }

    /**
     * Crear un nuevo almacén.
     */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                'unique:almacen,nombre',
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:500',
            ],
        ], [
            'nombre.required' => 'El nombre del almacén es obligatorio.',
            'nombre.unique' => 'Ya existe un almacén con ese nombre.',
            'nombre.max' => 'El nombre no puede superar los 100 caracteres.',
            'descripcion.max' => 'La descripción no puede superar los 500 caracteres.',
        ]);

        $almacen = Almacen::create([
            'nombre' => trim($datos['nombre']),
            'descripcion' => !empty($datos['descripcion'])
                ? trim($datos['descripcion'])
                : null,
        ]);

        return response()->json([
            'message' => 'Almacén creado correctamente.',
            'almacen' => $almacen,
        ], 201);
    }

    /**
     * Obtener el detalle de un almacén.
     */
    public function show(int $id): JsonResponse
    {
        $almacen = Almacen::find($id);

        if (!$almacen) {
            return response()->json([
                'message' => 'Almacén no encontrado.',
            ], 404);
        }

        return response()->json($almacen, 200);
    }

    /**
     * Listar las existencias de un almacén específico.
     */
    public function existencias(int $id): JsonResponse
    {
        $almacen = Almacen::find($id);

        if (!$almacen) {
            return response()->json([
                'message' => 'Almacén no encontrado.',
            ], 404);
        }

        $existencias = Inventario::with([
            'productoPresentacion.producto',
            'productoPresentacion.presentacion',
            'materiaPrima',
        ])
            ->where('id_almacen', $id)
            ->get();

        return response()->json($existencias, 200);
    }

    /**
     * Enviar un producto terminado desde Producción hacia Mostrador.
     */
    public function enviarAMostrador(
        Request $request,
        int $id
    ): JsonResponse {
        $datos = $request->validate([
            'id_producto_presentacion' => [
                'required',
                'integer',
                'exists:producto_presentacion,id_producto_presentacion',
            ],
            'cantidad' => [
                'required',
                'integer',
                'min:1',
            ],
        ], [
            'id_producto_presentacion.required' =>
                'Debe seleccionar un producto.',
            'id_producto_presentacion.exists' =>
                'El producto seleccionado no existe.',
            'cantidad.required' =>
                'La cantidad es obligatoria.',
            'cantidad.integer' =>
                'La cantidad debe ser un número entero.',
            'cantidad.min' =>
                'La cantidad debe ser mayor a cero.',
        ]);

        try {
            return DB::transaction(function () use (
                $request,
                $datos,
                $id
            ) {
                /*
                 * 1. Validar almacén de origen.
                 */
                $almacenOrigen = Almacen::find($id);

                if (!$almacenOrigen) {
                    return response()->json([
                        'message' => 'Almacén de origen no encontrado.',
                    ], 404);
                }

                if (
                    mb_strtolower(trim($almacenOrigen->nombre)) !==
                    mb_strtolower('Producción')
                ) {
                    return response()->json([
                        'message' =>
                            'Solo se pueden enviar productos a Mostrador desde el almacén Producción.',
                    ], 422);
                }

                /*
                 * 2. Buscar almacén Mostrador.
                 */
                $almacenMostrador = Almacen::whereRaw(
                    'LOWER(nombre) = ?',
                    [mb_strtolower('Mostrador')]
                )->first();

                if (!$almacenMostrador) {
                    return response()->json([
                        'message' =>
                            'El almacén Mostrador no está configurado.',
                    ], 422);
                }

                /*
                 * 3. Obtener producto.
                 */
                $productoPresentacion =
                    ProductoPresentacion::with([
                        'producto',
                        'presentacion',
                    ])->find(
                        $datos['id_producto_presentacion']
                    );

                if (!$productoPresentacion) {
                    return response()->json([
                        'message' =>
                            'Producto no encontrado.',
                    ], 404);
                }

                $cantidad = (int) $datos['cantidad'];

                /*
                 * 4. Bloquear y comprobar inventario de Producción.
                 */
                $inventarioOrigen = Inventario::where(
                    'id_almacen',
                    $almacenOrigen->id_almacen
                )
                    ->where(
                        'id_producto_presentacion',
                        $productoPresentacion
                            ->id_producto_presentacion
                    )
                    ->whereNull('id_materia_prima')
                    ->lockForUpdate()
                    ->first();

                $stockDisponible = $inventarioOrigen
                    ? (float) $inventarioOrigen->cantidad
                    : 0;

                if ($stockDisponible < $cantidad) {
                    return response()->json([
                        'message' =>
                            'Stock insuficiente en Producción.',
                        'errors' => [
                            'cantidad' => [
                                "Disponible: {$stockDisponible}. Solicitado: {$cantidad}.",
                            ],
                        ],
                    ], 422);
                }

                /*
                 * 5. Crear egreso de Producción.
                 */
                $nombreProducto =
                    $productoPresentacion
                        ->producto
                        ?->nombre ??
                    'Producto';

                $nombrePresentacion =
                    $productoPresentacion
                        ->presentacion
                        ?->nombre ??
                    'Presentación';

                $glosa =
                    "Traslado de Producción a Mostrador: " .
                    "{$nombreProducto} - {$nombrePresentacion}";

                $egreso = Egreso::create([
                    'fecha_egreso' => now(),
                    'glosa' => $glosa,
                    'id_usuario' =>
                        $request->user()->id_usuario,
                ]);

                DetalleEgreso::create([
                    'id_egreso' =>
                        $egreso->id_egreso,
                    'id_almacen' =>
                        $almacenOrigen->id_almacen,
                    'id_producto_presentacion' =>
                        $productoPresentacion
                            ->id_producto_presentacion,
                    'id_materia_prima' => null,
                    'cantidad' => $cantidad,
                ]);

                /*
                 * 6. Descontar inventario de Producción.
                 */
                $inventarioOrigen->cantidad = round(
                    $stockDisponible - $cantidad,
                    3
                );

                $inventarioOrigen
                    ->ultima_actualizacion = now();

                $inventarioOrigen->save();

                /*
                 * 7. Crear ingreso a Mostrador.
                 */
                $ingreso = Ingreso::create([
                    'fecha_ingreso' => now(),
                    'glosa' => $glosa,
                    'id_usuario' =>
                        $request->user()->id_usuario,
                ]);

                DetalleIngreso::create([
                    'id_ingreso' =>
                        $ingreso->id_ingreso,
                    'id_almacen' =>
                        $almacenMostrador->id_almacen,
                    'id_producto_presentacion' =>
                        $productoPresentacion
                            ->id_producto_presentacion,
                    'id_materia_prima' => null,
                    'cantidad' => $cantidad,
                ]);

                /*
                 * 8. Sumar inventario en Mostrador.
                 */
                $inventarioMostrador =
                    Inventario::where(
                        'id_almacen',
                        $almacenMostrador->id_almacen
                    )
                        ->where(
                            'id_producto_presentacion',
                            $productoPresentacion
                                ->id_producto_presentacion
                        )
                        ->whereNull(
                            'id_materia_prima'
                        )
                        ->lockForUpdate()
                        ->first();

                if ($inventarioMostrador) {
                    $inventarioMostrador->cantidad =
                        round(
                            (float)
                                $inventarioMostrador
                                    ->cantidad +
                            $cantidad,
                            3
                        );

                    $inventarioMostrador
                        ->ultima_actualizacion = now();

                    $inventarioMostrador->save();
                } else {
                    $inventarioMostrador =
                        Inventario::create([
                            'id_almacen' =>
                                $almacenMostrador
                                    ->id_almacen,

                            'id_producto_presentacion' =>
                                $productoPresentacion
                                    ->id_producto_presentacion,

                            'id_materia_prima' =>
                                null,

                            'cantidad' =>
                                $cantidad,

                            'ultima_actualizacion' =>
                                now(),
                        ]);
                }

                return response()->json([
                    'message' =>
                        "{$cantidad} unidad(es) enviada(s) a Mostrador correctamente.",

                    'traslado' => [
                        'producto' =>
                            "{$nombreProducto} - {$nombrePresentacion}",

                        'cantidad' =>
                            $cantidad,

                        'origen' =>
                            $almacenOrigen->nombre,

                        'destino' =>
                            $almacenMostrador->nombre,

                        'stock_origen' =>
                            (float)
                                $inventarioOrigen
                                    ->cantidad,

                        'stock_destino' =>
                            (float)
                                $inventarioMostrador
                                    ->cantidad,

                        'id_egreso' =>
                            $egreso->id_egreso,

                        'id_ingreso' =>
                            $ingreso->id_ingreso,
                    ],
                ], 200);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' =>
                    'No se pudo enviar el producto a Mostrador.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}