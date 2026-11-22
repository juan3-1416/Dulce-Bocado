<?php

namespace Tests\Feature;

use App\Services\DashboardAggregatorService;
use App\Services\ReporteDataService;
use App\Services\ReporteMailService;
use App\Services\ReportePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReporteServiceTest extends TestCase
{
    public function test_health_check_endpoint(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'service' => 'report-service',
            ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $response = $this->getJson('/api/dashboard/resumen');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'TOKEN_REQUERIDO');
    }

    public function test_reporte_deduplicates_emails_and_saves_pdf(): void
    {
        Storage::fake('local');
        Mail::fake();

        $pdfService = new ReportePdfService();
        $mailService = new ReporteMailService($pdfService);

        $reporteMock = [
            'tipo' => 'ventas',
            'titulo' => 'Reporte de Ventas Test',
            'filtros' => ['fecha_desde' => '2026-11-01', 'fecha_hasta' => '2026-11-22'],
            'resumen' => ['cantidad_registros' => 1, 'total_ventas' => 150.0],
            'datos' => [
                [
                    'id_venta' => 1,
                    'fecha_venta' => '2026-11-20 14:00:00',
                    'cliente' => 'Juan Perez',
                    'vendedor' => 'Admin',
                    'estado' => 'REGISTRADA',
                    'total' => 150.0,
                    'detalles' => [],
                ],
            ],
        ];

        // Enviar con correos duplicados
        $correos = [
            'test@dulcebocado.com',
            'test@dulcebocado.com',
            'gerencia@dulcebocado.com',
        ];

        $resultado = $mailService->enviarReporte(
            'ventas',
            $reporteMock,
            $correos,
            1,
            'idemp-test-123'
        );

        $this->assertTrue($resultado['envio']);
        $this->assertCount(2, $resultado['correos']);
        $this->assertContains('test@dulcebocado.com', $resultado['correos']);
        $this->assertContains('gerencia@dulcebocado.com', $resultado['correos']);
        $this->assertTrue(Storage::disk('local')->exists($resultado['ruta_guardada']));
    }
}
