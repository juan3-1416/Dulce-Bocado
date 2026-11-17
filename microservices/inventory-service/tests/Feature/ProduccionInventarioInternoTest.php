<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProduccionInventarioInternoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'services.inventory_internal.key',
            'inventory-internal-test-key'
        );
    }

    public function test_ruta_interna_requiere_clave_valida(): void
    {
        $response = $this
            ->withHeader(
                'X-Actor-User-Id',
                '1'
            )
            ->postJson(
                '/internal/producciones/aplicar',
                $this->payload(
                    '11111111-1111-4111-8111-111111111111'
                )
            );

        $response
            ->assertStatus(403)
            ->assertJsonPath(
                'error.code',
                'SERVICIO_INTERNO_NO_AUTORIZADO'
            );
    }

    public function test_ruta_interna_requiere_actor_valido(): void
    {
        $response = $this
            ->withHeader(
                'X-Internal-Service-Key',
                'inventory-internal-test-key'
            )
            ->withHeader(
                'X-Actor-User-Id',
                '0'
            )
            ->postJson(
                '/internal/producciones/aplicar',
                $this->payload(
                    '22222222-2222-4222-8222-222222222222'
                )
            );

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'error.code',
                'ACTOR_INTERNO_INVALIDO'
            );
    }

    public function test_aplica_consumos_y_credita_producto_terminado(): void
    {
        [$insumos, $produccion] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '10.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '33333333-3333-4333-8333-333333333333';

        $response = $this->postInterno(
            $this->payload($operacionId)
        );

        $response
            ->assertStatus(200)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'APLICADA'
            );

        $harina = Existencia::query()
            ->where(
                'almacen_id',
                $insumos->id_almacen
            )
            ->where(
                'tipo_articulo',
                'MATERIA_PRIMA'
            )
            ->where(
                'articulo_id',
                10
            )
            ->firstOrFail();

        $leche = Existencia::query()
            ->where(
                'almacen_id',
                $insumos->id_almacen
            )
            ->where(
                'tipo_articulo',
                'MATERIA_PRIMA'
            )
            ->where(
                'articulo_id',
                11
            )
            ->firstOrFail();

        $terminado = Existencia::query()
            ->where(
                'almacen_id',
                $produccion->id_almacen
            )
            ->where(
                'tipo_articulo',
                'PRESENTACION'
            )
            ->where(
                'articulo_id',
                20
            )
            ->firstOrFail();

        $this->assertSame(
            '7.500',
            $harina->cantidad
        );

        $this->assertSame(
            '5.000',
            $leche->cantidad
        );

        $this->assertSame(
            '4.000',
            $terminado->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            3
        );

        $this->assertDatabaseHas(
            'movimiento',
            [
                'tipo' =>
                    'PRODUCCION_CONSUMO',
                'articulo_id' => 10,
                'referencia_id' =>
                    $operacionId,
            ]
        );

        $this->assertDatabaseHas(
            'movimiento',
            [
                'tipo' =>
                    'PRODUCCION_CONSUMO',
                'articulo_id' => 11,
                'referencia_id' =>
                    $operacionId,
            ]
        );

        $this->assertDatabaseHas(
            'movimiento',
            [
                'tipo' =>
                    'PRODUCCION_INGRESO',
                'articulo_id' => 20,
                'referencia_id' =>
                    $operacionId,
            ]
        );

        $this->assertDatabaseHas(
            'produccion_operacion',
            [
                'operacion_id' =>
                    $operacionId,
                'estado' =>
                    'APLICADA',
            ]
        );
    }

    public function test_stock_insuficiente_rechaza_sin_cambios_parciales(): void
    {
        [$insumos] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '1.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '44444444-4444-4444-8444-444444444444';

        $response = $this->postInterno(
            $this->payload($operacionId)
        );

        $response
            ->assertStatus(409)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'RECHAZADA'
            )
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            )
            ->assertJsonPath(
                'error.details.disponible',
                '1.000'
            )
            ->assertJsonPath(
                'error.details.requerido',
                '2.500'
            );

        $harina = Existencia::query()
            ->where('articulo_id', 10)
            ->firstOrFail();

        $leche = Existencia::query()
            ->where('articulo_id', 11)
            ->firstOrFail();

        $this->assertSame(
            '1.000',
            $harina->cantidad
        );

        $this->assertSame(
            '8.000',
            $leche->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            0
        );

        $this->assertDatabaseCount(
            'existencia',
            2
        );

        $this->assertDatabaseHas(
            'produccion_operacion',
            [
                'operacion_id' =>
                    $operacionId,
                'estado' =>
                    'RECHAZADA',
                'codigo_rechazo' =>
                    'STOCK_INSUFICIENTE',
            ]
        );
    }

    public function test_repetir_operacion_aplicada_no_duplica_movimientos(): void
    {
        [$insumos, $produccion] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '10.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '55555555-5555-4555-8555-555555555555';

        $datos =
            $this->payload($operacionId);

        $primera =
            $this->postInterno($datos);

        $segunda =
            $this->postInterno($datos);

        $primera
            ->assertStatus(200)
            ->assertJsonPath(
                'estado',
                'APLICADA'
            );

        $segunda
            ->assertStatus(200)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'APLICADA'
            );

        $this->assertDatabaseCount(
            'movimiento',
            3
        );

        $harina = Existencia::query()
            ->where('articulo_id', 10)
            ->firstOrFail();

        $leche = Existencia::query()
            ->where('articulo_id', 11)
            ->firstOrFail();

        $terminado = Existencia::query()
            ->where(
                'almacen_id',
                $produccion->id_almacen
            )
            ->where(
                'tipo_articulo',
                'PRESENTACION'
            )
            ->where(
                'articulo_id',
                20
            )
            ->firstOrFail();

        $this->assertSame(
            '7.500',
            $harina->cantidad
        );

        $this->assertSame(
            '5.000',
            $leche->cantidad
        );

        $this->assertSame(
            '4.000',
            $terminado->cantidad
        );

        $this->assertDatabaseCount(
            'produccion_operacion',
            1
        );
    }

    public function test_repetir_rechazo_conserva_resultado_aunque_cambie_stock(): void
    {
        [$insumos] =
            $this->crearAlmacenes();

        $harina = $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '1.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '66666666-6666-4666-8666-666666666666';

        $datos =
            $this->payload($operacionId);

        $primera =
            $this->postInterno($datos);

        $primera
            ->assertStatus(409)
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            );

        $harina->update([
            'cantidad' => '100.000',
        ]);

        $segunda =
            $this->postInterno($datos);

        $segunda
            ->assertStatus(409)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'RECHAZADA'
            )
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            )
            ->assertJsonPath(
                'error.details.disponible',
                '1.000'
            );

        $this->assertSame(
            '100.000',
            $harina->fresh()->cantidad
        );

        $this->assertDatabaseCount(
            'movimiento',
            0
        );

        $this->assertDatabaseCount(
            'produccion_operacion',
            1
        );
    }

    public function test_mismo_operacion_id_con_otro_payload_devuelve_422(): void
    {
        [$insumos] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '10.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '77777777-7777-4777-8777-777777777777';

        $datos =
            $this->payload($operacionId);

        $this
            ->postInterno($datos)
            ->assertStatus(200);

        $datos['cantidad_producida'] = 5;

        $response =
            $this->postInterno($datos);

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'RECHAZADA'
            )
            ->assertJsonPath(
                'error.code',
                'OPERACION_ID_EN_CONFLICTO'
            );

        $this->assertDatabaseCount(
            'movimiento',
            3
        );

        $this->assertDatabaseCount(
            'produccion_operacion',
            1
        );
    }

    public function test_get_permite_reconciliar_operacion_aplicada(): void
    {
        [$insumos] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '10.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '88888888-8888-4888-8888-888888888888';

        $this
            ->postInterno(
                $this->payload($operacionId)
            )
            ->assertStatus(200);

        $response =
            $this->getInterno($operacionId);

        $response
            ->assertStatus(200)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'APLICADA'
            );
    }

    public function test_get_permite_reconciliar_operacion_rechazada(): void
    {
        [$insumos] =
            $this->crearAlmacenes();

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            10,
            '1.000',
            'g'
        );

        $this->crearExistencia(
            $insumos,
            'MATERIA_PRIMA',
            11,
            '8.000',
            'ml'
        );

        $operacionId =
            '99999999-9999-4999-8999-999999999999';

        $this
            ->postInterno(
                $this->payload($operacionId)
            )
            ->assertStatus(409);

        $response =
            $this->getInterno($operacionId);

        $response
            ->assertStatus(200)
            ->assertJsonPath(
                'operacion_id',
                $operacionId
            )
            ->assertJsonPath(
                'estado',
                'RECHAZADA'
            )
            ->assertJsonPath(
                'error.code',
                'STOCK_INSUFICIENTE'
            );
    }

    public function test_get_devuelve_404_si_operacion_no_existe(): void
    {
        $operacionId =
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

        $response =
            $this->getInterno($operacionId);

        $response->assertStatus(404);
    }

    private function postInterno(
        array $datos
    ) {
        return $this
            ->withHeaders([
                'X-Internal-Service-Key' =>
                    'inventory-internal-test-key',

                'X-Actor-User-Id' =>
                    '7',
            ])
            ->postJson(
                '/internal/producciones/aplicar',
                $datos
            );
    }

    private function getInterno(
        string $operacionId
    ) {
        return $this
            ->withHeaders([
                'X-Internal-Service-Key' =>
                    'inventory-internal-test-key',

                'X-Actor-User-Id' =>
                    '7',
            ])
            ->getJson(
                '/internal/producciones/'.
                $operacionId
            );
    }

    private function payload(
        string $operacionId
    ): array {
        return [
            'operacion_id' =>
                $operacionId,

            'presentacion_id' =>
                20,

            'receta_id' =>
                5,

            'cantidad_producida' =>
                4,

            'almacen_insumos_tipo' =>
                'MATERIAS_PRIMAS',

            'almacen_terminados_tipo' =>
                'PRODUCCION',

            'ingredientes' => [
                [
                    'materia_prima_id' => 10,
                    'cantidad' => '2.500',
                    'unidad' => 'g',
                ],
                [
                    'materia_prima_id' => 11,
                    'cantidad' => '3.000',
                    'unidad' => 'ml',
                ],
            ],
        ];
    }

    private function crearAlmacenes(): array
    {
        $insumos = Almacen::create([
            'nombre' => 'Materias primas',
            'tipo' => 'MATERIAS_PRIMAS',
            'activo' => true,
        ]);

        $produccion = Almacen::create([
            'nombre' => 'Producción',
            'tipo' => 'PRODUCCION',
            'activo' => true,
        ]);

        Almacen::create([
            'nombre' => 'Mostrador',
            'tipo' => 'MOSTRADOR',
            'activo' => true,
        ]);

        return [
            $insumos,
            $produccion,
        ];
    }

    private function crearExistencia(
        Almacen $almacen,
        string $tipoArticulo,
        int $articuloId,
        string $cantidad,
        string $unidad
    ): Existencia {
        return Existencia::create([
            'almacen_id' =>
                $almacen->id_almacen,

            'tipo_articulo' =>
                $tipoArticulo,

            'articulo_id' =>
                $articuloId,

            'cantidad' =>
                $cantidad,

            'unidad' =>
                $unidad,
        ]);
    }
}