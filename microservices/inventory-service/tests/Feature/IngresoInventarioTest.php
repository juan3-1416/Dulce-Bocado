<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IngresoInventarioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.security.url', 'http://security-service:8000');
        config()->set('services.security.key', 'security-test-key');
        config()->set('services.security.timeout', 1);

        config()->set('services.catalog.url', 'http://catalog-service:8000');
        config()->set('services.catalog.key', 'catalog-test-key');
        config()->set('services.catalog.timeout', 1);
    }

    public function test_ingreso_requiere_token(): void
    {
        $response = $this->postJson('/api/ingresos', []);

        $response
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'TOKEN_REQUERIDO');
    }

    public function test_usuario_sin_permiso_recibe_403(): void
    {
        $this->simularDependencias([]);

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'inventario-prueba-000001'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' => 1,
                'cantidad' => '2.500',
                'motivo' => 'Compra',
            ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'PERMISO_DENEGADO');
    }

    public function test_ingreso_materia_prima_actualiza_saldo_y_movimiento(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => true,
            ]
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'inventario-prueba-000002'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' => $materias->id_almacen,
                'cantidad' => '2.500',
                'motivo' => 'Compra de insumo',
                'observaciones' => 'Ingreso inicial',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath(
                'movimiento.tipo',
                'INGRESO'
            )
            ->assertJsonPath(
                'movimiento.tipo_articulo',
                'MATERIA_PRIMA'
            )
            ->assertJsonPath(
                'movimiento.articulo_id',
                10
            )
            ->assertJsonPath(
                'movimiento.cantidad',
                '2.500'
            )
            ->assertJsonPath(
                'movimiento.unidad',
                'g'
            )
            ->assertJsonPath(
                'existencia.cantidad',
                '2.500'
            );

        $existencia = Existencia::firstOrFail();

        $this->assertSame(
            '2.500',
            $existencia->cantidad
        );

        $this->assertDatabaseCount('movimiento', 1);
        $this->assertDatabaseCount(
            'inventario_idempotencia',
            1
        );
    }

    public function test_ingreso_presentacion_entera_en_produccion(): void
    {
        [, $produccion] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar'],
            null,
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
                'inventario-prueba-000003'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_id' => $produccion->id_almacen,
                'cantidad' => '3',
                'motivo' => 'Producto terminado',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath(
                'existencia.tipo_articulo',
                'PRESENTACION'
            )
            ->assertJsonPath(
                'existencia.cantidad',
                '3.000'
            )
            ->assertJsonPath(
                'existencia.unidad',
                'unidad'
            );

        $this->assertDatabaseCount('movimiento', 1);
    }

    public function test_repetir_misma_clave_no_duplica_ingreso(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => true,
            ]
        );

        $datos = [
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => 10,
            'almacen_id' => $materias->id_almacen,
            'cantidad' => '2.500',
            'motivo' => 'Compra',
        ];

        $clave = 'inventario-prueba-000004';

        $primera = $this
            ->withToken('token-prueba')
            ->withHeader('Idempotency-Key', $clave)
            ->postJson('/api/ingresos', $datos);

        $segunda = $this
            ->withToken('token-prueba')
            ->withHeader('Idempotency-Key', $clave)
            ->postJson('/api/ingresos', $datos);

        $primera->assertStatus(201);
        $segunda->assertStatus(201);

        $this->assertSame(
            $primera->json('movimiento.id_movimiento'),
            $segunda->json('movimiento.id_movimiento')
        );

        $this->assertDatabaseCount('movimiento', 1);
        $this->assertDatabaseCount(
            'inventario_idempotencia',
            1
        );

        $existencia = Existencia::firstOrFail();

        $this->assertSame(
            '2.500',
            $existencia->cantidad
        );
    }

    public function test_reusar_clave_con_otro_cuerpo_devuelve_409(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => true,
            ]
        );

        $clave = 'inventario-prueba-000005';

        $base = [
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => 10,
            'almacen_id' => $materias->id_almacen,
            'cantidad' => '2.500',
            'motivo' => 'Compra',
        ];

        $this
            ->withToken('token-prueba')
            ->withHeader('Idempotency-Key', $clave)
            ->postJson('/api/ingresos', $base)
            ->assertStatus(201);

        $base['cantidad'] = '3.000';

        $this
            ->withToken('token-prueba')
            ->withHeader('Idempotency-Key', $clave)
            ->postJson('/api/ingresos', $base)
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'CLAVE_IDEMPOTENTE_EN_CONFLICTO'
            );

        $this->assertDatabaseCount('movimiento', 1);

        $this->assertSame(
            '2.500',
            Existencia::firstOrFail()->cantidad
        );
    }

    public function test_almacen_incompatible_no_escribe_datos(): void
    {
        [, $produccion] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'inventario-prueba-000006'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' => $produccion->id_almacen,
                'cantidad' => '1.000',
                'motivo' => 'Compra',
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'error.code',
                'ALMACEN_INCOMPATIBLE'
            );

        $this->assertDatabaseCount('existencia', 0);
        $this->assertDatabaseCount('movimiento', 0);
    }

    public function test_cantidad_cero_es_rechazada(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'inventario-prueba-000007'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' => $materias->id_almacen,
                'cantidad' => '0',
                'motivo' => 'Compra',
            ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount('existencia', 0);
        $this->assertDatabaseCount('movimiento', 0);
    }

    public function test_presentacion_decimal_es_rechazada(): void
    {
        [, $produccion] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'inventario-prueba-000008'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'PRESENTACION',
                'articulo_id' => 20,
                'almacen_id' => $produccion->id_almacen,
                'cantidad' => '1.500',
                'motivo' => 'Producto terminado',
            ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount('existencia', 0);
        $this->assertDatabaseCount('movimiento', 0);
    }

    public function test_materia_prima_inactiva_no_modifica_stock(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.ingresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => false,
            ]
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'inventario-prueba-000009'
            )
            ->postJson('/api/ingresos', [
                'tipo_articulo' => 'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' => $materias->id_almacen,
                'cantidad' => '1.000',
                'motivo' => 'Compra',
            ]);

        $response
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'ARTICULO_INACTIVO'
            );

        $this->assertDatabaseCount('existencia', 0);
        $this->assertDatabaseCount('movimiento', 0);
    }

    private function simularDependencias(
        array $permisos,
        ?array $materiaPrima = null,
        ?array $presentacion = null
    ): void {
        Http::fake(function (HttpRequest $request) use (
            $permisos,
            $materiaPrima,
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
                    '/api/materias-primas/10'
                )
            ) {
                if ($materiaPrima === null) {
                    return Http::response([], 404);
                }

                return Http::response([
                    'materia_prima' => $materiaPrima,
                ], 200);
            }

            if (
                str_contains(
                    $request->url(),
                    '/api/presentaciones/20'
                )
            ) {
                if ($presentacion === null) {
                    return Http::response([], 404);
                }

                return Http::response([
                    'presentacion' => $presentacion,
                ], 200);
            }

            return Http::response([], 404);
        });
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
}