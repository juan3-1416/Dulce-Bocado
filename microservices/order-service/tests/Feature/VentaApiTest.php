<?php

namespace Tests\Feature;

use App\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VentaApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.security.url', 'http://security-service:8000');
        config()->set('services.security.key', 'security-test');
        config()->set('services.customer.url', 'http://customer-service:8000');
        config()->set('services.customer.key', 'customer-test');
        config()->set('services.catalog.url', 'http://catalog-service:8000');
        config()->set('services.catalog.key', 'catalog-test');
        Http::preventStrayRequests();
        $this->withToken('token-test');
    }

    private function simularDependencias(array $permisos = ['ventas.ver', 'ventas.crear', 'ventas.modificar', 'ventas.anular'], string $precio = '10.25', bool $clienteActivo = true, bool $catalogDisponible = true): void
    {
        Http::swap(new Factory());
        Http::preventStrayRequests();
        Http::fake(function ($request) use ($permisos, $precio, $clienteActivo, $catalogDisponible) {
            if (str_contains($request->url(), '/api/internal/introspect')) {
                return Http::response(['usuario' => ['id_usuario' => 17, 'activo' => true, 'permisos' => $permisos]]);
            }
            if (str_contains($request->url(), '/api/clientes/')) {
                return Http::response(['cliente' => ['id_cliente' => 42, 'estado' => $clienteActivo]]);
            }
            if (str_contains($request->url(), '/api/presentaciones/')) {
                if (!$catalogDisponible) {
                    return Http::response([], 503);
                }
                $id = (int) basename(parse_url($request->url(), PHP_URL_PATH));
                return Http::response(['presentacion' => [
                    'presentacion_id' => $id, 'nombre' => 'Torta '.$id, 'precio' => $precio,
                    'moneda' => 'BOB', 'disponible' => true, 'permite_personalizacion' => true,
                ]]);
            }
            return Http::response([], 404);
        });
    }

    private function datos(): array
    {
        return [
            'id_cliente' => 42,
            'items' => [
                ['presentacion_id' => 15, 'cantidad' => 2],
                ['presentacion_id' => 16, 'cantidad' => 1],
            ],
            'observaciones' => 'Mostrador',
        ];
    }

    private function clave(string $sufijo = 'a'): array
    {
        return ['Idempotency-Key' => str_repeat($sufijo, 20)];
    }

    public function test_crea_venta_con_total_exacto_y_actor_de_security(): void
    {
        $this->simularDependencias();
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('venta.total', '30.75')
            ->assertJsonPath('venta.id_usuario', 17)
            ->assertJsonPath('venta.detalles.0.subtotal', '20.50');
        $this->assertDatabaseCount('venta', 1);
        $this->assertDatabaseCount('detalle_venta', 2);
    }

    public function test_listado_y_detalle_exigen_permiso_y_devuelven_snapshot_historico(): void
    {
        $this->simularDependencias();
        $id = $this->postJson('/api/ventas', $this->datos(), $this->clave())->json('venta.id_venta');
        $this->simularDependencias(precio: '999.00');
        $this->getJson('/api/ventas?estado=BORRADOR')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/ventas/'.$id)->assertOk()
            ->assertJsonPath('venta.detalles.0.precio_unitario_snapshot', '10.25');
    }

    public function test_reintento_con_misma_clave_no_duplica_y_payload_distinto_da_conflicto(): void
    {
        $this->simularDependencias();
        $primera = $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertCreated();
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertCreated()
            ->assertJsonPath('venta.id_venta', $primera->json('venta.id_venta'));
        $distinto = $this->datos();
        $distinto['items'][0]['cantidad'] = 3;
        $this->postJson('/api/ventas', $distinto, $this->clave())->assertStatus(409)
            ->assertJsonPath('error.code', 'CLAVE_IDEMPOTENTE_EN_CONFLICTO');
        $this->assertDatabaseCount('venta', 1);
    }

    public function test_edita_y_anula_solo_borrador_con_auditoria(): void
    {
        $this->simularDependencias();
        $id = $this->postJson('/api/ventas', $this->datos(), $this->clave())->json('venta.id_venta');
        $nuevos = ['nombre_cliente_ocasional' => 'Cliente ocasional', 'items' => [['presentacion_id' => 15, 'cantidad' => 1]]];
        $this->putJson('/api/ventas/'.$id, $nuevos, $this->clave('b'))->assertOk()
            ->assertJsonPath('venta.total', '10.25')
            ->assertJsonPath('venta.nombre_cliente_ocasional', 'Cliente ocasional');
        $this->assertDatabaseCount('detalle_venta', 1);
        $this->postJson('/api/ventas/'.$id.'/anular', ['motivo' => 'Error de captura'], $this->clave('c'))
            ->assertOk()->assertJsonPath('venta.estado', 'CANCELADA')
            ->assertJsonPath('venta.id_usuario_cancelacion', 17);
        $this->putJson('/api/ventas/'.$id, $nuevos, $this->clave('b'))->assertOk()
            ->assertJsonPath('venta.estado', 'BORRADOR');
        $this->postJson('/api/ventas/'.$id.'/anular', ['motivo' => 'Error de captura'], $this->clave('c'))
            ->assertOk()->assertJsonPath('venta.estado', 'CANCELADA');
        $this->putJson('/api/ventas/'.$id, $nuevos, $this->clave('d'))->assertStatus(409);
        $this->postJson('/api/ventas/'.$id.'/anular', ['motivo' => 'Otro motivo'], $this->clave('e'))->assertStatus(409);
        $this->assertSame('CANCELADA', Venta::find($id)->estado);
    }

    public function test_una_dependencia_caida_no_deja_venta_parcial(): void
    {
        $this->simularDependencias();
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/api/internal/introspect')) {
                return Http::response(['usuario' => ['id_usuario' => 17, 'activo' => true, 'permisos' => ['ventas.crear']]]);
            }
            throw new ConnectionException('Sin conexión');
        });
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertStatus(503);
        $this->assertDatabaseCount('venta', 0);
        $this->assertDatabaseCount('venta_idempotencia', 0);
    }

    public function test_valida_entrada_y_rechaza_precio_identidad_y_personalizacion_del_cliente(): void
    {
        $this->simularDependencias();
        $malos = $this->datos();
        $malos['id_usuario'] = 999;
        $malos['total'] = '0.01';
        $malos['items'][0]['cantidad'] = 0;
        $malos['items'][0]['precio_unitario'] = '0.01';
        $malos['items'][0]['detalle_personalizacion'] = 'Mensaje';
        $this->postJson('/api/ventas', $malos, $this->clave())->assertUnprocessable()
            ->assertJsonValidationErrors(['id_usuario', 'total', 'items.0.cantidad', 'items.0.precio_unitario', 'items.0.detalle_personalizacion']);
        $this->assertDatabaseCount('venta', 0);
    }

    public function test_no_acepta_items_repetidos_ni_clave_faltante(): void
    {
        $this->simularDependencias();
        $duplicados = $this->datos();
        $duplicados['items'][1]['presentacion_id'] = 15;
        $this->postJson('/api/ventas', $duplicados, $this->clave())->assertUnprocessable();
        $this->postJson('/api/ventas', $this->datos())->assertStatus(422)
            ->assertJsonPath('error.code', 'CLAVE_IDEMPOTENTE_REQUERIDA');
    }

    public function test_permisos_reales_en_cada_ruta(): void
    {
        $this->simularDependencias([]);
        $this->getJson('/api/ventas')->assertForbidden();
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertForbidden();
        $this->getJson('/api/ventas/1')->assertForbidden();
        $this->putJson('/api/ventas/1', $this->datos(), $this->clave('b'))->assertForbidden();
        $this->postJson('/api/ventas/1/anular', ['motivo' => 'Prueba'], $this->clave('c'))->assertForbidden();
        $this->assertDatabaseCount('venta', 0);
    }

    public function test_sin_token_no_se_consultan_datos_ni_dependencias(): void
    {
        Http::fake();
        $this->withToken('');
        $this->getJson('/api/ventas')->assertUnauthorized();
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertUnauthorized();
        $this->getJson('/api/ventas/1')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_cliente_inactivo_impide_crear(): void
    {
        $this->simularDependencias(clienteActivo: false);
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertStatus(409)
            ->assertJsonPath('error.code', 'CLIENTE_INACTIVO');
        $this->assertDatabaseCount('venta', 0);
    }

    public function test_catalogo_indisponible_impide_crear_sin_reserva_parcial(): void
    {
        $this->simularDependencias(catalogDisponible: false);
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertStatus(503)
            ->assertJsonPath('error.code', 'CATALOGO_NO_DISPONIBLE');
        $this->assertDatabaseCount('venta', 0);
        $this->assertDatabaseCount('venta_idempotencia', 0);
    }

    public function test_cambio_fallido_no_modifica_venta_previa(): void
    {
        $this->simularDependencias();
        $id = $this->postJson('/api/ventas', $this->datos(), $this->clave())->json('venta.id_venta');
        $this->simularDependencias(catalogDisponible: false);
        $this->putJson('/api/ventas/'.$id, $this->datos(), $this->clave('b'))->assertStatus(503);
        $this->assertSame('30.75', Venta::find($id)->total);
        $this->assertDatabaseCount('detalle_venta', 2);
    }

    public function test_total_fuera_del_limite_de_bd_se_rechaza_sin_escritura(): void
    {
        $this->simularDependencias(precio: '9999999999.99');
        $this->postJson('/api/ventas', $this->datos(), $this->clave())->assertUnprocessable()
            ->assertJsonPath('error.code', 'TOTAL_FUERA_DE_RANGO');
        $this->assertDatabaseCount('venta', 0);
    }
}
