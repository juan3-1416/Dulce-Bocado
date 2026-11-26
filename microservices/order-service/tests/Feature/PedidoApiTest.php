<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PedidoApiTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase()
    {
        if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \RuntimeException('La suite de Orders intentó migrar una base distinta de SQLite en memoria.');
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
        config()->set('services.customer.url', 'http://customer-service:8000');
        config()->set('services.customer.key', 'customer-test');
        config()->set('services.catalog.url', 'http://catalog-service:8000');
        config()->set('services.catalog.key', 'catalog-test');
        config()->set('services.payment.url', 'http://payment-service:8000');
        config()->set('services.payment.key', 'payment-order-test');
        Http::preventStrayRequests();
        $this->withToken('token-test');
    }

    private function dependencias(
        bool $clienteActivo = true,
        int $catalogoEstado = 200,
        array $permisos = ['pedidos.gestionar_pedido', 'pedidos.gestionar_estado_entrega'],
        string $totalPagado = '0.00',
        int $cantidadPagos = 0,
        int $paymentEstado = 200,
        bool $respuestaInvalida = false
    ): void
    {
        Http::swap(new Factory());
        Http::preventStrayRequests();
        Http::fake(function ($request) use (
            $clienteActivo,
            $catalogoEstado,
            $permisos,
            $totalPagado,
            $cantidadPagos,
            $paymentEstado,
            $respuestaInvalida
        ) {
            if (preg_match(
                '~^http://payment-service:8000/api/internal/pedidos/(\d+)/pagos$~',
                $request->url(),
                $matches
            )) {
                $this->assertTrue(
                    $request->hasHeader(
                        'X-Internal-Service-Key',
                        'payment-order-test'
                    )
                );

                $this->assertTrue(
                    $request->hasHeader('X-Actor-User-Id', '17')
                );

                if ($paymentEstado !== 200) {
                    return Http::response([], $paymentEstado);
                }

                if ($respuestaInvalida) {
                    return Http::response(['total_pagado' => $totalPagado]);
                }

                return Http::response([
                    'pedido_id' => (int) $matches[1],
                    'tiene_pago_confirmado' => $cantidadPagos > 0,
                    'cantidad_pagos_confirmados' => $cantidadPagos,
                    'total_pagado' => $totalPagado,
                ]);
            }

            if (str_contains($request->url(), '/api/internal/introspect')) {
                return Http::response(['usuario' => ['id_usuario' => 17, 'activo' => true, 'permisos' => $permisos]]);
            }
            if (str_contains($request->url(), '/api/clientes/')) {
                return Http::response(['cliente' => ['id_cliente' => 42, 'estado' => $clienteActivo, 'nombre' => 'Ana', 'apellido' => 'Paz']]);
            }
            if (str_contains($request->url(), '/api/presentaciones/')) {
                if ($catalogoEstado !== 200) {
                    return Http::response([], $catalogoEstado);
                }
                return Http::response(['presentacion' => [
                    'presentacion_id' => 15,
                    'nombre' => 'Mediana',
                    'precio' => '10.25',
                    'moneda' => 'BOB',
                    'disponible' => true,
                    'permite_personalizacion' => true,
                    'producto' => ['nombre' => 'Torta'],
                ]]);
            }
            return Http::response([], 404);
        });
    }

    private function datos(): array
    {
        return [
            'tipo_cliente' => 'REGISTRADO',
            'id_cliente' => 42,
            'fecha_entrega' => now()->addDays(3)->toDateString(),
            'hora_entrega' => '12:00',
            'detalles' => [['id_producto_presentacion' => 15, 'cantidad' => 2]],
        ];
    }

    public function test_crea_pedido_y_conserva_snapshots(): void
    {
        $this->dependencias();
        $respuesta = $this->postJson('/api/pedidos', $this->datos())->assertCreated()
            ->assertJsonPath('pedido.estado', 'PROGRAMADO')
            ->assertJsonPath('pedido.total', '20.50');
        $id = $respuesta->json('pedido.id_pedido');
        $this->getJson('/api/pedidos/'.$id)->assertOk()
            ->assertJsonPath('pedido.nombre_cliente_snapshot', 'Ana Paz')
            ->assertJsonPath('pedido.detalles.0.precio_unitario_snapshot', '10.25');
        $this->assertDatabaseCount('pedido', 1);
        $this->assertDatabaseCount('detalle_pedido', 1);
    }

    public function test_cliente_inactivo_no_crea_pedido(): void
    {
        $this->dependencias(clienteActivo: false);
        $this->postJson('/api/pedidos', $this->datos())->assertStatus(409)
            ->assertJsonPath('error.code', 'CLIENTE_INACTIVO');
        $this->assertDatabaseCount('pedido', 0);
        $this->assertDatabaseCount('detalle_pedido', 0);
    }

    public function test_catalogo_inexistente_no_crea_pedido(): void
    {
        $this->dependencias(catalogoEstado: 404);
        $this->postJson('/api/pedidos', $this->datos())->assertNotFound()
            ->assertJsonPath('error.code', 'PRESENTACION_NO_ENCONTRADA');
        $this->assertDatabaseCount('pedido', 0);
    }

    public function test_transiciones_validas_y_estado_final(): void
    {
        $this->dependencias(
            totalPagado: '20.50',
            cantidadPagos: 2
        );
        $id = $this->postJson('/api/pedidos', $this->datos())->assertCreated()->json('pedido.id_pedido');
        $this->patchJson('/api/pedidos/'.$id.'/estado', ['estado' => 'EN_PROCESO'])
            ->assertOk()->assertJsonPath('pedido.estado', 'EN_PROCESO');
        $this->patchJson('/api/pedidos/'.$id.'/estado', ['estado' => 'ENTREGADO'])
            ->assertOk()->assertJsonPath('pedido.id_usuario_entrega', 17);
        $this->patchJson('/api/pedidos/'.$id.'/estado', ['estado' => 'CANCELADO', 'motivo_cancelacion' => 'Error'])
            ->assertStatus(409)->assertJsonPath('error.code', 'PEDIDO_ESTADO_FINAL');
        $this->assertDatabaseCount('pedido', 1);
    }

    public function test_no_entrega_pedido_sin_pago(): void
    {
        $this->dependencias();

        $id = $this->postJson('/api/pedidos', $this->datos())
            ->assertCreated()->json('pedido.id_pedido');

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'ENTREGADO',
        ])->assertConflict()
            ->assertJsonPath('error.code', 'PEDIDO_SIN_PAGO');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $id,
            'estado' => 'PROGRAMADO',
            'id_usuario_entrega' => null,
            'fecha_entrega_efectiva' => null,
        ]);
    }

    public function test_no_entrega_pedido_con_pago_parcial(): void
    {
        $this->dependencias(
            totalPagado: '10.00',
            cantidadPagos: 1
        );

        $id = $this->postJson('/api/pedidos', $this->datos())
            ->assertCreated()->json('pedido.id_pedido');

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'EN_PROCESO',
        ])->assertOk();

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'ENTREGADO',
        ])->assertConflict()
            ->assertJsonPath('error.code', 'PEDIDO_PAGO_INCOMPLETO');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $id,
            'estado' => 'EN_PROCESO',
            'id_usuario_entrega' => null,
        ]);
    }

    public function test_entrega_pedido_con_pago_completo(): void
    {
        $this->dependencias(
            totalPagado: '20.50',
            cantidadPagos: 2
        );

        $id = $this->postJson('/api/pedidos', $this->datos())
            ->assertCreated()->json('pedido.id_pedido');

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'ENTREGADO',
        ])->assertOk()
            ->assertJsonPath('pedido.estado', 'ENTREGADO')
            ->assertJsonPath('pedido.id_usuario_entrega', 17);

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $id,
            'estado' => 'ENTREGADO',
            'id_usuario_entrega' => 17,
        ]);
    }

    public function test_no_entrega_pedido_con_sobrepago(): void
    {
        $this->dependencias(
            totalPagado: '21.00',
            cantidadPagos: 1
        );

        $id = $this->postJson('/api/pedidos', $this->datos())
            ->assertCreated()->json('pedido.id_pedido');

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'ENTREGADO',
        ])->assertConflict()
            ->assertJsonPath('error.code', 'PEDIDO_PAGO_EXCEDENTE');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $id,
            'estado' => 'PROGRAMADO',
        ]);
    }

    public function test_no_entrega_si_payment_no_esta_disponible(): void
    {
        $this->dependencias(paymentEstado: 503);

        $id = $this->postJson('/api/pedidos', $this->datos())
            ->assertCreated()->json('pedido.id_pedido');

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'ENTREGADO',
        ])->assertStatus(503)
            ->assertJsonPath('error.code', 'PAYMENT_NO_DISPONIBLE');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $id,
            'estado' => 'PROGRAMADO',
        ]);
    }

    public function test_no_entrega_si_respuesta_de_payment_es_invalida(): void
    {
        $this->dependencias(
            totalPagado: '20.50',
            respuestaInvalida: true
        );

        $id = $this->postJson('/api/pedidos', $this->datos())
            ->assertCreated()->json('pedido.id_pedido');

        $this->patchJson('/api/pedidos/'.$id.'/estado', [
            'estado' => 'ENTREGADO',
        ])->assertStatus(503)
            ->assertJsonPath('error.code', 'PAYMENT_RESPUESTA_INVALIDA');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $id,
            'estado' => 'PROGRAMADO',
        ]);
    }

    public function test_cancelacion_exige_motivo_y_guarda_auditoria(): void
    {
        $this->dependencias();
        $id = $this->postJson('/api/pedidos', $this->datos())->assertCreated()->json('pedido.id_pedido');
        $this->patchJson('/api/pedidos/'.$id.'/estado', ['estado' => 'CANCELADO', 'motivo_cancelacion' => 'No'])
            ->assertUnprocessable();
        $this->patchJson('/api/pedidos/'.$id.'/estado', ['estado' => 'CANCELADO', 'motivo_cancelacion' => 'Cambio solicitado'])
            ->assertOk()->assertJsonPath('pedido.estado', 'CANCELADO')
            ->assertJsonPath('pedido.id_usuario_cancelacion', 17);
    }

    public function test_sin_token_y_sin_permiso_no_accede_a_pedidos(): void
    {
        $this->dependencias(permisos: []);
        $this->withToken('')->getJson('/api/pedidos')->assertUnauthorized();
        $this->withToken('token-test')->postJson('/api/pedidos', $this->datos())
            ->assertForbidden();
        $this->assertDatabaseCount('pedido', 0);
    }
}
