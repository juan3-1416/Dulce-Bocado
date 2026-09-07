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
    | Solo aparecen pagos:
    | - REGISTRADOS
    | - pertenecientes a ventas REGISTRADAS
    | - sin otro recibo EMITIDO
    |--------------------------------------------------------------------------
    */
    public function catalogos(): JsonResponse
    {
        $pagos = Pago::query()
            ->with([
                'venta.cliente',
                'pagoInternet',
            ])
            ->where(
                'estado',
                'REGISTRADO'
            )
            ->whereHas(
                'venta',
                fn ($query) =>
                    $query->where(
                        'estado',
                        'REGISTRADA'
                    )
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
                $venta = $pago->venta;

                $nombreCliente =
                    $this->obtenerNombreCliente(
                        $venta
                    );

                return [
                    'id_pago' =>
                        $pago->id_pago,

                    'id_venta' =>
                        $pago->id_venta,

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
                        $venta->cliente
                            ? $venta->cliente->ci_nit
                            : null,

                    'venta' =>
                        $venta,
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
                 * El bloqueo del pago serializa generación
                 * de recibos y futuras anulaciones.
                 */
                $pago = Pago::query()
                    ->with([
                        'venta.cliente',
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

                if (
                    $pago->estado !==
                    'REGISTRADO'
                ) {
                    throw ValidationException::withMessages([
                        'id_pago' =>
                            'No se puede generar un recibo para un pago anulado.',
                    ]);
                }

                if (!$pago->venta) {
                    throw ValidationException::withMessages([
                        'id_pago' =>
                            'El pago no tiene una venta válida asociada.',
                    ]);
                }

                if (
                    $pago->venta->estado !==
                    'REGISTRADA'
                ) {
                    throw ValidationException::withMessages([
                        'id_pago' =>
                            'No se puede generar un recibo porque la venta se encuentra anulada.',
                    ]);
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

                $venta = $pago->venta;

                $nombreCliente =
                    $this->obtenerNombreCliente(
                        $venta
                    );

                $ciNit =
                    $venta->cliente
                        ? $venta->cliente->ci_nit
                        : null;

                /*
                 * Snapshot del pago y cliente.
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
                 * Bloqueamos también el pago asociado.
                 */
                Pago::query()
                    ->lockForUpdate()
                    ->find(
                        $recibo->id_pago
                    );

                if (
                    $recibo->estado ===
                    'ANULADO'
                ) {
                    abort(
                        409,
                        'El recibo ya se encuentra anulado.'
                    );
                }

                /*
                 * Todos los campos se actualizan juntos para
                 * cumplir la restricción de auditoría.
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
    |
    | Cada vez que el usuario ordena imprimir desde el frontend,
    | este endpoint registra la operación.
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
                 * Permitimos imprimir también un recibo ANULADO
                 * para fines históricos.
                 *
                 * El frontend deberá mostrar claramente
                 * la marca "ANULADO".
                 */
                $nuevaCantidad =
                    $recibo->cantidad_impresiones + 1;

                /*
                 * Se actualizan los 3 campos juntos para
                 * satisfacer chk_recibo_impresion.
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
    | Obtener nombre del cliente
    |--------------------------------------------------------------------------
    */
    private function obtenerNombreCliente(
        $venta
    ): string {
        if ($venta->cliente) {
            $nombre = trim(
                ($venta->cliente->nombre ?? '') .
                ' ' .
                ($venta->cliente->apellido ?? '')
            );

            if ($nombre !== '') {
                return $nombre;
            }
        }

        $ocasional = trim(
            (string) (
                $venta->nombre_cliente_ocasional ??
                ''
            )
        );

        return $ocasional !== ''
            ? $ocasional
            : 'Cliente ocasional';
    }
}