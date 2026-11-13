<?php

namespace Tests\Feature;

use App\Http\Middleware\AutorizarPermisoVentas;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AutorizarPermisoVentasTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.security.url', 'http://security-service:8000');
        config()->set('services.security.key', 'clave-de-prueba');

        Route::get('/_test/ventas/protegida', function (Request $request) {
            return response()->json(['id_usuario' => $request->attributes->get('id_usuario_autenticado')]);
        })->middleware(AutorizarPermisoVentas::class.':ventas.crear');
    }

    public function test_rechaza_peticion_sin_bearer_sin_llamar_a_security(): void
    {
        Http::fake();

        $this->getJson('/_test/ventas/protegida')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_acepta_token_y_permiso_y_usa_identidad_de_security(): void
    {
        Http::fake([
            'security-service:8000/api/internal/introspect' => Http::response([
                'usuario' => ['id_usuario' => 17, 'activo' => true, 'permisos' => ['ventas.crear']],
            ]),
        ]);

        $this->withToken('token-de-prueba')
            ->getJson('/_test/ventas/protegida?id_usuario=999')
            ->assertOk()
            ->assertJsonPath('id_usuario', 17);

        Http::assertSent(fn ($request) =>
            $request->hasHeader('Authorization', 'Bearer token-de-prueba') &&
            $request->hasHeader('X-Internal-Service-Key', 'clave-de-prueba'));
    }

    public function test_rechaza_token_invalido(): void
    {
        Http::fake(['*' => Http::response([], 401)]);
        $this->withToken('invalido')->getJson('/_test/ventas/protegida')->assertUnauthorized();
    }

    public function test_rechaza_permiso_ausente(): void
    {
        Http::fake(['*' => Http::response([
            'usuario' => ['id_usuario' => 17, 'activo' => true, 'permisos' => ['ventas.ver']],
        ])]);
        $this->withToken('valido')->getJson('/_test/ventas/protegida')->assertForbidden();
    }

    public function test_falla_cerrado_si_security_no_responde(): void
    {
        Http::fake(fn () => throw new ConnectionException('Sin conexión'));
        $this->withToken('valido')->getJson('/_test/ventas/protegida')->assertStatus(503);
    }

    public function test_falla_cerrado_si_security_devuelve_datos_invalidos(): void
    {
        Http::fake(['*' => Http::response(['usuario' => ['id_usuario' => 17]], 200)]);
        $this->withToken('valido')->getJson('/_test/ventas/protegida')->assertStatus(503);
    }

    public function test_falla_cerrado_si_falta_la_credencial_interna(): void
    {
        config()->set('services.security.key', null);
        $this->withToken('valido')->getJson('/_test/ventas/protegida')->assertStatus(503);
    }
}
