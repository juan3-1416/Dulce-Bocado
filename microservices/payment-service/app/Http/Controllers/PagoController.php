<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePagoEfectivoRequest;
use App\Models\Pago;
use App\Services\Pagos\OrigenPagoService;
use App\Services\Pagos\PagoEfectivoService;
use App\Services\Pagos\PagoException;
use App\Services\Pagos\PagoQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PagoController extends Controller
{
    public function storeEfectivo(
        StorePagoEfectivoRequest $request,
        PagoEfectivoService $service
    ): JsonResponse {
        $clave = $request->header(
            'Idempotency-Key'
        );

        if (
            !is_string($clave) ||
            preg_match(
                '/^[A-Za-z0-9_-]{16,128}$/D',
                $clave
            ) !== 1
        ) {
            throw new PagoException(
                422,
                'CLAVE_IDEMPOTENTE_REQUERIDA',
                'Envíe Idempotency-Key de 16 a 128 caracteres.'
            );
        }

        $resultado = $service->registrar(
            $request->validated(),
            (int) $request->attributes->get(
                'id_usuario_autenticado'
            ),
            $clave,
            (string) $request->bearerToken()
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }

    public function index(
        Request $request,
        OrigenPagoService $origenes
    ): JsonResponse {
        /*
        |--------------------------------------------------------------------------
        | Resumen general de operaciones con pagos
        |--------------------------------------------------------------------------
        |
        | Cuando no se especifica origen/origen_id, devuelve una vista consolidada
        | de ventas y pedidos que ya poseen al menos un pago registrado.
        |
        */
        if (
            !$request->filled('origen')
            && !$request->filled('origen_id')
        ) {
            return $this->resumenGeneral($request);
        }

        $request->merge([
            'origen' => strtoupper(
                (string) $request->query(
                    'origen'
                )
            ),
        ]);

        $datos = $request->validate([
            'origen' => [
                'required',
                'in:VENTA,PEDIDO',
            ],
            'origen_id' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        $tipo = $datos['origen'];
        $origenId = (int) $datos['origen_id'];

        $origen = $origenes->obtener(
            $tipo,
            $origenId,
            (string) $request->bearerToken(),
            false
        );

        $pagos = Pago::query()
            ->where(
                'origen_tipo',
                $tipo
            )
            ->where(
                'origen_id',
                $origenId
            )
            ->orderBy('id_pago')
            ->get();

        $pagado = bcadd(
            (string) DB::table('pago')
                ->where(
                    'origen_tipo',
                    $tipo
                )
                ->where(
                    'origen_id',
                    $origenId
                )
                ->where(
                    'estado',
                    'CONFIRMADO'
                )
                ->sum('monto'),
            '0',
            2
        );

        $saldo = bcsub(
            $origen['total'],
            $pagado,
            2
        );

        return response()->json([
            'origen_tipo' => $tipo,
            'origen_id' => $origenId,
            'estado_origen' =>
                $origen['estado'],
            'total' =>
                $origen['total'],
            'pagado' =>
                $pagado,
            'saldo' =>
                $saldo,
            'moneda' =>
                $origen['moneda'],
            'pagos' =>
                $pagos,
        ]);
    }

    private function resumenGeneral(
        Request $request
    ): JsonResponse {
        $request->merge([
            'tipo' => strtoupper(
                (string) $request->query(
                    'tipo',
                    ''
                )
            ),
        ]);

        $filtros = $request->validate([
            'tipo' => [
                'nullable',
                'in:VENTA,PEDIDO',
            ],
            'page' => ['sometimes', 'integer', 'min:1', 'max:2147483647'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $usarPaginacion = $request->has('page')
            || $request->has('per_page');

        $pagina = (int) ($filtros['page'] ?? 1);
        $porPagina = (int) ($filtros['per_page'] ?? 15);

        $query = DB::table('pago')
            ->select([
                'origen_tipo',
                'origen_id',
            ])
            ->selectRaw(
                'MAX(total_origen_snapshot) AS total'
            )
            ->selectRaw(
                "
                SUM(
                    CASE
                        WHEN estado = 'CONFIRMADO'
                        THEN monto
                        ELSE 0
                    END
                ) AS pagado
                "
            )
            ->selectRaw(
                "
                COUNT(
                    CASE
                        WHEN estado = 'CONFIRMADO'
                        THEN 1
                    END
                ) AS cantidad_pagos_confirmados
                "
            )
            ->selectRaw(
                'COUNT(*) AS cantidad_pagos'
            )
            ->selectRaw(
                "
                MAX(
                    COALESCE(
                        confirmado_at,
                        created_at
                    )
                ) AS ultimo_pago_at
                "
            );

        if ($request->filled('tipo')) {
            $query->where(
                'origen_tipo',
                $request->input('tipo')
            );
        }

        $agrupadas = $query->groupBy(
            'origen_tipo',
            'origen_id'
        );

        $totales = DB::query()
            ->fromSub(clone $agrupadas, 'operaciones')
            ->selectRaw("
                COUNT(*) AS cantidad_operaciones,
                COALESCE(SUM(total), 0) AS total_operaciones,
                COALESCE(SUM(pagado), 0) AS total_pagado,
                COALESCE(SUM(
                    COALESCE(total, 0) - COALESCE(pagado, 0)
                ), 0) AS saldo_pendiente,
                COUNT(CASE
                    WHEN pagado <> 0
                    AND COALESCE(total, 0) - pagado <= 0
                    THEN 1
                END) AS pagadas,
                COUNT(CASE
                    WHEN pagado <> 0
                    AND COALESCE(total, 0) - pagado > 0
                    THEN 1
                END) AS parciales
            ")
            ->first();

        $totalOperaciones = (int) $totales->cantidad_operaciones;

        $ultimaPagina = max(
            1,
            (int) ceil($totalOperaciones / $porPagina)
        );

        $consulta = (clone $agrupadas)
            ->orderByDesc('ultimo_pago_at')
            ->orderBy('origen_tipo')
            ->orderByDesc('origen_id');

        if ($usarPaginacion) {
            $filas = $pagina <= $ultimaPagina
                ? $consulta->forPage($pagina, $porPagina)->get()
                : collect();
        } else {
            $filas = $consulta->get();
        }

        $operaciones = $filas
            ->map(function ($fila) {
                $total = number_format(
                    (float) $fila->total,
                    2,
                    '.',
                    ''
                );

                $pagado = number_format(
                    (float) $fila->pagado,
                    2,
                    '.',
                    ''
                );

                $saldo = bcsub(
                    $total,
                    $pagado,
                    2
                );

                if (
                    bccomp(
                        $pagado,
                        '0.00',
                        2
                    ) === 0
                ) {
                    $estadoPago = 'PENDIENTE';
                } elseif (
                    bccomp(
                        $saldo,
                        '0.00',
                        2
                    ) <= 0
                ) {
                    $estadoPago = 'PAGADO';
                } else {
                    $estadoPago = 'PARCIAL';
                }

                return [
                    'origen_tipo' =>
                        $fila->origen_tipo,

                    'origen_id' =>
                        (int) $fila->origen_id,

                    'total' =>
                        $total,

                    'pagado' =>
                        $pagado,

                    'saldo' =>
                        $saldo,

                    'estado_pago' =>
                        $estadoPago,

                    'cantidad_pagos' =>
                        (int) $fila->cantidad_pagos,

                    'cantidad_pagos_confirmados' =>
                        (int) $fila
                            ->cantidad_pagos_confirmados,

                    'ultimo_pago_at' =>
                        $fila->ultimo_pago_at,
                ];
            })
            ->values();

        $respuesta = [
            'resumen' => [
                'cantidad_operaciones' => $totalOperaciones,
                'total_operaciones' => bcadd(
                    (string) $totales->total_operaciones, '0', 2
                ),
                'total_pagado' => bcadd(
                    (string) $totales->total_pagado, '0', 2
                ),
                'saldo_pendiente' => bcadd(
                    (string) $totales->saldo_pendiente, '0', 2
                ),
                'pagadas' => (int) $totales->pagadas,
                'parciales' => (int) $totales->parciales,
            ],

            'operaciones' => $operaciones,
        ];

        if ($usarPaginacion) {
            $respuesta['paginacion'] = [
                'current_page' => $pagina,
                'last_page' => $ultimaPagina,
                'per_page' => $porPagina,
                'total' => $totalOperaciones,
            ];
        }

        return response()->json($respuesta);
    }
    public function storeQr(
        Request $request,
        PagoQrService $service
    ): JsonResponse {
        $clave = $request->header('Idempotency-Key');

        if (
            !is_string($clave) ||
            preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $clave) !== 1
        ) {
            throw new PagoException(
                422,
                'CLAVE_IDEMPOTENTE_REQUERIDA',
                'Envíe Idempotency-Key de 16 a 128 caracteres.'
            );
        }

        $datos = $request->validate([
            'origen_tipo' => ['required', 'in:VENTA,PEDIDO'],
            'origen_id' => ['required', 'integer', 'min:1'],
            'monto' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99', 'regex:/^\d+(?:\.\d{1,2})?$/D'],
            'moneda' => ['sometimes', 'in:BOB'],
        ]);

        $actorId = (int) $request->attributes->get('id_usuario_autenticado');
        $token = (string) $request->bearerToken();

        $resultado = $service->iniciar(
            $datos,
            $actorId,
            $clave,
            $token
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }

    public function showQr(
        int $id,
        PagoQrService $service
    ): JsonResponse {
        $intento = $service->consultar($id);

        return response()->json([
            'intento_qr' => $intento,
        ]);
    }

    public function callbackQr(
        Request $request,
        PagoQrService $service
    ): mixed {
        $resultado = $service->procesarCallback($request->all());

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($resultado);
        }

        $estado = $resultado['estado'] ?? 'CONFIRMADA';
        $esAprobado = ($estado === 'CONFIRMADA');

        $html = '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Aviso de Pago - Dulce Bocado</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #111827; }
    .card { background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    h1 { font-size: 20px; margin-bottom: 8px; color: ' . ($esAprobado ? '#166534' : '#991b1b') . '; }
    p { font-size: 14px; color: #4b5563; }
    .btn { display: inline-block; margin-top: 20px; background: #111827; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>' . ($esAprobado ? '¡Pago Confirmado!' : 'Operación no completada') . '</h1>
    <p>' . htmlspecialchars($resultado['mensaje'] ?? 'El aviso de pago fue procesado.') . '</p>
    <a href="javascript:window.close()" class="btn">Cerrar esta ventana</a>
  </div>
</body>
</html>';

        return response($html, 200, ['Content-Type' => 'text/html']);
    }
}