<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePagoEfectivoRequest;
use App\Models\Pago;
use App\Services\Pagos\OrigenPagoService;
use App\Services\Pagos\PagoEfectivoService;
use App\Services\Pagos\PagoException;
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
}