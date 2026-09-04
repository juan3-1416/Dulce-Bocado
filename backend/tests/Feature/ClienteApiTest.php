<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ClienteApiTest extends TestCase
{
    use DatabaseTransactions;

    protected Usuario $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Usuario::where('nombre_usuario', 'admin')->first();
    }

    public function test_unauthenticated_user_cannot_access_clientes(): void
    {
        $response = $this->getJson('/api/clientes');
        $response->assertStatus(401);
    }

    public function test_admin_can_list_clientes(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/clientes');
        $response->assertStatus(200);
        $response->assertJsonStructure(['clientes']);
        $this->assertGreaterThanOrEqual(3, count($response->json('clientes')));
    }

    public function test_admin_can_create_cliente_for_pedidos(): void
    {
        $payload = [
            'nombre' => 'Lucía',
            'apellido' => 'Fernández Torres',
            'ci_nit' => '5829103',
            'telefono' => '78912345',
            'correo_electronico' => 'lucia.fernandez@gmail.com',
            'direccion' => 'Calle Beni #220',
            'observaciones' => 'Pedido de torta temática para entrega a las 11:00 AM.',
            'estado' => true,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/clientes', $payload);
        $response->assertStatus(201);
        $response->assertJsonPath('cliente.nombre', 'Lucía');
        $response->assertJsonPath('cliente.telefono', '78912345');

        $this->assertDatabaseHas('cliente', [
            'ci_nit' => '5829103',
            'telefono' => '78912345',
        ]);
    }

    public function test_duplicate_ci_nit_fails_validation(): void
    {
        Cliente::create([
            'nombre' => 'Cliente Existente',
            'ci_nit' => '5829103',
            'estado' => true,
        ]);

        $payload = [
            'nombre' => 'Cliente Duplicado',
            'ci_nit' => '5829103',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/clientes', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ci_nit']);
    }

    public function test_admin_can_update_cliente(): void
    {
        $cliente = Cliente::create([
            'nombre' => 'Lucía',
            'apellido' => 'Fernández',
            'ci_nit' => '5829103',
            'telefono' => '78912345',
            'direccion' => 'Calle Beni #220',
            'estado' => true,
        ]);

        $payload = [
            'nombre' => 'Lucía',
            'apellido' => 'Fernández Torres',
            'ci_nit' => '5829103',
            'telefono' => '78912345',
            'direccion' => 'Calle Beni #220, Apto 3B',
            'observaciones' => 'Actualizado: llamar antes de llegar.',
            'estado' => true,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->putJson("/api/clientes/{$cliente->id_cliente}", $payload);
        $response->assertStatus(200);
        $response->assertJsonPath('cliente.direccion', 'Calle Beni #220, Apto 3B');
    }

    public function test_admin_can_toggle_cliente_estado(): void
    {
        $cliente = Cliente::create([
            'nombre' => 'Cliente Test Toggle',
            'estado' => true,
        ]);

        // Desactivar
        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/clientes/{$cliente->id_cliente}/estado", [
            'estado' => false,
        ]);
        $response->assertStatus(200);
        $this->assertFalse($response->json('cliente.estado'));

        // Reactivar
        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/clientes/{$cliente->id_cliente}/estado", [
            'estado' => true,
        ]);
        $response->assertStatus(200);
        $this->assertTrue($response->json('cliente.estado'));
    }

    public function test_filter_by_telefono(): void
    {
        Cliente::create([
            'nombre' => 'Cliente Con Teléfono Único',
            'telefono' => '78999999',
            'estado' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/clientes?buscar=78999999');
        $response->assertStatus(200);
        $clientes = $response->json('clientes');
        $this->assertCount(1, $clientes);
        $this->assertEquals('78999999', $clientes[0]['telefono']);
    }

    public function test_user_without_permission_receives_403(): void
    {
        $usuarioSinPermiso = Usuario::create([
            'nombre' => 'Usuario Sin Permiso',
            'nombre_usuario' => 'sinpermiso',
            'correo_electronico' => 'sinpermiso@ejemplo.com',
            'contrasena' => bcrypt('Password123!'),
            'activo' => true,
        ]);

        $response = $this->actingAs($usuarioSinPermiso, 'sanctum')->getJson('/api/clientes');
        $response->assertStatus(403);
    }
}
