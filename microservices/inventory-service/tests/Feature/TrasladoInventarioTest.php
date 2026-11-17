<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TrasladoInventarioTest extends TestCase
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

        config()->set(
            'services.catalog.url',
            'http://catalog-service:8000'
        );

        config()->set(
            'services.catalog.key',
            'catalog-test-key'
        );

        config()->set(
            'services.catalog.timeout',
            1
        );
    }

    public function test_traslado_requiere_token(): void
    {
        $response = $this->postJson(
            '/api/traslados',
            []
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
        $this->simularDependencias([]);

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000001'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_origen_id' => 1,
                'almacen_destino_id' => 2,
                'cantidad' => '1',
                'motivo' => 'Reposición',
            ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath(
                'error.code',
                'PERMISO_DENEGADO'
            );
    }

    public function test_traslado_descuenta_origen_y_suma_destino(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $produccion,
            20,
            '10.000'
        );

        $this->crearExistencia(
            $mostrador,
            20,
            '2.000'
        );

        $this->simularDependencias(
            ['inventario.trasladar'],
            [
                'presentacion_id' => 20,
                'nombre' => 'Torta mediana',
                'disponible' => true,
            ]
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000002'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_origen_id' =>
                    $produccion->id_almacen,
                'almacen_destino_id' =>
                    $mostrador->id_almacen,
                'cantidad' => '6',
                'motivo' => 'Reposición mostrador',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath(
                'movimiento.tipo',
                'TRASLADO'
            )
            ->assertJsonPath(
                'movimiento.cantidad',
                '6.000'
            )
            ->assertJsonPath(
                'existencias.origen.cantidad',
                '4.000'
            )
            ->assertJsonPath(
                'existencias.destino.cantidad',
                '8.000'
            );

        $origen = Existencia::query()
            ->where(
                'almacen_id',
                $produccion->id_almacen
            )
            ->firstOrFail();

        $destino = Existencia::query()
            ->where(
                'almacen_id',
                $mostrador->id_almacen
            )
            ->firstOrFail();

        $this->assertSame(
            '4.000',
            $origen->cantidad
        );

        $this->assertSame(
            '8.000',
            $destino->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            1
        );

        $this->assertDatabaseCount(
            'inventario_idempotencia',
            1
        );
    }

    public function test_crea_existencia_destino_si_no_existe(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $produccion,
            20,
            '5.000'
        );

        $this->simularDependencias(
            ['inventario.trasladar'],
            [
                'presentacion_id' => 20,
                'nombre' => 'Torta mediana',
                'disponible' => true,
            ]
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000003'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_origen_id' =>
                    $produccion->id_almacen,
                'almacen_destino_id' =>
                    $mostrador->id_almacen,
                'cantidad' => '2',
                'motivo' => 'Reposición',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath(
                'existencias.origen.cantidad',
                '3.000'
            )
            ->assertJsonPath(
                'existencias.destino.cantidad',
                '2.000'
            );

        $this->assertDatabaseCount(
            'existencia',
            2
        );
    }

    public function test_stock_insuficiente_no_modifica_ningun_almacen(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $produccion,
            20,
            '5.000'
        );

        $this->crearExistencia(
            $mostrador,
            20,
            '2.000'
        );

        $this->simularDependencias(
            ['inventario.trasladar'],
            [
                'presentacion_id' => 20,
                'nombre' => 'Torta mediana',
                'disponible' => true,
            ]
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000004'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_origen_id' =>
                    $produccion->id_almacen,
                'almacen_destino_id' =>
                    $mostrador->id_almacen,
                'cantidad' => '6',
                'motivo' => 'Reposición',
            ]);

        $response
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            )
            ->assertJsonPath(
                'error.details.disponible',
                '5.000'
            )
            ->assertJsonPath(
                'error.details.solicitado',
                '6.000'
            );

        $origen = Existencia::query()
            ->where(
                'almacen_id',
                $produccion->id_almacen
            )
            ->firstOrFail();

        $destino = Existencia::query()
            ->where(
                'almacen_id',
                $mostrador->id_almacen
            )
            ->firstOrFail();

        $this->assertSame(
            '5.000',
            $origen->cantidad
        );

        $this->assertSame(
            '2.000',
            $destino->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            0
        );

        $this->assertDatabaseCount(
            'inventario_idempotencia',
            1
        );
    }

    public function test_traslado_solo_permite_produccion_hacia_mostrador(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $mostrador,
            20,
            '5.000'
        );

        $this->simularDependencias(
            ['inventario.trasladar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000005'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_origen_id' =>
                    $mostrador->id_almacen,
                'almacen_destino_id' =>
                    $produccion->id_almacen,
                'cantidad' => '1',
                'motivo' => 'Movimiento inválido',
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'error.code',
                'TRASLADO_NO_PERMITIDO'
            );

        $this->assertSame(
            '5.000',
            Existencia::firstOrFail()->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            0
        );
    }

    public function test_no_permite_materia_prima_en_traslado(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.trasladar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000006'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_origen_id' =>
                    $produccion->id_almacen,
                'almacen_destino_id' =>
                    $mostrador->id_almacen,
                'cantidad' => '1',
                'motivo' => 'Inválido',
            ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount(
            'movimiento',
            0
        );
    }

    public function test_no_permite_cantidad_decimal(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.trasladar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'traslado-prueba-000007'
            )
            ->postJson('/api/traslados', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_origen_id' =>
                    $produccion->id_almacen,
                'almacen_destino_id' =>
                    $mostrador->id_almacen,
                'cantidad' => '1.500',
                'motivo' => 'Inválido',
            ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount(
            'movimiento',
            0
        );
    }

    public function test_repetir_traslado_no_mueve_stock_dos_veces(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $produccion,
            20,
            '10.000'
        );

        $this->crearExistencia(
            $mostrador,
            20,
            '2.000'
        );

        $this->simularDependencias(
            ['inventario.trasladar'],
            [
                'presentacion_id' => 20,
                'nombre' => 'Torta mediana',
                'disponible' => true,
            ]
        );

        $datos = [
            'tipo_articulo' => 'PRESENTACION',
            'articulo_id' => 20,
            'almacen_origen_id' =>
                $produccion->id_almacen,
            'almacen_destino_id' =>
                $mostrador->id_almacen,
            'cantidad' => '4',
            'motivo' => 'Reposición',
        ];

        $clave = 'traslado-prueba-000008';

        $primera = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/traslados',
                $datos
            );

        $segunda = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/traslados',
                $datos
            );

        $primera->assertStatus(201);
        $segunda->assertStatus(201);

        $this->assertSame(
            $primera->json(
                'movimiento.id_movimiento'
            ),
            $segunda->json(
                'movimiento.id_movimiento'
            )
        );

        $origen = Existencia::query()
            ->where(
                'almacen_id',
                $produccion->id_almacen
            )
            ->firstOrFail();

        $destino = Existencia::query()
            ->where(
                'almacen_id',
                $mostrador->id_almacen
            )
            ->firstOrFail();

        $this->assertSame(
            '6.000',
            $origen->cantidad
        );

        $this->assertSame(
            '6.000',
            $destino->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            1
        );

        $this->assertDatabaseCount(
            'inventario_idempotencia',
            1
        );
    }

    public function test_reusar_clave_con_otro_cuerpo_devuelve_409(): void
    {
        [, $produccion, $mostrador] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $produccion,
            20,
            '10.000'
        );

        $this->crearExistencia(
            $mostrador,
            20,
            '0.000'
        );

        $this->simularDependencias(
            ['inventario.trasladar'],
            [
                'presentacion_id' => 20,
                'nombre' => 'Torta mediana',
                'disponible' => true,
            ]
        );

        $clave = 'traslado-prueba-000009';

        $datos = [
            'tipo_articulo' => 'PRESENTACION',
            'articulo_id' => 20,
            'almacen_origen_id' =>
                $produccion->id_almacen,
            'almacen_destino_id' =>
                $mostrador->id_almacen,
            'cantidad' => '2',
            'motivo' => 'Reposición',
        ];

        $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/traslados',
                $datos
            )
            ->assertStatus(201);

        $datos['cantidad'] = '3';

        $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/traslados',
                $datos
            )
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'CLAVE_IDEMPOTENTE_EN_CONFLICTO'
            );

        $origen = Existencia::query()
            ->where(
                'almacen_id',
                $produccion->id_almacen
            )
            ->firstOrFail();

        $destino = Existencia::query()
            ->where(
                'almacen_id',
                $mostrador->id_almacen
            )
            ->firstOrFail();

        $this->assertSame(
            '8.000',
            $origen->cantidad
        );

        $this->assertSame(
            '2.000',
            $destino->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            1
        );
    }

    private function simularDependencias(
        array $permisos,
        ?array $presentacion = null
    ): void {
        Http::fake(
            function (HttpRequest $request) use (
                $permisos,
                $presentacion
            ) {
                if (
                    str_contains(
                        $request->url(),
                        '/api/internal/introspect'
                    )
                ) {
                    return Http::response([
                        'usuario' => [
                            'id_usuario' => 1,
                            'activo' => true,
                            'permisos' => $permisos,
                        ],
                    ], 200);
                }

                if (
                    str_contains(
                        $request->url(),
                        '/api/presentaciones/20'
                    )
                ) {
                    if ($presentacion === null) {
                        return Http::response(
                            [],
                            404
                        );
                    }

                    return Http::response([
                        'presentacion' =>
                            $presentacion,
                    ], 200);
                }

                return Http::response([], 404);
            }
        );
    }

    private function crearAlmacenes(): array
    {
        return [
            Almacen::create([
                'nombre' => 'Materias primas',
                'tipo' => 'MATERIAS_PRIMAS',
                'activo' => true,
            ]),

            Almacen::create([
                'nombre' => 'Producción',
                'tipo' => 'PRODUCCION',
                'activo' => true,
            ]),

            Almacen::create([
                'nombre' => 'Mostrador',
                'tipo' => 'MOSTRADOR',
                'activo' => true,
            ]),
        ];
    }

    private function crearExistencia(
        Almacen $almacen,
        int $articuloId,
        string $cantidad
    ): Existencia {
        return Existencia::create([
            'almacen_id' =>
                $almacen->id_almacen,
            'tipo_articulo' =>
                'PRESENTACION',
            'articulo_id' =>
                $articuloId,
            'cantidad' =>
                $cantidad,
            'unidad' =>
                'unidad',
        ]);
    }
}