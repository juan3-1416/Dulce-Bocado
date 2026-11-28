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

        // 5. Enviar el mismo PDF mediante el transporte correspondiente.
        $nombreArchivo = $archivoInfo['nombre_archivo'];

        $enviados = [];
        $fallidos = [];
        $detalleEnvios = [];

        foreach ($destinatarios as $destinatario) {
            $dominio = strtolower(
                substr(strrchr($destinatario, '@'), 1)
            );

            $esInterno = in_array(
                $dominio,
                ['mail.tecnoweb', 'tecnoweb'],
                true
            );

            $mailer = $esInterno ? 'smtp' : 'gmail';
            $servidor = $esInterno ? 'Tecnoweb' : 'Gmail';

            try {
                if ($esInterno) {
                    $remitente = config('mail.from.address');
                    $nombreRemitente = config(
                        'mail.from.name',
                        'Dulce Bocado'
                    );
                } else {
                    if (
                        empty(config('mail.mailers.gmail.username')) ||
                        empty(config('mail.mailers.gmail.password')) ||
                        empty(config('mail.mailers.gmail.from.address'))
                    ) {
                        throw new \RuntimeException(
                            'El servidor SMTP externo no esta configurado.'
                        );
                    }

                    $remitente = config(
                        'mail.mailers.gmail.from.address'
                    );

                    $nombreRemitente = config(
                        'mail.mailers.gmail.from.name',
                        'Dulce Bocado'
                    );
                }

                Mail::mailer($mailer)->send(
                    'emails.reporte',
                    [
                        'titulo' => $titulo,
                        'tipo' => $tipo,
                        'reporte' => $reporte,
                    ],
                    function ($message) use (
                        $destinatario,
                        $remitente,
                        $nombreRemitente,
                        $contenidoPdf,
                        $nombreArchivo,
                        $titulo
                    ) {
                        $message
                            ->from($remitente, $nombreRemitente)
                            ->to($destinatario)
                            ->subject('Dulce Bocado - ' . $titulo)
                            ->attachData(
                                $contenidoPdf,
                                $nombreArchivo,
                                ['mime' => 'application/pdf']
                            );
                    }
                );

                $enviados[] = $destinatario;

                $detalleEnvios[] = [
                    'correo' => $destinatario,
                    'servidor' => $servidor,
                    'estado' => 'ENVIADO',
                ];

            } catch (Throwable $e) {
                report($e);

                $fallidos[] = $destinatario;

                $detalleEnvios[] = [
                    'correo' => $destinatario,
                    'servidor' => $servidor,
                    'estado' => 'FALLIDO',
                ];
            }
        }

        $exito = empty($fallidos);
        $parcial = !empty($enviados) && !empty($fallidos);

        $errorResumen = $exito
            ? null
            : sprintf(
                'Correos enviados: %d. Correos fallidos: %d.',
                count($enviados),
                count($fallidos)
            );

        if ($envio) {
            try {
                $envio->update([
                    'estado' => $exito
                        ? ReporteEnvio::ESTADO_ENVIADO
                        : ReporteEnvio::ESTADO_FALLIDO,
                    'error_mensaje' => $errorResumen,
                ]);
            } catch (Throwable $e) {
                report($e);
            }
        }

        if ($exito) {
            $mensaje = 'Reporte generado y enviado correctamente.';
        } elseif ($parcial) {
            $mensaje = 'Reporte enviado parcialmente. Fallaron: '
                . implode(', ', $fallidos);
        } else {
            $mensaje = 'El reporte fue generado y guardado, pero no pudo enviarse por correo.';
        }

        return [
            'message' => $mensaje,
            'envio' => $exito,
            'envio_parcial' => $parcial,
            'tipo' => $tipo,
            'correos' => $destinatarios,
            'correos_enviados' => $enviados,
            'correos_fallidos' => $fallidos,
            'detalle_envios' => $detalleEnvios,
            'archivo' => $nombreArchivo,
            'ruta_guardada' => $archivoInfo['ruta_relativa'],
            'error' => $errorResumen,
            'id_envio' => $envio?->id_envio,
        ];
    }
}
