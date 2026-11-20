<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnularReciboRequest;
use App\Http\Requests\StoreReciboRequest;
use App\Services\Pagos\PagoException;
use App\Services\Recibos\ReciboPdfService;
use App\Services\Recibos\ReciboService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReciboController extends Controller
{
    public function index(
        Request $request,
        ReciboService $service
    ): JsonResponse {
        $filtros = $request->only([
            'buscar',
            'estado',
            'metodo_pago',
        ]);

        $resultado = $service->listar($filtros);

        return response()->json($resultado);
    }

    public function catalogos(
        ReciboService $service
    ): JsonResponse {
        $resultado = $service->catalogos();

        return response()->json($resultado);
    }

    public function show(
        int $id,
        ReciboService $service
    ): JsonResponse {
        $recibo = $service->obtener($id);

        return response()->json([
            'recibo' => $recibo,
        ]);
    }

    public function pdf(
        int $id,
        ReciboService $service,
        ReciboPdfService $pdfService
    ): Response {
        $recibo = $service->obtener($id);
        $contenidoPdf = $pdfService->generar($recibo);

        $nombreArchivo = 'recibo-' . ($recibo->numero ?: ('REC-' . $recibo->id_recibo)) . '.pdf';

        return response($contenidoPdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $nombreArchivo . '"',
            'Content-Length' => strlen($contenidoPdf),
            'Cache-Control' => 'no-cache, private',
        ]);
    }

    public function store(
        StoreReciboRequest $request,
        ReciboService $service
    ): JsonResponse {
        $clave = $this->validarClaveIdempotencia($request);

        $actorId = (int) $request->attributes->get('id_usuario_autenticado');
        $token = (string) $request->bearerToken();

        $resultado = $service->generar(
            $request->validated(),
            $actorId,
            $clave,
            $token
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }

    public function anular(
        AnularReciboRequest $request,
        int $id,
        ReciboService $service
    ): JsonResponse {
        $clave = $request->header('Idempotency-Key');

        if (
            !is_string($clave) ||
            preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $clave) !== 1
        ) {
            $clave = 'anular-rec-' . $id . '-' . substr(sha1((string) $request->user()?->id . '-' . $request->input('motivo_anulacion')), 0, 16);
        }

        $actorId = (int) $request->attributes->get('id_usuario_autenticado');

        $resultado = $service->anular(
            $id,
            (string) $request->validated('motivo_anulacion'),
            $actorId,
            $clave
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }

    public function imprimir(
        Request $request,
        int $id,
        ReciboService $service
    ): JsonResponse {
        $actorId = (int) $request->attributes->get('id_usuario_autenticado');

        $recibo = $service->registrarImpresion($id, $actorId);

        return response()->json([
            'message' => $recibo->cantidad_impresiones === 1
                ? 'Impresión registrada correctamente.'
                : 'Reimpresión registrada correctamente.',
            'recibo' => $recibo,
        ]);
    }

    private function validarClaveIdempotencia(Request $request): string
    {
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

        return $clave;
    }
}
