<?php



namespace App\Http\Controllers\Api\Pagos;



use App\Http\Controllers\Controller;

use App\Http\Requests\Pagos\AnularPagoRequest;

use App\Http\Requests\Pagos\StorePagoRequest;

use App\Models\Pago;

use App\Models\Pedido;

use App\Models\Recibo;

use App\Models\Venta;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB;

use Illuminate\Validation\ValidationException;



class PagoController extends Controller

{

    /*

    |--------------------------------------------------------------------------

    | Listar pagos

    |--------------------------------------------------------------------------

    */

    public function index(Request $request): JsonResponse

    {

        $pagos = Pago::query()

->with([

    'venta' => function ($query) {

        $query

            ->with('cliente')

            ->withSum(

                [

                    'pagos as total_pagado' =>

                        fn ($pagoQuery) =>

                            $pagoQuery->where(

                                'estado',

                                'REGISTRADO'

                            ),

                ],

                'monto'

            );

    },



    'pedido' => function ($query) {

        $query

            ->with('cliente')

            ->withSum(

                [

                    'pagos as total_pagado' =>

                        fn ($pagoQuery) =>

                            $pagoQuery->where(

                                'estado',

                                'REGISTRADO'

                            ),

                ],

                'monto'

            );

    },



    'recibos' => function ($query) {

        $query

            ->select([

                'id_recibo',

                'id_pago',

                'estado',

                'fecha_emision',

            ])

            ->orderByDesc(

                'fecha_emision'

            )

            ->orderByDesc(

                'id_recibo'

            );

    },



    'usuario',

    'usuarioAnulacion',

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

                    $buscar = '%' .

                        $request->string('buscar')->toString() .

                        '%';



                    $query->where(

                        function ($subQuery) use ($buscar) {

                            $subQuery

                                ->where(

                                    'referencia',

                                    'ILIKE',

                                    $buscar

                                )

                                ->orWhereHas(

                                    'venta',

                                    function ($ventaQuery) use ($buscar) {

                                        $ventaQuery

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

                                    }

                                )

                                ->orWhereHas(

                                    'pedido',

                                    function ($pedidoQuery) use ($buscar) {

                                        $pedidoQuery

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

                                    }

                                );

                        }

                    );

                }

            )

            ->orderByDesc('fecha_pago')

            ->orderByDesc('id_pago')

            ->get();



        /*

        |--------------------------------------------------------------------------

        | Saldo histórico después de cada pago

        |--------------------------------------------------------------------------

        |

        | Para cada venta o pedido involucrado en el listado, recuperamos todos

        | sus pagos actualmente REGISTRADOS y reconstruimos el acumulado en orden

        | cronológico. Así cada movimiento conoce el saldo que quedó después de él.

        |--------------------------------------------------------------------------

        */

        $idsVentas = $pagos

            ->pluck('id_venta')

            ->filter(fn ($id) => $id !== null)

            ->unique()

            ->values();



        $idsPedidos = $pagos

            ->pluck('id_pedido')

            ->filter(fn ($id) => $id !== null)

            ->unique()

            ->values();



        $totalesVentas = [];

        $totalesPedidos = [];



        foreach ($pagos as $pago) {

            if (

                $pago->id_venta !== null &&

                $pago->venta

            ) {

                $totalesVentas[$pago->id_venta] = round(

                    (float) $pago->venta->total,

                    2

                );

            }



            if (

                $pago->id_pedido !== null &&

                $pago->pedido

            ) {

                $totalesPedidos[$pago->id_pedido] = round(

                    (float) $pago->pedido->total,

                    2

                );

            }

        }



        $resumenPorPago = [];



        if (

            $idsVentas->isNotEmpty() ||

            $idsPedidos->isNotEmpty()

        ) {

            $movimientos = Pago::query()

                ->select([

                    'id_pago',

                    'id_venta',

                    'id_pedido',

                    'monto',

                    'fecha_pago',

                ])

                ->where(

                    'estado',

                    'REGISTRADO'

                )

                ->where(

                    function ($query) use (

                        $idsVentas,

                        $idsPedidos

                    ) {

                        if ($idsVentas->isNotEmpty()) {

                            $query->whereIn(

                                'id_venta',

                                $idsVentas

                            );

                        }



                        if ($idsPedidos->isNotEmpty()) {

                            if ($idsVentas->isNotEmpty()) {

                                $query->orWhereIn(

                                    'id_pedido',

                                    $idsPedidos

                                );

                            } else {

                                $query->whereIn(

                                    'id_pedido',

                                    $idsPedidos

                                );

                            }

                        }

                    }

                )

                ->orderBy('fecha_pago')

                ->orderBy('id_pago')

                ->get();



            $acumulados = [];



            foreach ($movimientos as $movimiento) {

                if ($movimiento->id_venta !== null) {

                    $clave =

                        'VENTA_' .

                        $movimiento->id_venta;



                    $total =

                        $totalesVentas[

                            $movimiento->id_venta

                        ] ?? 0;

                } else {

                    $clave =

                        'PEDIDO_' .

                        $movimiento->id_pedido;



                    $total =

                        $totalesPedidos[

                            $movimiento->id_pedido

                        ] ?? 0;

                }



                $acumulados[$clave] = round(

                    ($acumulados[$clave] ?? 0) +

                    (float) $movimiento->monto,

                    2

                );



                $saldoDespues = round(

                    $total -

                    $acumulados[$clave],

                    2

                );



                $resumenPorPago[

                    $movimiento->id_pago

                ] = [

                    'total_pagado_hasta_pago' =>

                        number_format(

                            $acumulados[$clave],

                            2,

                            '.',

                            ''

                        ),



                    'saldo_despues_pago' =>

                        number_format(

                            max(

                                0,

                                $saldoDespues

                            ),

                            2,

                            '.',

                            ''

                        ),

                ];

            }

        }



        foreach ($pagos as $pago) {

            $resumen =

                $resumenPorPago[

                    $pago->id_pago

                ] ?? null;



            $pago->setAttribute(

                'total_pagado_hasta_pago',

                $resumen[

                    'total_pagado_hasta_pago'

                ] ?? null

            );



            $pago->setAttribute(

                'saldo_despues_pago',

                $resumen[

                    'saldo_despues_pago'

                ] ?? null

            );

        }



        return response()->json([

            'pagos' => $pagos,

        ]);

    }



    /*

    |--------------------------------------------------------------------------

    | Consultar pago

    |--------------------------------------------------------------------------

    */

    public function show(int $id): JsonResponse

    {

        $pago = Pago::query()

            ->with([

                'venta.cliente',

                'venta.detalles.productoPresentacion.producto',

                'venta.detalles.productoPresentacion.presentacion',

                'pedido.cliente',

                'pedido.detalles.productoPresentacion.producto',

                'pedido.detalles.productoPresentacion.presentacion',

                'usuario',

                'usuarioAnulacion',

            ])

            ->find($id);



        if (!$pago) {

            return response()->json([

                'message' => 'Pago no encontrado.',

            ], 404);

        }



        return response()->json([

            'pago' => $pago,

        ]);

    }



    /*

    |--------------------------------------------------------------------------

    | Catálogo de ventas y pedidos cobrables

    |--------------------------------------------------------------------------

    */

    public function catalogos(): JsonResponse

    {

        $ventas = Venta::query()

            ->with([

                'cliente',

            ])

            ->withSum(

                [

                    'pagos as total_pagado' =>

                        fn ($query) =>

                            $query->where(

                                'estado',

                                'REGISTRADO'

                            ),

                ],

                'monto'

            )

            ->where(

                'estado',

                'PENDIENTE_PAGO'

            )

            ->orderByDesc('fecha_venta')

            ->get()

            ->map(function ($venta) {

                $total = round(

                    (float) $venta->total,

                    2

                );



                $totalPagado = round(

                    (float) (

                        $venta->total_pagado ?? 0

                    ),

                    2

                );



                $saldo = round(

                    $total - $totalPagado,

                    2

                );



                return [

                    'id_venta' =>

                        $venta->id_venta,



                    'id_cliente' =>

                        $venta->id_cliente,



                    'nombre_cliente_ocasional' =>

                        $venta->nombre_cliente_ocasional,



                    'cliente' =>

                        $venta->cliente,



                    'fecha_venta' =>

                        $venta->fecha_venta,



                    'total' =>

                        number_format(

                            $total,

                            2,

                            '.',

                            ''

                        ),



                    'total_pagado' =>

                        number_format(

                            $totalPagado,

                            2,

                            '.',

                            ''

                        ),



                    'saldo' =>

                        number_format(

                            $saldo,

                            2,

                            '.',

                            ''

                        ),

                ];

            })

            ->filter(

                fn ($venta) =>

                    (float) $venta['saldo'] > 0

            )

            ->values();



        $pedidos = Pedido::query()

            ->with([

                'cliente',

            ])

            ->withSum(

                [

                    'pagos as total_pagado_agregado' =>

                        fn ($query) =>

                            $query->where(

                                'estado',

                                'REGISTRADO'

                            ),

                ],

                'monto'

            )

            ->whereIn(

                'estado',

                [

                    'PROGRAMADO',

                    'EN_PROCESO',

                ]

            )

            ->orderByDesc('fecha_pedido')

            ->get()

            ->map(function ($pedido) {

                $total = round(

                    (float) $pedido->total,

                    2

                );



                $totalPagado = round(

                    (float) (

                        $pedido->total_pagado_agregado ?? 0

                    ),

                    2

                );



                $saldo = round(

                    $total - $totalPagado,

                    2

                );



                return [

                    'id_pedido' =>

                        $pedido->id_pedido,



                    'id_cliente' =>

                        $pedido->id_cliente,



                    'nombre_cliente_ocasional' =>

                        $pedido->nombre_cliente_ocasional,



                    'cliente' =>

                        $pedido->cliente,



                    'fecha_pedido' =>

                        $pedido->fecha_pedido,



                    'estado' =>

                        $pedido->estado,



                    'total' =>

                        number_format(

                            $total,

                            2,

                            '.',

                            ''

                        ),



                    'total_pagado' =>

                        number_format(

                            $totalPagado,

                            2,

                            '.',

                            ''

                        ),



                    'saldo' =>

                        number_format(

                            $saldo,

                            2,

                            '.',

                            ''

                        ),

                ];

            })

            ->filter(

                fn ($pedido) =>

                    (float) $pedido['saldo'] > 0

            )

            ->values();



        return response()->json([

            'ventas' => $ventas,

            'pedidos' => $pedidos,



            'metodos_pago' => [

                'EFECTIVO',

                'QR',

            ],

        ]);

    }



    /*

    |--------------------------------------------------------------------------

    | Registrar pago

    |--------------------------------------------------------------------------

    */

    public function store(

        StorePagoRequest $request

    ): JsonResponse {

        $datos = $request->validated();



        $pago = DB::transaction(

            function () use ($datos, $request) {

                $esVenta = !empty($datos['id_venta']);



                $idReferencia = $esVenta

                    ? $datos['id_venta']

                    : $datos['id_pedido'];



                $campoReferencia = $esVenta

                    ? 'id_venta'

                    : 'id_pedido';



                $entidad = $esVenta

                    ? Venta::query()

                        ->lockForUpdate()

                        ->find($idReferencia)

                    : Pedido::query()

                        ->lockForUpdate()

                        ->find($idReferencia);



                if (!$entidad) {

                    throw ValidationException::withMessages([

                        $campoReferencia =>

                            $esVenta

                                ? 'La venta seleccionada no existe.'

                                : 'El pedido seleccionado no existe.',

                    ]);

                }



                if ($esVenta) {

                    if (

                        $entidad->estado !==

                        'PENDIENTE_PAGO'

                    ) {

                        throw ValidationException::withMessages([

                            'id_venta' =>

                                'La venta no se encuentra pendiente de pago.',

                        ]);

                    }



                    if (

                        $entidad

                            ->pagosInternet()

                            ->where(

                                'estado',

                                'PENDIENTE'

                            )

                            ->exists()

                    ) {

                        throw ValidationException::withMessages([

                            'id_venta' =>

                                'La venta tiene un pago QR pendiente. Debe completarlo o resolverlo antes de registrar otro pago.',

                        ]);

                    }

                } else {

                    if (

                        in_array(

                            $entidad->estado,

                            [

                                'ENTREGADO',

                                'CANCELADO',

                            ],

                            true

                        )

                    ) {

                        throw ValidationException::withMessages([

                            'id_pedido' =>

                                'No se pueden registrar pagos sobre un pedido finalizado o cancelado.',

                        ]);

                    }

                }



                $totalPagado = round(

                    (float) $entidad

                        ->pagos()

                        ->where(

                            'estado',

                            'REGISTRADO'

                        )

                        ->sum('monto'),

                    2

                );



                $totalEntidad = round(

                    (float) $entidad->total,

                    2

                );



                $saldo = round(

                    $totalEntidad -

                    $totalPagado,

                    2

                );



                if ($saldo <= 0) {

                    throw ValidationException::withMessages([

                        'monto' =>

                            $esVenta

                                ? 'La venta ya se encuentra completamente pagada.'

                                : 'El pedido ya se encuentra completamente pagado.',

                    ]);

                }



                $monto = round(

                    (float) $datos['monto'],

                    2

                );



                /*

                 \* Las ventas directas deben pagarse completamente.

                 \* Los pedidos sí pueden mantener pagos parciales.

                 */

                if (

                    $esVenta &&

                    abs(

                        $monto -

                        $saldo

                    ) > 0.001

                ) {

                    throw ValidationException::withMessages([

                        'monto' =>

                            'Una venta directa debe pagarse por el total pendiente: Bs ' .

                            number_format(

                                $saldo,

                                2,

                                '.',

                                ''

                            ) .

                            '.',

                    ]);

                }



                if ($monto > $saldo) {

                    throw ValidationException::withMessages([

                        'monto' =>

                            'El monto supera el saldo pendiente. Saldo disponible: Bs ' .

                            number_format(

                                $saldo,

                                2,

                                '.',

                                ''

                            ) .

                            '.',

                    ]);

                }



                $pago = Pago::create([

                    'id_venta' =>

                        $esVenta

                            ? $entidad->id_venta

                            : null,



                    'id_pedido' =>

                        !$esVenta

                            ? $entidad->id_pedido

                            : null,



                    'id_usuario' =>

                        $request->user()->getKey(),



                    'monto' =>

                        $monto,



                    'metodo_pago' =>

                        $datos['metodo_pago'],



                    'referencia' =>

                        !empty($datos['referencia'])

                            ? trim(

                                $datos['referencia']

                            )

                            : null,



                    'estado' =>

                        'REGISTRADO',



                    'observaciones' =>

                        $datos['observaciones']

                        ?? null,



                    'fecha_pago' =>

                        now(),

                ]);



                /*

                 \* Una venta directa solo queda REGISTRADA

                 \* después del pago total.

                 */

                if ($esVenta) {

                    $entidad->update([

                        'estado' =>

                            'REGISTRADA',

                    ]);

                }

                /*

 \* Generar automáticamente el recibo

 \* correspondiente a este pago.

 \*

 \* Un pedido puede tener varios pagos,

 \* por lo tanto cada pago tendrá su

 \* propio recibo.

 */

if ($entidad->cliente) {

    $nombreCliente = trim(

        ($entidad->cliente->nombre ?? '') .

        ' ' .

        ($entidad->cliente->apellido ?? '')

    );



    if ($nombreCliente === '') {

        $nombreCliente =

            'Cliente ocasional';

    }



    $ciNit =

        $entidad->cliente->ci_nit;

} else {

    $nombreCliente = trim(

        (string) (

            $entidad

                ->nombre_cliente_ocasional

            ?? ''

        )

    );



    if ($nombreCliente === '') {

        $nombreCliente =

            'Cliente ocasional';

    }



    $ciNit = null;

}



Recibo::create([

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



                return $pago;

            }

        );



        $pago->load([

            'venta.cliente',

            'pedido.cliente',

            'usuario',

            'recibos',

        ]);



        $recibo = $pago

            ->recibos()

            ->where(

                'estado',

                'EMITIDO'

            )

            ->orderByDesc('id_recibo')

            ->first();



        $resumen = !empty($pago->id_venta)

            ? [

                'resumen_venta' =>

                    $this->obtenerResumenVenta(

                        $pago->id_venta

                    ),

            ]

            : [

                'resumen_pedido' =>

                    $this->obtenerResumenPedido(

                        $pago->id_pedido

                    ),

            ];



        return response()->json(

            array_merge(

                [

                    'message' =>

                        'Pago registrado correctamente.',



                    'pago' =>

                        $pago,



                    'recibo' =>

                        $recibo,

                ],

                $resumen

            ),

            201

        );

    }



    /*

    |--------------------------------------------------------------------------

    | Anular pago

    |--------------------------------------------------------------------------

    |

    | No se edita un pago registrado.

    | Si existe un error, se anula y posteriormente se registra uno nuevo.

    |--------------------------------------------------------------------------

    */

    public function anular(

        AnularPagoRequest $request,

        int $id

    ): JsonResponse {

        $datos = $request->validated();



        $pago = DB::transaction(

            function () use ($request, $datos, $id) {

                $pago = Pago::query()

                    ->lockForUpdate()

                    ->find($id);



                if (!$pago) {

                    abort(

                        404,

                        'Pago no encontrado.'

                    );

                }



                if ($pago->estado === 'ANULADO') {

                    abort(

                        409,

                        'El pago ya se encuentra anulado.'

                    );

                }



                /*

                 \* Bloquear y validar la operación comercial

                 \* asociada al pago.

                 */

                if ($pago->id_venta !== null) {

                    Venta::query()

                        ->lockForUpdate()

                        ->find($pago->id_venta);

                } elseif ($pago->id_pedido !== null) {

                    $pedido = Pedido::query()

                        ->lockForUpdate()

                        ->find($pago->id_pedido);



                    if (!$pedido) {

                        abort(

                            404,

                            'El pedido asociado al pago no existe.'

                        );

                    }



                    /*

                     \* Un pedido entregado debe conservar saldo cero.

                     \* No se permite anular posteriormente uno de sus pagos.

                     */

                    if ($pedido->estado === 'ENTREGADO') {

                        abort(

                            409,

                            'No se puede anular un pago de un pedido ya entregado.'

                        );

                    }

                }



                /*

                 \* Si existe un recibo EMITIDO,

                 \* primero debe anularse el recibo.

                 */

                if (

                    $pago

                        ->recibos()

                        ->where(

                            'estado',

                            'EMITIDO'

                        )

                        ->exists()

                ) {

                    abort(

                        409,

                        'No se puede anular un pago que tiene un recibo emitido. Anule primero el recibo asociado.'

                    );

                }



                $pago->update([

                    'estado' =>

                        'ANULADO',



                    'id_usuario_anulacion' =>

                        $request->user()->getKey(),



                    'motivo_anulacion' =>

                        trim(

                            $datos['motivo_anulacion']

                        ),



                    'fecha_anulacion' =>

                        now(),

                ]);



                return $pago;

            }

        );



        $pago->load([

            'venta.cliente',

            'pedido.cliente',

            'usuario',

            'usuarioAnulacion',

        ]);



        if ($pago->id_venta !== null) {

            $resumen = [

                'resumen_venta' =>

                    $this->obtenerResumenVenta(

                        $pago->id_venta

                    ),

            ];

        } else {

            $resumen = [

                'resumen_pedido' =>

                    $this->obtenerResumenPedido(

                        $pago->id_pedido

                    ),

            ];

        }



        return response()->json(

            array_merge(

                [

                    'message' =>

                        'Pago anulado correctamente.',



                    'pago' =>

                        $pago,

                ],

                $resumen

            )

        );

    }



    /*

    |--------------------------------------------------------------------------

    | Resumen financiero de una venta

    |--------------------------------------------------------------------------

    */

    private function obtenerResumenVenta(

        int $idVenta

    ): array {

        $venta = Venta::query()

            ->findOrFail($idVenta);



        $totalVenta = round(

            (float) $venta->total,

            2

        );



        $totalPagado = round(

            (float) $venta

                ->pagos()

                ->where(

                    'estado',

                    'REGISTRADO'

                )

                ->sum('monto'),

            2

        );



        $saldo = round(

            $totalVenta -

            $totalPagado,

            2

        );



        return [

            'id_venta' =>

                $venta->id_venta,



            'total' =>

                number_format(

                    $totalVenta,

                    2,

                    '.',

                    ''

                ),



            'total_pagado' =>

                number_format(

                    $totalPagado,

                    2,

                    '.',

                    ''

                ),



            'saldo' =>

                number_format(

                    max(0, $saldo),

                    2,

                    '.',

                    ''

                ),



            'pagada_completa' =>

                $saldo <= 0,

        ];

    }



    /*

    |--------------------------------------------------------------------------

    | Resumen financiero de un pedido

    |--------------------------------------------------------------------------

    */

    private function obtenerResumenPedido(

        int $idPedido

    ): array {

        $pedido = Pedido::query()

            ->findOrFail($idPedido);



        $totalPedido = round(

            (float) $pedido->total,

            2

        );



        $totalPagado = round(

            (float) $pedido

                ->pagos()

                ->where(

                    'estado',

                    'REGISTRADO'

                )

                ->sum('monto'),

            2

        );



        $saldo = round(

            $totalPedido -

            $totalPagado,

            2

        );



        return [

            'id_pedido' =>

                $pedido->id_pedido,



            'total' =>

                number_format(

                    $totalPedido,

                    2,

                    '.',

                    ''

                ),



            'total_pagado' =>

                number_format(

                    $totalPagado,

                    2,

                    '.',

                    ''

                ),



            'saldo' =>

                number_format(

                    max(0, $saldo),

                    2,

                    '.',

                    ''

                ),



            'pagado_completo' =>

                $saldo <= 0,

        ];

    }

}
