<?php

namespace App\Http\Controllers\Api\Pedidos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pedidos\CambiarEstadoPedidoRequest;
use App\Http\Requests\Pedidos\StorePedidoRequest;
use App\Http\Requests\Pedidos\UpdatePedidoRequest;
use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\ProductoPresentacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PedidoController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Listar pedidos
    |--------------------------------------------------------------------------
    */
    public function index(Request $request): JsonResponse
    {
        $pedidos = Pedido::query()
            ->with([
                'cliente',
                'usuario',
                'usuarioEntrega',
                'usuarioCancelacion',
                'pagos',
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
                    $texto = trim(
                        $request->string('buscar')->toString()
                    );

                    $buscar = '%' . $texto . '%';

                    $query->where(
                        function ($subQuery) use ($buscar, $texto) {
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
                                );

                            if (ctype_digit($texto)) {
                                $subQuery->orWhere(
                                    'id_pedido',
                                    (int) $texto
                                );
                            }
                        }
                    );
                }
            )
            ->when(
                $request->filled('fecha_entrega'),
                fn ($query) =>
                    $query->whereDate(
                        'fecha_entrega',
                        $request->string('fecha_entrega')->toString()
                    )
            )
            ->orderBy('fecha_entrega')
            ->orderBy('hora_entrega')
            ->orderByDesc('id_pedido')
            ->get();

        return response()->json([
            'pedidos' => $pedidos,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Consultar pedido
    |--------------------------------------------------------------------------
    */
    public function show(int $id): JsonResponse
    {
        $pedido = Pedido::query()
            ->with([
                'cliente',
                'usuario',
                'usuarioEntrega',
                'usuarioCancelacion',
                'pagos',
                'detalles.productoPresentacion.producto',
                'detalles.productoPresentacion.presentacion',
            ])
            ->find($id);

        if (!$pedido) {
            return response()->json([
                'message' => 'Pedido no encontrado.',
            ], 404);
        }

        return response()->json([
            'pedido' => $pedido,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Catálogos
    |--------------------------------------------------------------------------
    */
    public function catalogos(): JsonResponse
    {
        $clientes = Cliente::query()
            ->where('estado', true)
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get();

        $presentaciones = ProductoPresentacion::query()
            ->with([
                'producto',
                'presentacion',
            ])
            ->whereHas(
                'producto',
                fn ($query) =>
                    $query->where('estado', true)
            )
            ->whereHas(
                'presentacion',
                fn ($query) =>
                    $query->where('estado', true)
            )
            ->orderBy('id_producto_presentacion')
            ->get()
            ->map(function ($item) {
                return [
                    'id_producto_presentacion' =>
                        $item->id_producto_presentacion,

                    'precio' =>
                        $item->precio,

                    'permite_personalizacion' =>
                        (bool) $item->permite_personalizacion,

                    'producto' =>
                        $item->producto,

                    'presentacion' =>
                        $item->presentacion,
                ];
            })
            ->values();

        return response()->json([
            'clientes' => $clientes,
            'presentaciones' => $presentaciones,

            'tipos_cliente' => [
                'REGISTRADO',
                'OCASIONAL',
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Registrar pedido
    |--------------------------------------------------------------------------
    */
    public function store(
        StorePedidoRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $pedido = DB::transaction(
            function () use ($datos, $request) {
                $this->validarCliente(
                    $datos
                );

                $pedido = Pedido::create([
                    'id_cliente' =>
                        $datos['tipo_cliente'] === 'REGISTRADO'
                            ? $datos['id_cliente']
                            : null,

                    'nombre_cliente_ocasional' =>
                        $datos['tipo_cliente'] === 'OCASIONAL'
                            ? trim(
                                $datos[
                                    'nombre_cliente_ocasional'
                                ]
                            )
                            : null,

                    'id_usuario' =>
                        $request->user()->getKey(),

                    'fecha_pedido' =>
                        now(),

                    'fecha_entrega' =>
                        $datos['fecha_entrega'],

                    'hora_entrega' =>
                        $datos['hora_entrega'],

                    'total' =>
                        0,

                    'estado' =>
                        'PROGRAMADO',

                    'observaciones' =>
                        isset($datos['observaciones'])
                            ? trim($datos['observaciones'])
                            : null,
                ]);

                $total =
                    $this->guardarDetalles(
                        $pedido,
                        $datos['detalles']
                    );

                $pedido->update([
                    'total' => $total,
                ]);

                return $pedido;
            }
        );

        $pedido->load([
            'cliente',
            'usuario',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ]);

        return response()->json([
            'message' =>
                'Pedido registrado correctamente.',

            'pedido' =>
                $pedido,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Editar pedido
    |--------------------------------------------------------------------------
    */
    public function update(
        UpdatePedidoRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $pedido = DB::transaction(
            function () use (
                $datos,
                $request,
                $id
            ) {
                $pedido = Pedido::query()
                    ->lockForUpdate()
                    ->find($id);

                if (!$pedido) {
                    abort(
                        404,
                        'Pedido no encontrado.'
                    );
                }

                /*
                 * CU14 solamente modifica pedidos PROGRAMADOS.
                 *
                 * Los demás estados serán administrados
                 * posteriormente por CU15.
                 */
                if (
                    $pedido->estado !==
                    'PROGRAMADO'
                ) {
                    abort(
                        409,
                        'Solo se pueden modificar pedidos en estado PROGRAMADO.'
                    );
                }

                $this->validarCliente(
                    $datos
                );

                $pedido->update([
                    'id_cliente' =>
                        $datos['tipo_cliente'] === 'REGISTRADO'
                            ? $datos['id_cliente']
                            : null,

                    'nombre_cliente_ocasional' =>
                        $datos['tipo_cliente'] === 'OCASIONAL'
                            ? trim(
                                $datos[
                                    'nombre_cliente_ocasional'
                                ]
                            )
                            : null,

                    'fecha_entrega' =>
                        $datos['fecha_entrega'],

                    'hora_entrega' =>
                        $datos['hora_entrega'],

                    'observaciones' =>
                        isset($datos['observaciones'])
                            ? trim($datos['observaciones'])
                            : null,
                ]);

                /*
                 * Para esta versión académica, editar un pedido
                 * reemplaza su detalle completo.
                 *
                 * El precio vuelve a congelarse utilizando el
                 * precio vigente en el momento de guardar
                 * la modificación.
                 */
                $pedido
                    ->detalles()
                    ->delete();

                $total =
                    $this->guardarDetalles(
                        $pedido,
                        $datos['detalles']
                    );

                $pedido->update([
                    'total' =>
                        $total,
                ]);

                return $pedido;
            }
        );

        $pedido->load([
            'cliente',
            'usuario',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ]);

        return response()->json([
            'message' =>
                'Pedido actualizado correctamente.',

            'pedido' =>
                $pedido,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Cambiar estado
    |--------------------------------------------------------------------------
    */
    public function cambiarEstado(
        CambiarEstadoPedidoRequest $request,
        int $id
    ): JsonResponse {
        $pedido = DB::transaction(
            function () use ($request, $id) {
                $pedido = Pedido::query()
                    ->lockForUpdate()
                    ->findOrFail($id);

                if (in_array($pedido->estado, ['ENTREGADO', 'CANCELADO'])) {
                    abort(
                        409,
                        'El pedido ya se encuentra en un estado final y no puede ser modificado.'
                    );
                }

                $nuevoEstado = $request->validated('estado');

                // Validar transiciones permitidas
                if ($pedido->estado === 'PROGRAMADO') {
                    if (!in_array($nuevoEstado, ['EN_PROCESO', 'ENTREGADO', 'CANCELADO'])) {
                        abort(422, 'Transición de estado no permitida desde PROGRAMADO.');
                    }
                } elseif ($pedido->estado === 'EN_PROCESO') {
                    if (!in_array($nuevoEstado, ['ENTREGADO', 'CANCELADO'])) {
                        abort(422, 'Transición de estado no permitida desde EN_PROCESO.');
                    }
                }

                if ($nuevoEstado === 'ENTREGADO') {
                    if ($pedido->saldo > 0) {
                        abort(
                            422,
                            "El pedido tiene un saldo pendiente de Bs. " . number_format($pedido->saldo, 2) . " y no puede ser entregado hasta que el saldo sea 0."
                        );
                    }
                    
                    $pedido->update([
                        'estado' => 'ENTREGADO',
                        'id_usuario_entrega' => $request->user()->getKey(),
                        'fecha_entrega_efectiva' => now(),
                    ]);
                } elseif ($nuevoEstado === 'CANCELADO') {
                    $pedido->update([
                        'estado' => 'CANCELADO',
                        'id_usuario_cancelacion' => $request->user()->getKey(),
                        'motivo_cancelacion' => trim($request->validated('motivo_cancelacion')),
                        'fecha_cancelacion' => now(),
                    ]);
                } elseif ($nuevoEstado === 'EN_PROCESO') {
                    $pedido->update([
                        'estado' => 'EN_PROCESO',
                    ]);
                }

                return $pedido;
            }
        );

        $pedido->load([
            'cliente',
            'usuario',
            'usuarioEntrega',
            'usuarioCancelacion',
            'pagos',
            'detalles.productoPresentacion.producto',
            'detalles.productoPresentacion.presentacion',
        ]);

        return response()->json([
            'message' => 'Estado del pedido actualizado correctamente.',
            'pedido' => $pedido,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Validar cliente
    |--------------------------------------------------------------------------
    */
    private function validarCliente(
        array $datos
    ): void {
        if (
            $datos['tipo_cliente'] ===
            'REGISTRADO'
        ) {
            $cliente = Cliente::query()
                ->find(
                    $datos['id_cliente']
                );

            if (
                !$cliente ||
                !$cliente->estado
            ) {
                throw ValidationException::withMessages([
                    'id_cliente' =>
                        'El cliente seleccionado no está disponible.',
                ]);
            }

            return;
        }

        $nombre = trim(
            (string) (
                $datos[
                    'nombre_cliente_ocasional'
                ] ??
                ''
            )
        );

        if ($nombre === '') {
            throw ValidationException::withMessages([
                'nombre_cliente_ocasional' =>
                    'Debe indicar el nombre del cliente ocasional.',
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Guardar detalles y calcular total
    |--------------------------------------------------------------------------
    */
    private function guardarDetalles(
        Pedido $pedido,
        array $detalles
    ): float {
        /*
         * Obtenemos todas las presentaciones utilizadas
         * dentro de la misma transacción y bloqueamos sus filas
         * mientras leemos sus precios.
         */
        $ids = collect($detalles)
            ->pluck(
                'id_producto_presentacion'
            )
            ->unique()
            ->values();

        $presentaciones =
            ProductoPresentacion::query()
                ->with([
                    'producto',
                    'presentacion',
                ])
                ->whereIn(
                    'id_producto_presentacion',
                    $ids
                )
                ->lockForUpdate()
                ->get()
                ->keyBy(
                    'id_producto_presentacion'
                );

        if (
            $presentaciones->count() !==
            $ids->count()
        ) {
            throw ValidationException::withMessages([
                'detalles' =>
                    'Una de las presentaciones seleccionadas no existe.',
            ]);
        }

        $total = 0;

        foreach ($detalles as $indice => $detalle) {
            $productoPresentacion =
                $presentaciones->get(
                    $detalle[
                        'id_producto_presentacion'
                    ]
                );

            /*
             * Producto y presentación deben continuar activos.
             */
            if (
                !$productoPresentacion->producto ||
                !$productoPresentacion->producto->estado ||
                !$productoPresentacion->presentacion ||
                !$productoPresentacion->presentacion->estado
            ) {
                throw ValidationException::withMessages([
                    "detalles.$indice.id_producto_presentacion" =>
                        'La presentación seleccionada no está disponible.',
                ]);
            }

            $personalizacion = trim(
                (string) (
                    $detalle[
                        'detalle_personalizacion'
                    ] ??
                    ''
                )
            );

            $costoPersonalizacion =
                round(
                    (float) (
                        $detalle[
                            'costo_personalizacion'
                        ] ??
                        0
                    ),
                    2
                );

            /*
             * No confiar en React para la personalización.
             */
            if (
                !$productoPresentacion
                    ->permite_personalizacion
                &&
                (
                    $personalizacion !== '' ||
                    $costoPersonalizacion > 0
                )
            ) {
                throw ValidationException::withMessages([
                    "detalles.$indice.detalle_personalizacion" =>
                        'La presentación seleccionada no permite personalización.',
                ]);
            }

            /*
             * Si existe un costo de personalización debe
             * explicarse qué personalización se está cobrando.
             */
            if (
                $costoPersonalizacion > 0 &&
                $personalizacion === ''
            ) {
                throw ValidationException::withMessages([
                    "detalles.$indice.detalle_personalizacion" =>
                        'Debe indicar el detalle de la personalización cuando exista un costo adicional.',
                ]);
            }

            /*
             * Precio tomado exclusivamente desde DB.
             */
            $precioCongelado =
                round(
                    (float) $productoPresentacion->precio,
                    2
                );

            $cantidad =
                (int) $detalle['cantidad'];

            $subtotal =
                round(
                    ($precioCongelado * $cantidad)
                    +
                    $costoPersonalizacion,
                    2
                );

            $pedido
                ->detalles()
                ->create([
                    'id_producto_presentacion' =>
                        $productoPresentacion
                            ->id_producto_presentacion,

                    'cantidad' =>
                        $cantidad,

                    'precio_congelado' =>
                        $precioCongelado,

                    'detalle_personalizacion' =>
                        $personalizacion !== ''
                            ? $personalizacion
                            : null,

                    'costo_personalizacion' =>
                        $costoPersonalizacion,

                    'subtotal' =>
                        $subtotal,
                ]);

            $total += $subtotal;
        }

        return round(
            $total,
            2
        );
    }
}