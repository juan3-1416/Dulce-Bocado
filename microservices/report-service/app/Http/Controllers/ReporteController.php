<?php

namespace App\Http\Controllers;

use App\Models\ReporteEnvio;
use App\Services\ReporteDataService;
use App\Services\ReporteMailService;
use App\Services\ReportePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReporteController extends Controller
{
    public function __construct(
        protected ReporteDataService $dataService,
        protected ReportePdfService $pdfService,
        protected ReporteMailService $mailService
    ) {}

    /**
     * Reporte de Ventas en formato JSON para la vista interactiva.
     */
    public function ventas(Request $request): JsonResponse
    {
        $request->validate([
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
            'estado' => ['nullable', 'string', 'max:50'],
            'id_cliente' => ['nullable', 'integer'],
            'id_usuario' => ['nullable', 'integer'],
        ]);

        $token = $request->bearerToken() ?? '';
        $reporte = $this->dataService->obtenerReporteVentas($request->all(), $token);

        return response()->json($reporte);
    }

    /**
     * Reporte de Pedidos en formato JSON.
     */
    public function pedidos(Request $request): JsonResponse
    {
        $request->validate([
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
            'estado' => ['nullable', 'string', 'max:50'],
            'id_cliente' => ['nullable', 'integer'],
        ]);

        $token = $request->bearerToken() ?? '';
        $reporte = $this->dataService->obtenerReportePedidos($request->all(), $token);

        return response()->json($reporte);
    }

    /**
     * Reporte de Inventario en formato JSON.
     */
    public function inventario(Request $request): JsonResponse
    {
        $request->validate([
            'id_almacen' => ['nullable', 'integer'],
            'tipo' => ['nullable', 'string', 'in:materia_prima,producto'],
            'stock_critico' => ['nullable', 'boolean'],
        ]);

        $token = $request->bearerToken() ?? '';
        $reporte = $this->dataService->obtenerReporteInventario($request->all(), $token);

        return response()->json($reporte);
    }

    /**
     * Descarga de reporte en formato PDF (Landscape A4).
     */
    public function pdf(Request $request, string $tipo): Response|JsonResponse
    {
        if (!in_array($tipo, ['ventas', 'pedidos', 'inventario'], true)) {
            return response()->json(['message' => 'Tipo de reporte no válido.'], 404);
        }

        $token = $request->bearerToken() ?? '';
        $reporte = $this->dataService->obtenerDatosReporte($tipo, $request->all(), $token);
        $contenidoPdf = $this->pdfService->generarPdfBinario($reporte);

        $nombreArchivo = sprintf('reporte_%s_%s.pdf', $tipo, now()->format('Ymd_His'));

        return response($contenidoPdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $nombreArchivo . '"',
        ]);
    }

    /**
     * Envío del reporte por correo electrónico a múltiples destinatarios con adjunto PDF.
     */
    public function enviar(Request $request, string $tipo): JsonResponse
    {
        $request->validate([
            'correos' => ['required', 'array', 'min:1'],
            'correos.*' => ['required', 'email'],
        ]);

        if (!in_array($tipo, ['ventas', 'pedidos', 'inventario'], true)) {
            return response()->json(['message' => 'Tipo de reporte no válido.'], 404);
        }

        $token = $request->bearerToken() ?? '';
        $reporte = $this->dataService->obtenerDatosReporte($tipo, $request->all(), $token);

        $usuarioAutenticado = $request->attributes->get('usuario_autenticado');
        $idUsuario = $usuarioAutenticado['id_usuario'] ?? null;
        $idempotencyKey = $request->header('X-Idempotency-Key') ?? $request->input('idempotency_key');

        $resultado = $this->mailService->enviarReporte(
            $tipo,
            $reporte,
            $request->input('correos'),
            $idUsuario,
            $idempotencyKey
        );

        $codigoHttp = ($resultado['envio'] ?? false) ? 200 : 503;

        return response()->json($resultado, $codigoHttp);
    }

    /**
     * Consulta el estado de una orden de envío de reporte.
     */
    public function estadoEnvio(int $id): JsonResponse
    {
        $envio = ReporteEnvio::find($id);

        if (!$envio) {
            return response()->json(['message' => 'Envío no encontrado.'], 404);
        }

        return response()->json([
            'id' => $envio->id_envio,
            'estado' => $envio->estado,
            'destinatarios' => $envio->destinatarios,
            'tipo_reporte' => $envio->tipo_reporte,
            'archivo_pdf' => $envio->archivo_pdf,
            'ruta_guardada' => $envio->ruta_guardada,
            'error_mensaje' => $envio->error_mensaje,
            'created_at' => $envio->created_at,
        ]);
    }
}
