<?php

namespace App\Services;

use App\Models\ReporteEnvio;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ReporteMailService
{
    public function __construct(
        protected ReportePdfService $pdfService
    ) {}

    /**
     * Procesa la deduplicación, archivo y envío del reporte por correo electrónico.
     */
    public function enviarReporte(
        string $tipo,
        array $reporte,
        array $correos,
        ?int $idUsuario = null,
        ?string $idempotencyKey = null
    ): array {
        // 1. Deduplicar correos
        $destinatarios = array_values(array_unique(array_filter($correos, fn ($c) => filter_var($c, FILTER_VALIDATE_EMAIL))));

        if (empty($destinatarios)) {
            throw new \InvalidArgumentException('Debe proporcionar al menos un correo electrónico válido.');
        }

        // 2. Comprobar idempotencia si se envía la clave
        if ($idempotencyKey) {
            $previo = ReporteEnvio::where('idempotency_key', $idempotencyKey)->first();
            if ($previo && $previo->estado === ReporteEnvio::ESTADO_ENVIADO) {
                return [
                    'message' => 'Reporte ya enviado previamente (idempotente).',
                    'envio' => true,
                    'tipo' => $tipo,
                    'correos' => $previo->destinatarios,
                    'archivo' => basename($previo->archivo_pdf ?? ''),
                    'ruta_guardada' => $previo->archivo_pdf,
                    'id_envio' => $previo->id_envio,
                ];
            }
        }

        // 3. Generar y archivar PDF en disco antes del intento de envío SMTP
        $contenidoPdf = $this->pdfService->generarPdfBinario($reporte);
        $archivoInfo = $this->pdfService->guardarEnDisco($tipo, $contenidoPdf);
        $titulo = $reporte['titulo'] ?? ('Reporte de ' . ucfirst($tipo));

        // 4. Registrar en base de datos estado inicial
        $envio = null;
        try {
            $envio = ReporteEnvio::create([
                'id_usuario' => $idUsuario,
                'destinatarios' => $destinatarios,
                'filtros' => $reporte['filtros'] ?? [],
                'tipo_reporte' => $tipo,
                'titulo' => $titulo,
                'archivo_pdf' => $archivoInfo['nombre_archivo'],
                'ruta_guardada' => $archivoInfo['ruta_relativa'],
                'estado' => ReporteEnvio::ESTADO_GENERADO,
                'idempotency_key' => $idempotencyKey,
            ]);
        } catch (Throwable $e) {
            // Continuar incluso si la BD de auditoría estuviera temporalmente inaccesible
            report($e);
        }

        // 5. Enviar correo vía SMTP / Mailer configurado
        try {
            $nombreArchivo = $archivoInfo['nombre_archivo'];

            Mail::send(
                'emails.reporte',
                [
                    'titulo' => $titulo,
                    'tipo' => $tipo,
                    'reporte' => $reporte,
                ],
                function ($message) use ($destinatarios, $contenidoPdf, $nombreArchivo, $titulo) {
                    $message
                        ->to($destinatarios)
                        ->subject('Dulce Bocado - ' . $titulo)
                        ->attachData($contenidoPdf, $nombreArchivo, [
                            'mime' => 'application/pdf',
                        ]);
                }
            );

            // Actualizar estado a ENVIADO
            if ($envio) {
                $envio->update([
                    'estado' => ReporteEnvio::ESTADO_ENVIADO,
                ]);
            }

            return [
                'message' => 'Reporte generado y enviado correctamente.',
                'envio' => true,
                'tipo' => $tipo,
                'correos' => $destinatarios,
                'archivo' => $nombreArchivo,
                'ruta_guardada' => $archivoInfo['ruta_relativa'],
                'id_envio' => $envio?->id_envio,
            ];
        } catch (Throwable $e) {
            report($e);

            // Actualizar estado a FALLIDO
            if ($envio) {
                $envio->update([
                    'estado' => ReporteEnvio::ESTADO_FALLIDO,
                    'error_mensaje' => $e->getMessage(),
                ]);
            }

            return [
                'message' => 'El reporte fue generado y guardado, pero no pudo enviarse por correo.',
                'envio' => false,
                'tipo' => $tipo,
                'correos' => $destinatarios,
                'archivo' => $archivoInfo['nombre_archivo'],
                'ruta_guardada' => $archivoInfo['ruta_relativa'],
                'error' => $e->getMessage(),
                'id_envio' => $envio?->id_envio,
            ];
        }
    }
}
