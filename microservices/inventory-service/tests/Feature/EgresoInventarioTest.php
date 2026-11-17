<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EgresoInventarioTest extends TestCase
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

    public function test_egreso_requiere_token(): void
    {
        $response = $this->postJson(
            '/api/egresos',
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
                'egreso-prueba-000001'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' => 1,
                'cantidad' => '1.000',
                'motivo' => 'Consumo',
            ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath(
                'error.code',
                'PERMISO_DENEGADO'
            );
    }

    public function test_egreso_descuenta_stock_y_crea_movimiento(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->crearExistencia(
            $materias,
            'MATERIA_PRIMA',
            10,
            '5.000',
            'g'
        );

        $this->simularDependencias(
            ['inventario.egresar'],
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
                'egreso-prueba-000002'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' =>
                    $materias->id_almacen,
                'cantidad' => '2.500',
                'motivo' =>
                    'Consumo de producción',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath(
                'movimiento.tipo',
                'EGRESO'
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

        $this->assertSame(
            '2.500',
            Existencia::firstOrFail()->cantidad
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

    public function test_egreso_puede_dejar_stock_exactamente_en_cero(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->crearExistencia(
            $materias,
            'MATERIA_PRIMA',
            10,
            '5.000',
            'g'
        );

        $this->simularDependencias(
            ['inventario.egresar'],
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
                'egreso-prueba-000003'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' =>
                    $materias->id_almacen,
                'cantidad' => '5.000',
                'motivo' => 'Consumo total',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath(
                'existencia.cantidad',
                '0.000'
            );

        $this->assertSame(
            '0.000',
            Existencia::firstOrFail()->cantidad
        );
    }

    public function test_stock_insuficiente_devuelve_409_y_no_modifica_saldo(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->crearExistencia(
            $materias,
            'MATERIA_PRIMA',
            10,
            '5.000',
            'g'
        );

        $this->simularDependencias(
            ['inventario.egresar'],
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
                'egreso-prueba-000004'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' =>
                    $materias->id_almacen,
                'cantidad' => '6.000',
                'motivo' => 'Consumo',
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

        $this->assertSame(
            '5.000',
            Existencia::firstOrFail()->cantidad
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

    public function test_stock_inexistente_se_considera_cero(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.egresar'],
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
                'egreso-prueba-000005'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' =>
                    $materias->id_almacen,
                'cantidad' => '1.000',
                'motivo' => 'Consumo',
            ]);

        $response
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            )
            ->assertJsonPath(
                'error.details.disponible',
                '0.000'
            );

        $this->assertDatabaseCount(
            'movimiento',
            0
        );

        $this->assertDatabaseCount(
            'existencia',
            0
        );
    }

    public function test_repetir_egreso_exitoso_no_descuenta_dos_veces(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->crearExistencia(
            $materias,
            'MATERIA_PRIMA',
            10,
            '5.000',
            'g'
        );

        $this->simularDependencias(
            ['inventario.egresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => true,
            ]
        );

        $datos = [
            'tipo_articulo' =>
                'MATERIA_PRIMA',
            'articulo_id' => 10,
            'almacen_id' =>
                $materias->id_almacen,
            'cantidad' => '2.000',
            'motivo' => 'Consumo',
        ];

        $clave = 'egreso-prueba-000006';

        $primera = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/egresos',
                $datos
            );

        $segunda = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/egresos',
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

        $this->assertSame(
            '3.000',
            Existencia::firstOrFail()->cantidad
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

    public function test_repetir_rechazo_de_stock_conserva_el_mismo_resultado(): void
    {
        [$materias] = $this->crearAlmacenes();

        $existencia = $this->crearExistencia(
            $materias,
            'MATERIA_PRIMA',
            10,
            '5.000',
            'g'
        );

        $this->simularDependencias(
            ['inventario.egresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => true,
            ]
        );

        $datos = [
            'tipo_articulo' =>
                'MATERIA_PRIMA',
            'articulo_id' => 10,
            'almacen_id' =>
                $materias->id_almacen,
            'cantidad' => '6.000',
            'motivo' => 'Consumo',
        ];

        $clave = 'egreso-prueba-000007';

        $primera = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/egresos',
                $datos
            );

        $primera
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            )
            ->assertJsonPath(
                'error.details.disponible',
                '5.000'
            );

        $existencia->update([
            'cantidad' => '10.000',
        ]);

        $segunda = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/egresos',
                $datos
            );

        $segunda
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            )
            ->assertJsonPath(
                'error.details.disponible',
                '5.000'
            );

        $this->assertSame(
            '10.000',
            $existencia->fresh()->cantidad
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

    public function test_reusar_clave_con_otro_cuerpo_devuelve_409(): void
    {
        [$materias] = $this->crearAlmacenes();

        $this->crearExistencia(
            $materias,
            'MATERIA_PRIMA',
            10,
            '5.000',
            'g'
        );

        $this->simularDependencias(
            ['inventario.egresar'],
            [
                'id_materia_prima' => 10,
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'estado' => true,
            ]
        );

        $clave = 'egreso-prueba-000008';

        $datos = [
            'tipo_articulo' =>
                'MATERIA_PRIMA',
            'articulo_id' => 10,
            'almacen_id' =>
                $materias->id_almacen,
            'cantidad' => '1.000',
            'motivo' => 'Consumo',
        ];

        $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/egresos',
                $datos
            )
            ->assertStatus(201);

        $datos['cantidad'] = '2.000';

        $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                $clave
            )
            ->postJson(
                '/api/egresos',
                $datos
            )
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'CLAVE_IDEMPOTENTE_EN_CONFLICTO'
            );

        $this->assertSame(
            '4.000',
            Existencia::firstOrFail()->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            1
        );
    }

    public function test_presentacion_decimal_es_rechazada(): void
    {
        [, $produccion] =
            $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.egresar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'egreso-prueba-000009'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'PRESENTACION',
                'articulo_id' => 20,
                'almacen_id' =>
                    $produccion->id_almacen,
                'cantidad' => '1.500',
                'motivo' => 'Venta',
            ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount(
            'movimiento',
            0
        );
    }

    public function test_almacen_incompatible_no_modifica_stock(): void
    {
        [, $produccion] =
            $this->crearAlmacenes();

        $this->simularDependencias(
            ['inventario.egresar']
        );

        $response = $this
            ->withToken('token-prueba')
            ->withHeader(
                'Idempotency-Key',
                'egreso-prueba-000010'
            )
            ->postJson('/api/egresos', [
                'tipo_articulo' =>
                    'MATERIA_PRIMA',
                'articulo_id' => 10,
                'almacen_id' =>
                    $produccion->id_almacen,
                'cantidad' => '1.000',
                'motivo' => 'Consumo',
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'error.code',
                'ALMACEN_INCOMPATIBLE'
            );

        $this->assertDatabaseCount(
            'movimiento',
            0
        );
    }

    private function simularDependencias(
        array $permisos,
        ?array $materiaPrima = null,
        ?array $presentacion = null
    ): void {
        Http::fake(
            function (HttpRequest $request) use (
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
                        return Http::response(
                            [],
                            404
                        );
                    }

                    return Http::response([
                        'materia_prima' =>
                            $materiaPrima,
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
        string $tipo,
        int $articuloId,
        string $cantidad,
        string $unidad
    ): Existencia {
        return Existencia::create([
            'almacen_id' =>
                $almacen->id_almacen,
            'tipo_articulo' => $tipo,
            'articulo_id' => $articuloId,
            'cantidad' => $cantidad,
            'unidad' => $unidad,
        ]);
    }
}