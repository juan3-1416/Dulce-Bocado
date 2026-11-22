<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ReportePdfService
{
    /**
     * Genera el PDF en memoria con orientación horizontal (landscape) y tamaño A4.
     */
    public function generarPdfBinario(array $reporte): string
    {
        try {
            if (class_exists(Pdf::class)) {
                $pdf = Pdf::loadView('reportes.reporte-pdf', [
                    'reporte' => $reporte,
                ])->setPaper('a4', 'landscape');

                return $pdf->output();
            }
        } catch (Throwable $e) {
            report($e);
        }

        // Respaldo simple si Dompdf no estuviera instanciado en entorno mínimo
        return $this->generarPdfFallback($reporte);
    }

    /**
     * Guarda una copia física del PDF en disco antes del envío para trazabilidad y tolerancia a fallos.
     */
    public function guardarEnDisco(string $tipo, string $contenidoPdf): array
    {
        $nombreArchivo = sprintf(
            'reporte_%s_%s_%s.pdf',
            $tipo,
            now()->format('Ymd_His'),
            bin2hex(random_bytes(3))
        );

        $rutaRelativa = 'reportes/' . $nombreArchivo;

        Storage::disk('local')->put($rutaRelativa, $contenidoPdf);

        return [
            'nombre_archivo' => $nombreArchivo,
            'ruta_relativa' => $rutaRelativa,
            'ruta_absoluta' => Storage::disk('local')->path($rutaRelativa),
            'tamanio_bytes' => strlen($contenidoPdf),
        ];
    }

    private function generarPdfFallback(array $reporte): string
    {
        // En caso excepcional, generar HTML o documento plano
        $html = view('reportes.reporte-pdf', ['reporte' => $reporte])->render();
        return "%PDF-1.4\n%Fallback PDF\n" . $html;
    }
}
