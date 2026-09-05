<?php

namespace App\Http\Controllers\Api\Ventas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ventas\AnularVentaRequest;
use App\Http\Requests\Ventas\StoreVentaRequest;
use App\Http\Requests\Ventas\UpdateVentaRequest;
use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\ProductoPresentacion;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VentaController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Listar ventas
    |--------------------------------------------------------------------------
    */
    public function index(Request $request): JsonResponse
    {
        $ventas = Venta::query()
            ->with([
                'cliente',
                'usuario',
                'usuarioAnulacion',
                'detalles.productoPresentacion.producto',
                'detalles.productoPresentacion.presentacion',
            ])
            ->when(
                $request->filled('estado'),
                fn ($query) =>
                    $query->where(
                        'estado',
                        $request->string('estado')->toString()
                    )
            )
            ->when(
                $request->filled('buscar'),
                function ($query) use ($request) {
                    $buscar =
                        '%' .
                        $request->string('buscar')->toString() .
                        '%';

                    $query->where(
                        function ($subQuery) use ($buscar) {
                            $subQuery
                                ->where(
                                    'nombre_cliente_ocasional',
                                    'ILIKE',
                                    $buscar
                                )
                                ->orWhereHas(
                                    'cliente',
                                    function ($clienteQuery) use ($buscar) {
                                        $clienteQuery
                                            ->where(
                                                'nombre',
                                                'ILIKE',
                                                $buscar
                                            )
                                            ->orWhere(
                                                'apellido',
                                                'ILIKE',
                                                $buscar
                                            )
                                            ->orWhere(
                                                'ci_nit',
                                                'ILIKE',
                                                $buscar
                                            );
                                    }
                                )
                                ->orWhereHas(
                                    'detalles.productoPresentacion.producto',
                                    fn ($productoQuery) =>
                                        $productoQuery->where(
                                            'nombre',
                                            'ILIKE',
                                            $buscar
                                        )
                                );
                        }
                    );
                }
            )
            ->orderByDesc('fecha_venta')
            ->orderByDesc('id_venta')
            ->get();

        return response()->json([
            'ventas' => $ventas,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Consultar una venta
    |--------------------------------------------------------------------------
    */
    public function show(int $id): JsonResponse
    {
        $venta = Venta::query()
            ->with([
                'cliente',
                'usuario',
                'usuarioAnulacion',
                'detalles.productoPresentacion.producto',
                'detalles.productoPresentacion.presentacion',
            ])
            ->find($id);

        if (!$venta) {
            return response()->json([
                'message' => 'Venta no encontrada.',
            ], 404);
        }

        return response()->json([
            'venta' => $venta,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Catálogos para formulario
    |--------------------------------------------------------------------------
    */
    public function catalogos(): JsonResponse
    {
        $clientes = Cliente::query()
            ->where('estado', true)
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get([
                'id_cliente',
                'nombre',
                'apellido',
                'ci_nit',
                'telefono',
            ]);

        $productosPresentaciones =
            ProductoPresentacion::query()
                ->with([
                    'producto',
                    'presentacion',
                ])
                ->whereHas(
                    'producto',
                    fn ($query) =>
                        $query->where(
                            'estado',
                            true
                        )
                )
                ->whereHas(
                    'presentacion',
                    fn ($query) =>
                        $query->where(
                            'estado',
                            true
                        )
                )
                ->orderBy(
                    'id_producto_presentacion'
                )
                ->get();

        return response()->json([
            'clientes' => $clientes,
            'productos_presentaciones' =>
                $productosPresentaciones,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Registrar venta
    |--------------------------------------------------------------------------
    */
    public function store(
        StoreVentaRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $venta = DB::transaction(
            function () use ($datos, $request) {
                $venta = Venta::create([
                    'id_cliente' =>
                        $datos['id_cliente'] ?? null,

                    'id_usuario' =>
                        $request->user()->getKey(),

                    'nombre_cliente_ocasional' =>
                        !empty(
                            $datos['nombre_cliente_ocasional']
                        )
                            ? trim(
                                $datos[
                                    'nombre_cliente_ocasional'
                                ]
                            )
                            : null,

                    'fecha_venta' => now(),

                    'total' => 0,

                    'estado' => 'REGISTRADA',

                    'observaciones' =>
                        $datos['observaciones'] ?? null,
                ]);

                $total = $this->guardarDetalles(
                    $venta,
                    $datos['items']
                );

                $venta->update([
                    'total' => $total,
                ]);

                return $venta;
            }
        );

        $venta->load([
            'cliente',
            'usuario',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ]);

        return response()->json([
            'message' =>
                'Venta registrada correctamente.',

            'venta' => $venta,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Editar venta
    |--------------------------------------------------------------------------
    |
    | Solo una venta REGISTRADA puede modificarse.
    | Una venta ANULADA conserva su información histórica.
    |--------------------------------------------------------------------------
    */
    public function update(
        UpdateVentaRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $venta = DB::transaction(
            function () use ($datos, $id) {
                $venta = Venta::query()
                    ->lockForUpdate()
                    ->find($id);

                if (!$venta) {
                    abort(
                        404,
                        'Venta no encontrada.'
                    );
                }

                if (
                    $venta->estado !==
                    'REGISTRADA'
                ) {
                    abort(
                        409,
                        'No se puede editar una venta anulada.'
                    );
                }

                $venta->update([
                    'id_cliente' =>
                        $datos['id_cliente'] ?? null,

                    'nombre_cliente_ocasional' =>
                        !empty(
                            $datos['nombre_cliente_ocasional']
                        )
                            ? trim(
                                $datos[
                                    'nombre_cliente_ocasional'
                                ]
                            )
                            : null,

                    'observaciones' =>
                        $datos['observaciones'] ?? null,
                ]);

                /*
                 * Se reemplazan los detalles dentro
                 * de la misma transacción.
                 */
                $venta->detalles()->delete();

                $total = $this->guardarDetalles(
                    $venta,
                    $datos['items']
                );

                $venta->update([
                    'total' => $total,
                ]);

                return $venta;
            }
        );

        $venta->load([
            'cliente',
            'usuario',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ]);

        return response()->json([
            'message' =>
                'Venta actualizada correctamente.',

            'venta' => $venta,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Anular venta
    |--------------------------------------------------------------------------
    |
    | Una venta anulada NO se reactiva.
    |--------------------------------------------------------------------------
    */
    public function anular(
        AnularVentaRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $venta = DB::transaction(
            function () use (
                $request,
                $datos,
                $id
            ) {
                $venta = Venta::query()
                    ->lockForUpdate()
                    ->find($id);

                if (!$venta) {
                    abort(
                        404,
                        'Venta no encontrada.'
                    );
                }

                if (
                    $venta->estado ===
                    'ANULADA'
                ) {
                    abort(
                        409,
                        'La venta ya se encuentra anulada.'
                    );
                }

                /*
                 * Estado + auditoría se actualizan
                 * simultáneamente para cumplir el
                 * CHECK de la base de datos.
                 */
                $venta->update([
                    'estado' => 'ANULADA',

                    'id_usuario_anulacion' =>
                        $request->user()->getKey(),

                    'motivo_anulacion' =>
                        trim(
                            $datos[
                                'motivo_anulacion'
                            ]
                        ),

                    'fecha_anulacion' =>
                        now(),
                ]);

                return $venta;
            }
        );

        $venta->load([
            'cliente',
            'usuario',
            'usuarioAnulacion',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ]);

        return response()->json([
            'message' =>
                'Venta anulada correctamente.',

            'venta' => $venta,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Guardar detalles y calcular total
    |--------------------------------------------------------------------------
    |
    | El frontend NO define precio_unitario,
    | subtotal ni total.
    |
    | Los precios se obtienen nuevamente desde
    | producto_presentacion en la base de datos.
    |--------------------------------------------------------------------------
    */
    private function guardarDetalles(
        Venta $venta,
        array $items
    ): float {
        $total = 0;

        foreach ($items as $item) {
            $productoPresentacion =
                ProductoPresentacion::query()
                    ->with([
                        'producto',
                        'presentacion',
                    ])
                    ->lockForUpdate()
                    ->find(
                        $item[
                            'id_producto_presentacion'
                        ]
                    );

            if (!$productoPresentacion) {
                throw ValidationException::withMessages([
                    'items' =>
                        'Uno de los productos seleccionados ya no existe.',
                ]);
            }

            if (
                !$productoPresentacion
                    ->producto
                    ?->estado ||
                !$productoPresentacion
                    ->presentacion
                    ?->estado
            ) {
                throw ValidationException::withMessages([
                    'items' =>
                        'Uno de los productos o presentaciones seleccionados se encuentra inactivo.',
                ]);
            }

            $cantidad =
                (int) $item['cantidad'];

            $precioUnitario =
                round(
                    (float)
                    $productoPresentacion->precio,
                    2
                );

            $costoPersonalizacion =
                round(
                    (float) (
                        $item[
                            'costo_personalizacion'
                        ] ?? 0
                    ),
                    2
                );

            /*
             * En CU10 el costo de personalización
             * representa el adicional total de la
             * línea de venta.
             */
            $subtotal = round(
                (
                    $precioUnitario *
                    $cantidad
                ) +
                $costoPersonalizacion,
                2
            );

            DetalleVenta::create([
                'id_venta' =>
                    $venta->id_venta,

                'id_producto_presentacion' =>
                    $productoPresentacion
                        ->id_producto_presentacion,

                'cantidad' =>
                    $cantidad,

                'precio_unitario' =>
                    $precioUnitario,

                'costo_personalizacion' =>
                    $costoPersonalizacion,

                'detalle_personalizacion' =>
                    $item[
                        'detalle_personalizacion'
                    ] ?? null,

                'subtotal' =>
                    $subtotal,
            ]);

            $total += $subtotal;
        }

        return round($total, 2);
    }
}