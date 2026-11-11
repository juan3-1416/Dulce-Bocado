<?php

namespace Tests\Feature;

use App\Services\Clientes\ClienteService;
use App\Services\Clientes\ClienteServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ClienteServiceTest extends TestCase
{
    private ClienteService $clientes;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clientes = new ClienteService();
        config()->set('services.customer.url', 'http://customer-service:8000');
        config()->set('services.customer.key', 'clave-de-prueba');
        config()->set('services.customer.timeout', 3);
        Http::preventStrayRequests();
    }

    private function assertFallo(callable $operacion, int $estado, string $codigo): void
    {
        try {
            $operacion();
            $this->fail('Se esperaba un rechazo del cliente.');
        } catch (ClienteServiceException $error) {
            $this->assertSame($estado, $error->httpStatus);
            $this->assertSame($codigo, $error->codigo);
        }
    }

    public function test_cliente_ocasional_no_consulta_customer(): void
    {
        Http::fake();

        $this->assertSame(
            ['id_cliente' => null, 'nombre_cliente_ocasional' => 'Ana'],
            $this->clientes->validarParaVenta(null, '  Ana  ', 17),
        );
        Http::assertNothingSent();
    }

    public function test_cliente_registrado_activo_usa_credencial_y_actor_interno(): void
    {
        Http::fake(['*' => Http::response(['cliente' => ['id_cliente' => 42, 'estado' => true]])]);

        $this->assertSame(
            ['id_cliente' => 42, 'nombre_cliente_ocasional' => null],
            $this->clientes->validarParaVenta(42, null, 17),
        );

        Http::assertSent(fn ($peticion) =>
            $peticion->url() === 'http://customer-service:8000/api/clientes/42' &&
            $peticion->method() === 'GET' &&
            $peticion->hasHeader('X-Internal-Service-Key', 'clave-de-prueba') &&
            $peticion->hasHeader('X-Actor-User-Id', '17') &&
            !$peticion->hasHeader('Authorization'));
    }

    public function test_rechaza_cliente_inexistente(): void
    {
        Http::fake(['*' => Http::response([], 404)]);
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 404, 'CLIENTE_NO_ENCONTRADO');
    }

    public function test_rechaza_cliente_inactivo(): void
    {
        Http::fake(['*' => Http::response(['cliente' => ['id_cliente' => 42, 'estado' => false]])]);
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 409, 'CLIENTE_INACTIVO');
    }

    public function test_falla_cerrado_ante_caida(): void
    {
        Http::fake(fn () => throw new ConnectionException('Sin conexión'));
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 503, 'CUSTOMER_NO_DISPONIBLE');
    }

    public function test_falla_cerrado_ante_respuesta_malformada(): void
    {
        Http::fake(['*' => Http::response(['cliente' => ['id_cliente' => 99, 'estado' => true]])]);
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 503, 'RESPUESTA_CUSTOMER_INVALIDA');
    }

    public function test_falla_cerrado_ante_error_remoto(): void
    {
        Http::fake(['*' => Http::response([], 500)]);
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 503, 'CUSTOMER_NO_DISPONIBLE');
    }

    public function test_falla_cerrado_si_customer_rechaza_credencial_interna(): void
    {
        Http::fake(['*' => Http::response([], 403)]);
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 503, 'CUSTOMER_NO_DISPONIBLE');
    }

    public function test_falla_cerrado_si_estado_no_es_booleano(): void
    {
        Http::fake(['*' => Http::response(['cliente' => ['id_cliente' => 42, 'estado' => 'activo']])]);
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 503, 'RESPUESTA_CUSTOMER_INVALIDA');
    }

    public function test_no_consulta_customer_si_falta_credencial(): void
    {
        Http::fake();
        config()->set('services.customer.key', null);

        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, null, 17), 503, 'CUSTOMER_NO_CONFIGURADO');
        Http::assertNothingSent();
    }

    public function test_rechaza_cliente_ambiguo_o_ausente_sin_red(): void
    {
        Http::fake();

        $this->assertFallo(fn () => $this->clientes->validarParaVenta(null, null, 17), 422, 'CLIENTE_REQUERIDO');
        $this->assertFallo(fn () => $this->clientes->validarParaVenta(42, 'Ana', 17), 422, 'CLIENTE_AMBIGUO');
        Http::assertNothingSent();
    }

    public function test_cliente_ocasional_funciona_sin_credencial_customer(): void
    {
        Http::fake();
        config()->set('services.customer.key', null);

        $this->assertSame(
            ['id_cliente' => null, 'nombre_cliente_ocasional' => 'Ana'],
            $this->clientes->validarParaVenta(null, 'Ana', 17),
        );
        Http::assertNothingSent();
    }
}
