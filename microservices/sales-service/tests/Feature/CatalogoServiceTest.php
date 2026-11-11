<?php

namespace Tests\Feature;

use App\Services\Catalogo\CatalogoService;
use App\Services\Catalogo\CatalogoServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CatalogoServiceTest extends TestCase
{
    private CatalogoService $catalogo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->catalogo = new CatalogoService();
        config()->set('services.catalog.url', 'http://catalog-service:8000');
        config()->set('services.catalog.key', 'clave-de-prueba');
        config()->set('services.catalog.timeout', 3);
        Http::preventStrayRequests();
    }

    private function presentacion(array $cambios = []): array
    {
        return ['presentacion' => array_replace([
            'presentacion_id' => 15,
            'nombre' => 'Torta mediana',
            'precio' => '120.00',
            'moneda' => 'BOB',
            'disponible' => true,
            'permite_personalizacion' => true,
        ], $cambios)];
    }

    private function assertFallo(callable $operacion, int $estado, string $codigo): void
    {
        try {
            $operacion();
            $this->fail('Se esperaba un rechazo de Catalog.');
        } catch (CatalogoServiceException $error) {
            $this->assertSame($estado, $error->httpStatus);
            $this->assertSame($codigo, $error->codigo);
        }
    }

    public function test_obtiene_snapshot_comercial_sin_consultar_stock(): void
    {
        Http::fake(['*' => Http::response($this->presentacion())]);

        $this->assertSame([
            'presentacion_id' => 15,
            'nombre_presentacion_snapshot' => 'Torta mediana',
            'precio_unitario_snapshot' => '120.00',
            'moneda' => 'BOB',
            'permite_personalizacion' => true,
        ], $this->catalogo->obtenerPresentacionVendible(15, 17, 'Mensaje corto'));

        Http::assertSent(fn ($peticion) =>
            $peticion->url() === 'http://catalog-service:8000/api/presentaciones/15' &&
            $peticion->method() === 'GET' &&
            $peticion->hasHeader('X-Internal-Service-Key', 'clave-de-prueba') &&
            $peticion->hasHeader('X-Actor-User-Id', '17') &&
            !$peticion->hasHeader('Authorization'));
    }

    public function test_acepta_precio_cero_sin_convertirlo_a_float(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['precio' => '0.00']))]);
        $this->assertSame('0.00', $this->catalogo->obtenerPresentacionVendible(15, 17)['precio_unitario_snapshot']);
    }

    public function test_rechaza_presentacion_inexistente(): void
    {
        Http::fake(['*' => Http::response([], 404)]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 404, 'PRESENTACION_NO_ENCONTRADA');
    }

    public function test_rechaza_presentacion_no_disponible(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['disponible' => false]))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 409, 'PRESENTACION_NO_DISPONIBLE');
    }

    public function test_rechaza_personalizacion_no_permitida(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['permite_personalizacion' => false]))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17, 'Mensaje'), 409, 'PERSONALIZACION_NO_PERMITIDA');
    }

    public function test_rechaza_precio_negativo_en_respuesta(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['precio' => '-1.00']))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'RESPUESTA_CATALOGO_INVALIDA');
    }

    public function test_rechaza_precio_float_en_respuesta(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['precio' => 120.00]))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'RESPUESTA_CATALOGO_INVALIDA');
    }

    public function test_rechaza_id_de_presentacion_distinto(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['presentacion_id' => 99]))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'RESPUESTA_CATALOGO_INVALIDA');
    }

    public function test_rechaza_moneda_ajena(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['moneda' => 'USD']))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'RESPUESTA_CATALOGO_INVALIDA');
    }

    public function test_rechaza_disponibilidad_no_booleana(): void
    {
        Http::fake(['*' => Http::response($this->presentacion(['disponible' => 'si']))]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'RESPUESTA_CATALOGO_INVALIDA');
    }

    public function test_falla_cerrado_si_catalog_no_responde(): void
    {
        Http::fake(fn () => throw new ConnectionException('Sin conexión'));
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'CATALOGO_NO_DISPONIBLE');
    }

    public function test_falla_cerrado_ante_error_remoto(): void
    {
        Http::fake(['*' => Http::response([], 403)]);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'CATALOGO_NO_DISPONIBLE');
    }

    public function test_falla_cerrado_sin_credencial_catalog(): void
    {
        Http::fake();
        config()->set('services.catalog.key', null);
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 17), 503, 'CATALOGO_NO_CONFIGURADO');
        Http::assertNothingSent();
    }

    public function test_rechaza_ids_invalidos_sin_red(): void
    {
        Http::fake();
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(0, 17), 422, 'PRESENTACION_INVALIDA');
        $this->assertFallo(fn () => $this->catalogo->obtenerPresentacionVendible(15, 0), 422, 'PRESENTACION_INVALIDA');
        Http::assertNothingSent();
    }
}
