<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PedidoEstadoApiTest extends TestCase
{
    use DatabaseTransactions;

    protected Usuario $admin;

    protected function setUp(): void
    {
        parent::setUp();
        // Obtener un usuario que tenga permisos (en este caso usamos el admin generado por el seeder)
        $this->admin = Usuario::where('nombre_usuario', 'admin')->first();
    }

    private function crearPedido(float $total = 100): Pedido
    {
        $cliente = Cliente::first() ?? Cliente::factory()->create();

        return Pedido::create([
            'id_cliente' => $cliente->id_cliente,
            'id_usuario' => $this->admin->id_usuario,
            'fecha_pedido' => now(),
            'fecha_entrega' => now()->addDays(2),
            'hora_entrega' => '10:00:00',
            'total' => $total,
            'estado' => 'PROGRAMADO',
        ]);
    }

    public function test_transicion_de_programado_a_en_proceso(): void
    {
        $pedido = $this->crearPedido();

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/pedidos/{$pedido->id_pedido}/estado", [
            'estado' => 'EN_PROCESO'
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('pedido.estado', 'EN_PROCESO');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $pedido->id_pedido,
            'estado' => 'EN_PROCESO'
        ]);
    }

    public function test_intento_de_entrega_sin_saldar_el_pedido(): void
    {
        $pedido = $this->crearPedido(150.00);
        // Cambiar a EN_PROCESO primero
        $pedido->update(['estado' => 'EN_PROCESO']);

        // Intentar entregarlo sin pagar
        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/pedidos/{$pedido->id_pedido}/estado", [
            'estado' => 'ENTREGADO'
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('saldo pendiente', $response->json('message') ?? $response->json('error') ?? '');
    }

    public function test_registrar_pago_sobre_el_pedido(): void
    {
        $pedido = $this->crearPedido(200.00);

        // Registrar un pago por el total directamente
        Pago::create([
            'id_pedido' => $pedido->id_pedido,
            'id_usuario' => $this->admin->id_usuario,
            'monto' => 200.00,
            'metodo_pago' => 'EFECTIVO',
            'estado' => 'REGISTRADO',
            'fecha_pago' => now()
        ]);

        $this->assertEquals(0, $pedido->fresh()->saldo);
    }

    public function test_entrega_exitosa_del_pedido_saldado(): void
    {
        $pedido = $this->crearPedido(100.00);
        $pedido->update(['estado' => 'EN_PROCESO']);

        // Registrar pago manual para saldar el pedido
        Pago::create([
            'id_pedido' => $pedido->id_pedido,
            'id_usuario' => $this->admin->id_usuario,
            'monto' => 100.00,
            'metodo_pago' => 'EFECTIVO',
            'estado' => 'REGISTRADO',
            'fecha_pago' => now()
        ]);

        $this->assertEquals(0, $pedido->fresh()->saldo);

        // Entregar el pedido
        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/pedidos/{$pedido->id_pedido}/estado", [
            'estado' => 'ENTREGADO'
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('pedido.estado', 'ENTREGADO');
        $this->assertNotNull($response->json('pedido.id_usuario_entrega'));
        $this->assertNotNull($response->json('pedido.fecha_entrega_efectiva'));

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $pedido->id_pedido,
            'estado' => 'ENTREGADO'
        ]);
    }

    public function test_cancelacion_con_motivo(): void
    {
        $pedido = $this->crearPedido();

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/pedidos/{$pedido->id_pedido}/estado", [
            'estado' => 'CANCELADO',
            'motivo_cancelacion' => 'Cliente canceló por viaje'
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('pedido.estado', 'CANCELADO');

        $this->assertDatabaseHas('pedido', [
            'id_pedido' => $pedido->id_pedido,
            'estado' => 'CANCELADO',
            'motivo_cancelacion' => 'Cliente canceló por viaje',
            'id_usuario_cancelacion' => $this->admin->id_usuario
        ]);
    }

    public function test_inmutabilidad_de_estado_final(): void
    {
        $pedidoEntregado = $this->crearPedido(0); // 0 saldo
        $pedidoEntregado->update([
            'estado' => 'ENTREGADO',
            'id_usuario_entrega' => $this->admin->id_usuario,
            'fecha_entrega_efectiva' => now()
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/pedidos/{$pedidoEntregado->id_pedido}/estado", [
            'estado' => 'CANCELADO',
            'motivo_cancelacion' => 'Intento inválido'
        ]);

        $response->assertStatus(409);

        $pedidoCancelado = $this->crearPedido();
        $pedidoCancelado->update([
            'estado' => 'CANCELADO',
            'id_usuario_cancelacion' => $this->admin->id_usuario,
            'motivo_cancelacion' => 'Prueba',
            'fecha_cancelacion' => now()
        ]);

        $response2 = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/pedidos/{$pedidoCancelado->id_pedido}/estado", [
            'estado' => 'EN_PROCESO'
        ]);

        $response2->assertStatus(409);
    }
}
