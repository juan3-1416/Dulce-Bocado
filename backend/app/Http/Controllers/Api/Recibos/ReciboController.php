<?php

namespace App\Http\Controllers\Api\Recibos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Recibos\AnularReciboRequest;
use App\Http\Requests\Recibos\StoreReciboRequest;
use App\Models\Pago;
use App\Models\Recibo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReciboController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Listar recibos
    |--------------------------------------------------------------------------
    */
    public function index(Request $request): JsonResponse
    {
        $recibos = Recibo::query()
            ->with([
                'pago.venta.cliente',
                'pago.pedido.cliente',
                'usuarioEmision',
                'usuarioAnulacion',
                'usuarioUltimaImpresion',
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
                $request->filled('metodo_pago'),
                fn ($query) =>
                    $query->where(
                        'metodo_pago',
                        $request->string('metodo_pago')->toString()
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
                                    'nombre_cliente',
                                    'ILIKE',
                                    $buscar
                                )
                                ->orWhere(
                                    'ci_nit_cliente',
                                    'ILIKE',
                                    $buscar
                                )
                                ->orWhere(
                                    'referencia_pago',
                                    'ILIKE',
                                    $buscar
                                );

                            if (ctype_digit($texto)) {
                                $subQuery
                                    ->orWhere(
                                        'id_recibo',
                                        (int) $texto
                                    )
                                    ->orWhere(
                                        'id_pago',
                                        (int) $texto
                                    );
                            }
                        }
                    );
                }
            )
            ->orderByDesc('fecha_emision')
            ->orderByDesc('id_recibo')
            ->get();

        return response()->json([
            'recibos' => $recibos,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Consultar recibo
    |--------------------------------------------------------------------------
    */
    public function show(int $id): JsonResponse
    {
        $recibo = Recibo::query()
            ->with([
                'pago.venta.cliente',
                'pago.venta.detalles.productoPresentacion.producto',
                'pago.venta.detalles.productoPresentacion.presentacion',

                'pago.pedido.cliente',
                'pago.pedido.detalles.productoPresentacion.producto',
                'pago.pedido.detalles.productoPresentacion.presentacion',

                'usuarioEmision',
                'usuarioAnulacion',
                'usuarioUltimaImpresion',
            ])
            ->find($id);

        if (!$recibo) {
            return response()->json([
                'message' =>
                    'Recibo no encontrado.',
            ], 404);
        }

        return response()->json([
            'recibo' => $recibo,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Catálogo de pagos disponibles
    |--------------------------------------------------------------------------
    |
    | Pueden generar recibo:
    |
    | - Pagos REGISTRADOS.
    | - De una venta REGISTRADA.
    | - O de un pedido PROGRAMADO, EN_PROCESO o ENTREGADO.
    | - Sin otro recibo EMITIDO para ese mismo pago.
    |--------------------------------------------------------------------------
    */
    public function catalogos(): JsonResponse
    {
        $pagos = Pago::query()
            ->with([
                'venta.cliente',
                'pedido.cliente',
                'pagoInternet',
            ])
            ->where(
                'estado',
                'REGISTRADO'
            )
            ->where(
                function ($query) {
                    $query
                        ->whereHas(
                            'venta',
                            fn ($ventaQuery) =>
                                $ventaQuery->where(
                                    'estado',
                                    'REGISTRADA'
                                )
                        )
                        ->orWhereHas(
                            'pedido',
                            fn ($pedidoQuery) =>
                                $pedidoQuery->whereIn(
                                    'estado',
                                    [
                                        'PROGRAMADO',
                                        'EN_PROCESO',
                                        'ENTREGADO',
                                    ]
                                )
                        );
                }
            )
            ->whereDoesntHave(
                'recibos',
                fn ($query) =>
                    $query->where(
                        'estado',
                        'EMITIDO'
                    )
            )
            ->orderByDesc('fecha_pago')
            ->orderByDesc('id_pago')
            ->get()
            ->map(function ($pago) {
                $operacion =
                    $this->obtenerOperacionPago(
                        $pago
                    );

                $nombreCliente =
                    $this->obtenerNombreCliente(
                        $operacion
                    );

                $ciNit =
                    $operacion &&
                    $operacion->cliente
                        ? $operacion->cliente->ci_nit
                        : null;

                $tipoOrigen =
                    $pago->id_venta !== null
                        ? 'VENTA'
                        : 'PEDIDO';

                return [
                    'id_pago' =>
                        $pago->id_pago,

                    'tipo_origen' =>
                        $tipoOrigen,

                    'id_venta' =>
                        $pago->id_venta,

                    'id_pedido' =>
                        $pago->id_pedido,

                    'monto' =>
                        $pago->monto,

                    'metodo_pago' =>
                        $pago->metodo_pago,

                    'referencia' =>
                        $pago->referencia,

                    'fecha_pago' =>
                        $pago->fecha_pago,

                    'nombre_cliente' =>
                        $nombreCliente,

                    'ci_nit_cliente' =>
                        $ciNit,

                    'venta' =>
                        $pago->venta,

                    'pedido' =>
                        $pago->pedido,
                ];
            })
            ->values();

        return response()->json([
            'pagos' => $pagos,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Generar recibo
    |--------------------------------------------------------------------------
    */
    public function store(
        StoreReciboRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $recibo = DB::transaction(
            function () use ($datos, $request) {
                /*
                 * Bloquear el pago para evitar generación
                 * simultánea de recibos o anulaciones.
                 */
                $pago = Pago::query()
                    ->with([
                        'venta.cliente',
                        'pedido.cliente',
                    ])
                    ->lockForUpdate()
                    ->find(
                        $datos['id_pago']
                    );

                if (!$pago) {
                    throw ValidationException::withMessages([
                        'id_pago' =>
                            'El pago seleccionado no existe.',
                    ]);
                }

                if ($pago->estado !== 'REGISTRADO') {
                    throw ValidationException::withMessages([
                        'id_pago' =>
                            'No se puede generar un recibo para un pago anulado.',
                    ]);
                }

                /*
                 * Determinar si el pago pertenece a una
                 * venta o a un pedido.
                 */
                $operacion =
                    $this->obtenerOperacionPago(
                        $pago
                    );

                if (!$operacion) {
                    throw ValidationException::withMessages([
                        'id_pago' =>
                            'El pago no tiene una operación comercial válida asociada.',
                    ]);
                }

                /*
                 * Validar el estado de la operación.
                 */
                if ($pago->id_venta !== null) {
                    if ($operacion->estado !== 'REGISTRADA') {
                        throw ValidationException::withMessages([
                            'id_pago' =>
                                'No se puede generar un recibo porque la venta se encuentra anulada.',
                        ]);
                    }
                } else {
                    if ($operacion->estado === 'CANCELADO') {
                        throw ValidationException::withMessages([
                            'id_pago' =>
                                'No se puede generar un recibo porque el pedido se encuentra cancelado.',
                        ]);
                    }
                }

                /*
                 * Solo puede existir un recibo EMITIDO
                 * para el mismo pago.
                 */
                $existeReciboActivo =
                    $pago
                        ->recibos()
                        ->where(
                            'estado',
                            'EMITIDO'
                        )
                        ->exists();

                if ($existeReciboActivo) {
                    abort(
                        409,
                        'El pago ya tiene un recibo emitido.'
                    );
                }

                $nombreCliente =
                    $this->obtenerNombreCliente(
                        $operacion
                    );

                $ciNit =
                    $operacion->cliente
                        ? $operacion->cliente->ci_nit
                        : null;

                /*
                 * Snapshot del pago y del cliente.
                 *
                 * El recibo conserva los datos históricos
                 * aunque posteriormente cambie el cliente
                 * o la operación comercial.
                 */
                return Recibo::create([
                    'id_pago' =>
                        $pago->id_pago,

                    'id_usuario_emision' =>
                        $request->user()->getKey(),

                    'nombre_cliente' =>
                        $nombreCliente,

                    'ci_nit_cliente' =>
                        $ciNit,

                    'monto' =>
                        $pago->monto,

                    'metodo_pago' =>
                        $pago->metodo_pago,

                    'referencia_pago' =>
                        $pago->referencia,

                    'fecha_pago' =>
                        $pago->fecha_pago,

                    'estado' =>
                        'EMITIDO',

                    'fecha_emision' =>
                        now(),

                    'cantidad_impresiones' =>
                        0,

                    'id_usuario_ultima_impresion' =>
                        null,

                    'fecha_ultima_impresion' =>
                        null,
                ]);
            }
        );

        $recibo->load([
            'pago.venta.cliente',
            'pago.venta.detalles.productoPresentacion.producto',
            'pago.venta.detalles.productoPresentacion.presentacion',

            'pago.pedido.cliente',
            'pago.pedido.detalles.productoPresentacion.producto',
            'pago.pedido.detalles.productoPresentacion.presentacion',

            'usuarioEmision',
        ]);

        return response()->json([
            'message' =>
                'Recibo generado correctamente.',

            'recibo' =>
                $recibo,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Anular recibo
    |--------------------------------------------------------------------------
    */
    public function anular(
        AnularReciboRequest $request,
        int $id
    ): JsonResponse {
        $datos = $request->validated();

        $recibo = DB::transaction(
            function () use (
                $request,
                $datos,
                $id
            ) {
                $recibo = Recibo::query()
                    ->lockForUpdate()
                    ->find($id);

                if (!$recibo) {
                    abort(
                        404,
                        'Recibo no encontrado.'
                    );
                }

                /*
                 * Bloquear también el pago asociado.
                 */
                Pago::query()
                    ->lockForUpdate()
                    ->find(
                        $recibo->id_pago
                    );

                if ($recibo->estado === 'ANULADO') {
                    abort(
                        409,
                        'El recibo ya se encuentra anulado.'
                    );
                }

                /*
                 * Todos los campos se actualizan juntos
                 * para satisfacer la restricción de
                 * auditoría del recibo.
                 */
                $recibo->update([
                    'estado' =>
                        'ANULADO',

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

                return $recibo;
            }
        );

        $recibo->load([
            'pago.venta.cliente',
            'pago.pedido.cliente',
            'usuarioEmision',
            'usuarioAnulacion',
            'usuarioUltimaImpresion',
        ]);

        return response()->json([
            'message' =>
                'Recibo anulado correctamente.',

            'recibo' =>
                $recibo,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Registrar impresión / reimpresión
    |--------------------------------------------------------------------------
    */
    public function imprimir(
        Request $request,
        int $id
    ): JsonResponse {
        $recibo = DB::transaction(
            function () use ($request, $id) {
                $recibo = Recibo::query()
                    ->lockForUpdate()
                    ->find($id);

                if (!$recibo) {
                    abort(
                        404,
                        'Recibo no encontrado.'
                    );
                }

                /*
                 * También permitimos imprimir un recibo
                 * ANULADO para conservar el historial.
                 */
                $nuevaCantidad =
                    $recibo->cantidad_impresiones + 1;

                /*
                 * Estos tres campos deben actualizarse
                 * juntos para cumplir chk_recibo_impresion.
                 */
                $recibo->update([
                    'cantidad_impresiones' =>
                        $nuevaCantidad,

                    'id_usuario_ultima_impresion' =>
                        $request->user()->getKey(),

                    'fecha_ultima_impresion' =>
                        now(),
                ]);

                return $recibo;
            }
        );

        $recibo->load([
            'pago.venta.cliente',
            'pago.venta.detalles.productoPresentacion.producto',
            'pago.venta.detalles.productoPresentacion.presentacion',

            'pago.pedido.cliente',
            'pago.pedido.detalles.productoPresentacion.producto',
            'pago.pedido.detalles.productoPresentacion.presentacion',

            'usuarioEmision',
            'usuarioAnulacion',
            'usuarioUltimaImpresion',
        ]);

        return response()->json([
            'message' =>
                $recibo->cantidad_impresiones === 1
                    ? 'Impresión registrada correctamente.'
                    : 'Reimpresión registrada correctamente.',

            'recibo' =>
                $recibo,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Obtener operación asociada al pago
    |--------------------------------------------------------------------------
    |
    | Un pago pertenece exclusivamente a una Venta
    | o a un Pedido.
    |--------------------------------------------------------------------------
    */
    private function obtenerOperacionPago(
        Pago $pago
    ) {
        if ($pago->id_venta !== null) {
            return $pago->venta;
        }

        if ($pago->id_pedido !== null) {
            return $pago->pedido;
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Obtener nombre del cliente
    |--------------------------------------------------------------------------
    |
    | Funciona tanto para Venta como para Pedido,
    | ya que ambas operaciones manejan:
    |
    | - cliente registrado
    | - nombre_cliente_ocasional
    |--------------------------------------------------------------------------
    */
    private function obtenerNombreCliente(
        $operacion
    ): string {
        if (!$operacion) {
            return 'Cliente no identificado';
        }

        if ($operacion->cliente) {
            $nombre = trim(
                ($operacion->cliente->nombre ?? '') .
                ' ' .
                ($operacion->cliente->apellido ?? '')
            );

            if ($nombre !== '') {
                return $nombre;
            }
        }

        $ocasional = trim(
            (string) (
                $operacion
                    ->nombre_cliente_ocasional ??
                ''
            )
        );

        return $ocasional !== ''
            ? $ocasional
            : 'Cliente ocasional';
    }
}