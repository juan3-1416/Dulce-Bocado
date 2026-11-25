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
            'monto' => ['required', 'numeric', 'min:0.01'],
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