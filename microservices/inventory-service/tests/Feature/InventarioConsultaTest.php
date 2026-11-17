<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InventarioConsultaTest extends TestCase
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
            'clave-interna-prueba'
        );

        config()->set(
            'services.security.timeout',
            1
        );
    }

    public function test_almacenes_requiere_token(): void
    {
        $response = $this->getJson('/api/almacenes');

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
            ->getJson('/api/almacenes');

        $response
            ->assertStatus(403)
            ->assertJsonPath(
                'error.code',
                'PERMISO_DENEGADO'
            );
    }

    public function test_lista_almacenes_para_usuario_autorizado(): void
    {
        $this->crearAlmacenes();
        $this->simularSeguridad(['inventario.ver']);

        $response = $this
            ->withToken('token-prueba')
            ->getJson('/api/almacenes');

        $response
            ->assertOk()
            ->assertJsonCount(3, 'almacenes')
            ->assertJsonFragment([
                'nombre' => 'Materias primas',
                'tipo' => 'MATERIAS_PRIMAS',
                'activo' => true,
            ])
            ->assertJsonFragment([
                'nombre' => 'Producción',
                'tipo' => 'PRODUCCION',
                'activo' => true,
            ])
            ->assertJsonFragment([
                'nombre' => 'Mostrador',
                'tipo' => 'MOSTRADOR',
                'activo' => true,
            ]);
    }

    public function test_existencias_vacias_devuelven_arreglo_vacio(): void
    {
        $this->simularSeguridad(['inventario.ver']);

        $response = $this
            ->withToken('token-prueba')
            ->getJson('/api/existencias');

        $response
            ->assertOk()
            ->assertExactJson([
                'existencias' => [],
            ]);
    }

    public function test_filtra_existencias_por_almacen_tipo_y_articulo(): void
    {
        [$materias, $produccion] = $this->crearAlmacenes();

        Existencia::create([
            'almacen_id' => $materias->id_almacen,
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => 10,
            'cantidad' => '2.500',
            'unidad' => 'g',
        ]);

        Existencia::create([
            'almacen_id' => $materias->id_almacen,
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => 11,
            'cantidad' => '7.000',
            'unidad' => 'ml',
        ]);

        Existencia::create([
            'almacen_id' => $produccion->id_almacen,
            'tipo_articulo' => 'PRESENTACION',
            'articulo_id' => 20,
            'cantidad' => '4.000',
            'unidad' => 'unidad',
        ]);

        $this->simularSeguridad(['inventario.ver']);

        $response = $this
            ->withToken('token-prueba')
            ->getJson(
                '/api/existencias'
                .'?almacen_id='.$materias->id_almacen
                .'&tipo_articulo=MATERIA_PRIMA'
                .'&articulo_id=10'
            );

        $response
            ->assertOk()
            ->assertJsonCount(1, 'existencias')
            ->assertJsonPath(
                'existencias.0.almacen_id',
                $materias->id_almacen
            )
            ->assertJsonPath(
                'existencias.0.tipo_articulo',
                'MATERIA_PRIMA'
            )
            ->assertJsonPath(
                'existencias.0.articulo_id',
                10
            )
            ->assertJsonPath(
                'existencias.0.cantidad',
                '2.500'
            )
            ->assertJsonPath(
                'existencias.0.unidad',
                'g'
            );
    }

    public function test_filtros_invalidos_devuelven_422(): void
    {
        $this->simularSeguridad(['inventario.ver']);

        $response = $this
            ->withToken('token-prueba')
            ->getJson(
                '/api/existencias'
                .'?almacen_id=0'
                .'&tipo_articulo=OTRO'
                .'&articulo_id=0'
            );

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'error.code',
                'FILTROS_INVALIDOS'
            );
    }

    private function simularSeguridad(array $permisos): void
    {
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

    private function crearAlmacenes(): array
    {
        $materias = Almacen::create([
            'nombre' => 'Materias primas',
            'tipo' => 'MATERIAS_PRIMAS',
            'activo' => true,
        ]);

        $produccion = Almacen::create([
            'nombre' => 'Producción',
            'tipo' => 'PRODUCCION',
            'activo' => true,
        ]);

        $mostrador = Almacen::create([
            'nombre' => 'Mostrador',
            'tipo' => 'MOSTRADOR',
            'activo' => true,
        ]);

        return [
            $materias,
            $produccion,
            $mostrador,
        ];
    }
}