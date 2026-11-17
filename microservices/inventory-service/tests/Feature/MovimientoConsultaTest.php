<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Movimiento;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MovimientoConsultaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'services.security.url',
            'http://security-service:8000'
        );

        config()->set(
            'services.security.key',
            'security-test-key'
        );

        config()->set(
            'services.security.timeout',
            1
        );
    }

    public function test_movimientos_requiere_token(): void
    {
        $response = $this->getJson(
            '/api/movimientos'
        );

        $response
            ->assertStatus(401)
            ->assertJsonPath(
                'error.code',
                'TOKEN_REQUERIDO'
            );
    }

    public function test_usuario_sin_permiso_recibe_403(): void
    {
        $this->simularSeguridad([]);

        $response = $this
            ->withToken('token-prueba')
            ->getJson('/api/movimientos');

        $response
            ->assertStatus(403)
            ->assertJsonPath(
                'error.code',
                'PERMISO_DENEGADO'
            );
    }

    public function test_movimientos_vacios_devuelven_arreglo_vacio(): void
    {
        $this->simularSeguridad([
            'inventario.ver',
        ]);

        $response = $this
            ->withToken('token-prueba')
            ->getJson('/api/movimientos');

        $response
            ->assertOk()
            ->assertExactJson([
                'movimientos' => [],
            ]);
    }

    public function test_lista_movimientos_en_orden_descendente(): void
    {
        $almacen = Almacen::create([
            'nombre' => 'Materias primas',
            'tipo' => 'MATERIAS_PRIMAS',
            'activo' => true,
        ]);

        $primero = Movimiento::create([
            'tipo' => 'INGRESO',
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => 10,
            'cantidad' => '5.000',
            'unidad' => 'g',
            'almacen_origen_id' => null,
            'almacen_destino_id' =>
                $almacen->id_almacen,
            'motivo' => 'Compra inicial',
            'observaciones' => null,
            'referencia_tipo' => null,
            'referencia_id' => null,
            'actor_usuario_id' => 1,
        ]);

        $segundo = Movimiento::create([
            'tipo' => 'EGRESO',
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => 10,
            'cantidad' => '2.000',
            'unidad' => 'g',
            'almacen_origen_id' =>
                $almacen->id_almacen,
            'almacen_destino_id' => null,
            'motivo' => 'Consumo',
            'observaciones' => null,
            'referencia_tipo' => null,
            'referencia_id' => null,
            'actor_usuario_id' => 1,
        ]);

        $this->simularSeguridad([
            'inventario.ver',
        ]);

        $response = $this
            ->withToken('token-prueba')
            ->getJson('/api/movimientos');

        $response
            ->assertOk()
            ->assertJsonCount(
                2,
                'movimientos'
            )
            ->assertJsonPath(
                'movimientos.0.id_movimiento',
                $segundo->id_movimiento
            )
            ->assertJsonPath(
                'movimientos.0.tipo',
                'EGRESO'
            )
            ->assertJsonPath(
                'movimientos.0.cantidad',
                '2.000'
            )
            ->assertJsonPath(
                'movimientos.0.unidad',
                'g'
            )
            ->assertJsonPath(
                'movimientos.1.id_movimiento',
                $primero->id_movimiento
            )
            ->assertJsonPath(
                'movimientos.1.tipo',
                'INGRESO'
            )
            ->assertJsonPath(
                'movimientos.1.cantidad',
                '5.000'
            );
    }

    private function simularSeguridad(
        array $permisos
    ): void {
        Http::fake([
            '*' => Http::response([
                'usuario' => [
                    'id_usuario' => 1,
                    'activo' => true,
                    'permisos' => $permisos,
                ],
            ], 200),
        ]);
    }
}