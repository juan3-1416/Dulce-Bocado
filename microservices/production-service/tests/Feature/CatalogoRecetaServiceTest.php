<?php

namespace Tests\Feature;

use App\Services\Catalogo\CatalogoRecetaException;
use App\Services\Catalogo\CatalogoRecetaService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CatalogoRecetaServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.catalog.url', 'http://catalog-service:8000');
        config()->set('services.catalog.key', 'clave-de-prueba');
    }

    public function test_normaliza_la_receta_real_sin_convertir_decimales_a_float(): void
    {
        Http::fake(['catalog-service:8000/*' => Http::response($this->receta(), 200)]);

        $resultado = app(CatalogoRecetaService::class)->obtenerParaProduccion(2, 7);

        $this->assertSame([
            'receta_id' => 1,
            'presentacion_id' => 2,
            'unidad_terminado' => 'unidad',
            'ingredientes' => [[
                'materia_prima_id' => 3,
                'cantidad_por_unidad' => '0.125',
                'unidad' => 'g',
            ]],
        ], $resultado);

        Http::assertSent(fn ($request) =>
            $request->url() === 'http://catalog-service:8000/api/presentaciones/2/receta' &&
            $request->hasHeader('X-Internal-Service-Key', 'clave-de-prueba') &&
            $request->hasHeader('X-Actor-User-Id', '7')
        );
    }

    public function test_rechaza_insumo_inactivo_sin_normalizar_una_produccion(): void
    {
        $respuesta = $this->receta();
        $respuesta['receta']['detalles'][0]['materia_prima']['estado'] = false;
        Http::fake(['catalog-service:8000/*' => Http::response($respuesta, 200)]);

        try {
            app(CatalogoRecetaService::class)->obtenerParaProduccion(2, 7);
            $this->fail('Debió rechazar la materia prima inactiva.');
        } catch (CatalogoRecetaException $e) {
            $this->assertSame(409, $e->httpStatus);
            $this->assertSame('INSUMO_INACTIVO', $e->codigo);
        }
    }

    public function test_rechaza_cantidad_invalida_y_no_redondea_ingredientes(): void
    {
        $respuesta = $this->receta();
        $respuesta['receta']['detalles'][0]['cantidad'] = '0.0001';
        Http::fake(['catalog-service:8000/*' => Http::response($respuesta, 200)]);

        try {
            app(CatalogoRecetaService::class)->obtenerParaProduccion(2, 7);
            $this->fail('Debió rechazar la precisión incompatible.');
        } catch (CatalogoRecetaException $e) {
            $this->assertSame(503, $e->httpStatus);
            $this->assertSame('RESPUESTA_CATALOGO_INVALIDA', $e->codigo);
        }
    }

    private function receta(): array
    {
        return ['receta' => [
            'id_receta' => 1,
            'presentacion_id' => 2,
            'estado' => true,
            'presentacion' => [
                'presentacion_id' => 2,
                'disponible' => true,
                'producto' => ['estado' => true],
            ],
            'detalles' => [[
                'id_materia_prima' => 3,
                'cantidad' => '0.125',
                'materia_prima' => [
                    'id_materia_prima' => 3,
                    'unidad_medida' => 'g',
                    'estado' => true,
                ],
            ]],
        ]];
    }
}
