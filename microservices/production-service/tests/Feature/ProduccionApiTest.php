<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProduccionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase()
    {
        if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \RuntimeException('La suite de Production intentó migrar una base de desarrollo.');
        }
    }

    protected function migrateFreshUsing()
    {
        return ['--database' => 'sqlite'];
    }

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.security.url', 'http://security-service:8000');
        config()->set('services.security.key', 'security-test');
        config()->set('services.catalog.url', 'http://catalog-service:8000');
        config()->set('services.catalog.key', 'catalog-test');
        config()->set('services.inventory.url', 'http://inventory-service:8000');
        config()->set('services.inventory.key', 'inventory-test');
        Http::preventStrayRequests();
        $this->withToken('token-test');
    }

    private function datos(): array
    {
        return ['presentacion_id' => 2, 'cantidad' => 3, 'observaciones' => 'Lote de prueba'];
    }

    private function clave(): array
    {
        return ['Idempotency-Key' => str_repeat('t', 20)];
    }

    private function receta(): array
    {
        return ['receta' => [
            'id_receta' => 4,
            'presentacion_id' => 2,
            'estado' => true,
            'presentacion' => [
                'presentacion_id' => 2,
                'disponible' => true,
                'producto' => ['estado' => true],
            ],
            'detalles' => [[
                'id_materia_prima' => 5,
                'cantidad' => '0.125',
                'materia_prima' => [
                    'id_materia_prima' => 5,
                    'estado' => true,
                    'unidad_medida' => 'g',
                ],
            ]],
        ]];
    }

    private function simular(callable $inventario, array $permisos = ['produccion.crear', 'produccion.ver']): void
    {
        Http::swap(new Factory());
        Http::preventStrayRequests();
        Http::fake(function ($request) use ($inventario, $permisos) {
            if (str_contains($request->url(), '/api/internal/introspect')) {
                return Http::response(['usuario' => [
                    'id_usuario' => 7, 'activo' => true, 'permisos' => $permisos,
                ]]);
            }
            if (str_contains($request->url(), '/api/presentaciones/2/receta')) {
                return Http::response($this->receta());
            }
            if (str_contains($request->url(), '/internal/producciones/')) {
                return $inventario($request);
            }
            return Http::response([], 404);
        });
    }

    public function test_consumo_decimal_exactamente_y_reintento_sin_movimiento_duplicado(): void
    {
        $aplicaciones = 0;
        $this->simular(function ($request) use (&$aplicaciones) {
            if ($request->method() !== 'POST') return Http::response([], 404);
            $aplicaciones++;
            $this->assertSame('0.375', $request['ingredientes'][0]['cantidad']);
            $this->assertSame('MATERIAS_PRIMAS', $request['almacen_insumos_tipo']);
            $this->assertSame('PRODUCCION', $request['almacen_terminados_tipo']);
            $this->assertSame('inventory-test', $request->header('X-Internal-Service-Key')[0]);
            return Http::response(['operacion_id' => $request['operacion_id'], 'estado' => 'APLICADA']);
        });

        $primera = $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('produccion.estado', 'COMPLETADA')
            ->assertJsonPath('produccion.consumo_snapshot.ingredientes.0.cantidad', '0.375');
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('produccion.id_produccion', $primera->json('produccion.id_produccion'));

        $distintos = $this->datos();
        $distintos['cantidad'] = 4;
        $this->postJson('/api/producciones', $distintos, $this->clave())->assertStatus(409)
            ->assertJsonPath('error.code', 'CLAVE_IDEMPOTENTE_EN_CONFLICTO');
        $this->assertSame(1, $aplicaciones);
        $this->assertDatabaseCount('produccion', 1);
        $this->assertDatabaseCount('produccion_idempotencia', 1);
    }

    public function test_stock_insuficiente_rechaza_sin_acreditar_produccion(): void
    {
        $this->simular(fn ($request) => Http::response([
            'operacion_id' => $request['operacion_id'],
            'error' => ['code' => 'STOCK_INSUFICIENTE', 'message' => 'Saldo insuficiente.'],
        ], 409));

        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(409)
            ->assertJsonPath('error.code', 'STOCK_INSUFICIENTE')
            ->assertJsonPath('produccion.estado', 'RECHAZADA');
        $this->assertDatabaseHas('produccion', ['estado' => 'RECHAZADA', 'fecha_completada' => null]);
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(409)
            ->assertJsonPath('produccion.estado', 'RECHAZADA');
    }

    public function test_respuesta_perdida_se_concilia_con_mismo_id_de_operacion(): void
    {
        $operacion = null;
        $this->simular(function ($request) use (&$operacion) {
            if ($request->method() === 'POST') {
                $operacion = $request['operacion_id'];
                throw new ConnectionException('Respuesta perdida.');
            }
            $this->assertStringEndsWith('/'.$operacion, $request->url());
            return Http::response(['operacion_id' => $operacion, 'estado' => 'APLICADA']);
        });

        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('produccion.estado', 'COMPLETADA');
        $this->assertDatabaseCount('produccion', 1);
    }

    public function test_incertidumbre_permanece_en_proceso_y_reintento_concilia(): void
    {
        $operacion = null;
        $consultas = 0;
        $aplicaciones = 0;
        $this->simular(function ($request) use (&$operacion, &$consultas, &$aplicaciones) {
            if ($request->method() === 'POST') {
                $aplicaciones++;
                $operacion = $request['operacion_id'];
                throw new ConnectionException('Respuesta perdida.');
            }
            $consultas++;
            return $consultas === 1
                ? Http::response([], 503)
                : Http::response(['operacion_id' => $operacion, 'estado' => 'APLICADA']);
        });

        $primera = $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(202)
            ->assertJsonPath('produccion.estado', 'EN_PROCESO');
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('produccion.id_produccion', $primera->json('produccion.id_produccion'));
        $this->assertSame(1, $aplicaciones);
        $this->assertDatabaseCount('produccion', 1);
    }

    public function test_sin_permiso_y_clave_invalida_no_crea_solicitud(): void
    {
        $this->simular(fn () => Http::response([], 404), []);
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertForbidden();

        $this->simular(fn () => Http::response([], 404));
        $this->postJson('/api/producciones', $this->datos())->assertStatus(422)
            ->assertJsonPath('error.code', 'CLAVE_IDEMPOTENTE_INVALIDA');
        $this->assertDatabaseCount('produccion', 0);
    }

    public function test_rechazo_sin_id_coincidente_no_se_acepta_como_definitivo(): void
    {
        $operacion = null;
        $consultas = 0;
        $aplicaciones = 0;
        $this->simular(function ($request) use (&$operacion, &$consultas, &$aplicaciones) {
            if ($request->method() === 'POST') {
                $aplicaciones++;
                $operacion = $request['operacion_id'];
                return Http::response([
                    'operacion_id' => 'operacion-ajena',
                    'error' => ['code' => 'STOCK_INSUFICIENTE'],
                ], 409);
            }
            $consultas++;
            return $consultas === 1
                ? Http::response([], 503)
                : Http::response(['operacion_id' => $operacion, 'estado' => 'APLICADA']);
        });

        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(202)
            ->assertJsonPath('produccion.estado', 'EN_PROCESO');
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('produccion.estado', 'COMPLETADA');
        $this->assertSame(1, $aplicaciones);
        $this->assertDatabaseCount('produccion', 1);
    }

    public function test_conciliador_recupera_solicitud_sin_reenvio_del_navegador(): void
    {
        $operacion = null;
        $consultas = 0;
        $aplicaciones = 0;
        $this->simular(function ($request) use (&$operacion, &$consultas, &$aplicaciones) {
            if ($request->method() === 'POST') {
                $aplicaciones++;
                $operacion = $request['operacion_id'];
                throw new ConnectionException('Respuesta perdida.');
            }
            $consultas++;
            return $consultas === 1
                ? Http::response([], 503)
                : Http::response(['operacion_id' => $operacion, 'estado' => 'APLICADA']);
        });

        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(202);
        $this->artisan('produccion:conciliar')->assertSuccessful();
        $this->assertDatabaseHas('produccion', ['estado' => 'COMPLETADA', 'operacion_id' => $operacion]);
        $this->assertSame(1, $aplicaciones);
        $this->assertDatabaseCount('produccion', 1);
    }

    public function test_caida_de_security_o_catalog_no_crea_produccion(): void
    {
        Http::swap(new Factory());
        Http::preventStrayRequests();
        Http::fake(['*/api/internal/introspect' => Http::response([], 503)]);
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(503);

        Http::swap(new Factory());
        Http::preventStrayRequests();
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/api/internal/introspect')) {
                return Http::response(['usuario' => [
                    'id_usuario' => 7, 'activo' => true, 'permisos' => ['produccion.crear'],
                ]]);
            }
            return Http::response([], 503);
        });
        $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertStatus(503);
        $this->assertDatabaseCount('produccion', 0);
        $this->assertDatabaseCount('produccion_idempotencia', 0);
    }

    public function test_listar_y_consultar_producciones_con_permiso_y_filtros(): void
    {
        $this->simular(fn ($request) => Http::response([
            'operacion_id' => $request['operacion_id'],
            'estado' => 'APLICADA',
        ]));

        $res1 = $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated();
        $id1 = $res1->json('produccion.id_produccion');

        $this->getJson('/api/producciones')
            ->assertOk()
            ->assertJsonStructure([
                'producciones' => [
                    '*' => ['id_produccion', 'operacion_id', 'presentacion_id', 'estado'],
                ],
                'pagination' => ['page', 'last_page', 'total'],
            ])
            ->assertJsonPath('pagination.total', 1);

        $this->getJson('/api/producciones?estado=COMPLETADA')
            ->assertOk()
            ->assertJsonPath('pagination.total', 1);

        $this->getJson('/api/producciones?estado=RECHAZADA')
            ->assertOk()
            ->assertJsonPath('pagination.total', 0);

        $this->getJson('/api/producciones/'.$id1)
            ->assertOk()
            ->assertJsonPath('produccion.id_produccion', $id1)
            ->assertJsonPath('produccion.estado', 'COMPLETADA');

        $this->getJson('/api/producciones/999999')
            ->assertNotFound();
    }

    public function test_consulta_sin_permiso_produccion_ver_devuelve_403(): void
    {
        $this->simular(fn ($request) => Http::response([
            'operacion_id' => $request['operacion_id'],
            'estado' => 'APLICADA',
        ]));
        $res = $this->postJson('/api/producciones', $this->datos(), $this->clave())->assertCreated();
        $id = $res->json('produccion.id_produccion');

        $this->simular(fn () => Http::response([], 404), ['otro.permiso']);

        $this->getJson('/api/producciones')->assertForbidden();
        $this->getJson('/api/producciones/'.$id)->assertForbidden();
    }
}
