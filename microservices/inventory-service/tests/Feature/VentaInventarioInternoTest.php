<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VentaInventarioInternoTest extends TestCase
{
    use RefreshDatabase;

    private const ID = '11111111-1111-4111-8111-111111111111';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.inventory_sales.key' => 'sales-test', 'services.inventory_internal.key' => 'production-test']);
        $almacen = Almacen::create(['nombre' => 'Mostrador', 'tipo' => 'MOSTRADOR', 'activo' => true]);
        foreach ([1, 2] as $id) {
            Existencia::create(['almacen_id' => $almacen->id_almacen, 'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => $id, 'cantidad' => '5.000', 'unidad' => 'unidad']);
        }
    }

    private function payload(): array
    {
        return ['operacion_id' => self::ID, 'venta_id' => 1, 'items' => [
            ['presentacion_id' => 1, 'cantidad' => 2], ['presentacion_id' => 2, 'cantidad' => 3],
        ]];
    }

    private function autorizar(): static
    {
        return $this->withHeaders(['X-Internal-Service-Key' => 'sales-test', 'X-Actor-User-Id' => '9']);
    }

    public function test_descuento_atomico_reintento_y_consulta(): void
    {
        $this->autorizar()->postJson('/internal/ventas/descontar', $this->payload())->assertOk()->assertJsonPath('estado', 'APLICADA');
        $this->postJson('/internal/ventas/descontar', $this->payload())->assertOk();
        $this->getJson('/internal/ventas/'.self::ID)->assertOk()->assertJsonPath('venta_id', 1);
        $this->assertDatabaseHas('existencia', ['articulo_id' => 1, 'cantidad' => '3.000']);
        $this->assertDatabaseHas('existencia', ['articulo_id' => 2, 'cantidad' => '2.000']);
        $this->assertDatabaseCount('movimiento', 2);
        $this->assertDatabaseCount('venta_operacion', 1);
    }

    public function test_stock_insuficiente_no_descontara_ningun_item(): void
    {
        $datos = $this->payload();
        $datos['items'][1]['cantidad'] = 6;
        $this->autorizar()->postJson('/internal/ventas/descontar', $datos)->assertConflict()->assertJsonPath('error.code', 'STOCK_INSUFICIENTE');
        $this->assertDatabaseHas('existencia', ['articulo_id' => 1, 'cantidad' => '5.000']);
        $this->assertDatabaseHas('existencia', ['articulo_id' => 2, 'cantidad' => '5.000']);
        $this->assertDatabaseCount('movimiento', 0);
        $this->assertDatabaseCount('venta_operacion', 0);
        $this->getJson('/internal/ventas/'.self::ID)->assertNotFound();
    }

    public function test_no_reutiliza_operacion_ni_descuenta_venta_con_otro_id(): void
    {
        $this->autorizar()->postJson('/internal/ventas/descontar', $this->payload())->assertOk();
        $datos = $this->payload();
        $datos['items'][0]['cantidad'] = 1;
        $this->postJson('/internal/ventas/descontar', $datos)->assertConflict();
        $datos = $this->payload();
        $datos['operacion_id'] = '22222222-2222-4222-8222-222222222222';
        $this->postJson('/internal/ventas/descontar', $datos)->assertConflict()->assertJsonPath('error.code', 'VENTA_YA_DESCONTADA');
        $this->assertDatabaseCount('movimiento', 2);
    }

    public function test_rechaza_clave_de_produccion_y_actor_ausente(): void
    {
        $this->withHeaders(['X-Internal-Service-Key' => 'production-test', 'X-Actor-User-Id' => '9'])
            ->postJson('/internal/ventas/descontar', $this->payload())->assertForbidden();
        $this->withHeaders(['X-Internal-Service-Key' => 'sales-test', 'X-Actor-User-Id' => '0'])
            ->postJson('/internal/ventas/descontar', $this->payload())->assertUnprocessable();
        $this->assertDatabaseCount('movimiento', 0);
    }

    public function test_rechaza_articulos_duplicados_y_cantidades_invalidas(): void
    {
        $datos = $this->payload();
        $datos['items'][1]['presentacion_id'] = 1;
        $this->autorizar()->postJson('/internal/ventas/descontar', $datos)->assertUnprocessable();
        foreach ([0, -1, '1.5'] as $cantidad) {
            $datos = $this->payload();
            $datos['items'][0]['cantidad'] = $cantidad;
            $this->postJson('/internal/ventas/descontar', $datos)->assertUnprocessable();
        }
        $this->assertDatabaseCount('movimiento', 0);
    }
}
