<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PagoQrTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (! app()->environment('testing') ||
            config('database.default') !== 'pgsql' ||
            config('database.connections.pgsql.database') !== 'dulce_payment_test' ||
            config('database.connections.pgsql.host') !== 'payment-test-db') {
            throw new \RuntimeException('Solo se permite PostgreSQL aislado payment-test-db/dulce_payment_test.');
        }

        $this->artisan('migrate', ['--force' => true])->assertExitCode(0);
        DB::statement('TRUNCATE recibo, evento_qr, pago, intento_qr, pago_idempotencia RESTART IDENTITY CASCADE');
        config([
            'integrations.security.key' => 'test-internal',
            'libelula.app_key' => 'test-key',
            'libelula.registrar_deuda_url' => 'https://libelula.test/registrar',
            'libelula.consultar_pagos_url' => 'https://libelula.test/consultar',
            'libelula.callback_url' => 'https://dulcebocado.test/api/pagos/qr/callback',
        ]);
        Http::preventStrayRequests();
        $this->fakeDependencies();
    }

    private function fakeDependencies(
        array $permissions = ['pagos.crear', 'pagos.ver'],
        bool $pagado = true,
        bool $registroFalla = false
    ): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            'security-service:8000/*' => Http::response(['usuario' => [
                'id_usuario' => 9, 'activo' => true, 'permisos' => $permissions,
            ]]),
            'sales-service:8000/*' => Http::response(['venta' => [
                'id_venta' => 1, 'total' => '100.00', 'estado' => 'BORRADOR', 'cliente' => ['nombre' => 'Ana', 'apellido' => 'Gomez'],
            ]]),
            'order-service:8000/*' => Http::response(['pedido' => [
                'id_pedido' => 1, 'total' => '100.00', 'estado' => 'PROGRAMADO', 'cliente' => ['nombre' => 'Carlos', 'apellido' => 'Lopez'],
            ]]),
            'libelula.test/registrar' => function () use ($registroFalla) {
                if ($registroFalla) {
                    return Http::response([], 503);
                }

                return Http::response([
                    'error' => 0,
                    'mensaje' => 'Deuda registrada correctamente',
                    'id_transaccion' => 'LIB-99999',
                    'qr_simple_url' => 'https://libelula.test/qr/99999',
                    'url_pasarela_pagos' => 'https://libelula.test/checkout/99999',
                ], 200);
            },

            'libelula.test/consultar' => function () use ($pagado) {
                $intento = DB::table('intento_qr')->first();

                return Http::response([
                    'error' => 0,
                    'datos' => $pagado && $intento ? [[
                        'identificador' => $intento->referencia_proveedor,
                        'id_transaccion' => 'LIB-99999',
                        'monto_pagado' => (string) $intento->monto,
                        'moneda' => 'BOB',
                        'fecha_pago' => now()->toDateTimeString(),
                        'pago_anulado' => false,
                    ]] : [],
                ]);
            },
        ]);
    }

    private function iniciarQr(
        string $monto = '100.00',
        string $clave = 'qr-init-test-key-0001'
    ) {
        return $this->withHeaders([
            'Authorization' => 'Bearer test-token',
            'Idempotency-Key' => $clave,
        ])->postJson('/api/pagos/qr', [
            'origen_tipo' => 'VENTA',
            'origen_id' => 1,
            'monto' => $monto,
        ]);
    }

    public function test_venta_no_admite_qr_parcial(): void
    {
        $this->iniciarQr('45.00')
            ->assertConflict()
            ->assertJsonPath('error.code', 'VENTA_PAGO_INCOMPLETO');

        $this->assertDatabaseCount('intento_qr', 0);
        $this->assertDatabaseCount('pago', 0);

        Http::assertNotSent(
            fn ($r) => str_contains($r->url(), 'libelula.test/registrar')
        );
    }

    public function test_qr_pendiente_impide_otro_cobro(): void
    {
        $primero = $this->iniciarQr()->assertCreated();

        $this->iniciarQr()
            ->assertCreated()
            ->assertJsonPath(
                'intento_qr.id_intento_qr',
                $primero->json('intento_qr.id_intento_qr')
            );

        $this->iniciarQr('100.00', 'qr-init-test-key-0002')
            ->assertConflict()
            ->assertJsonPath('error.code', 'QR_PENDIENTE');

        $this->withHeaders([
            'Authorization' => 'Bearer test-token',
            'Idempotency-Key' => 'cash-test-key-000001',
        ])->postJson('/api/pagos/efectivo', [
            'origen_tipo' => 'VENTA',
            'origen_id' => 1,
            'monto' => '100.00',
        ])->assertConflict()
            ->assertJsonPath('error.code', 'QR_PENDIENTE');

        $this->assertDatabaseCount('intento_qr', 1);
        $this->assertDatabaseCount('pago', 0);

        $this->assertCount(1, Http::recorded(
            fn ($r) => str_contains($r->url(), 'libelula.test/registrar')
        ));
    }

    public function test_callback_sin_pago_verificado_no_confirma(): void
    {
        $this->fakeDependencies(pagado: false);

        $this->iniciarQr()->assertCreated();

        $referencia = DB::table('intento_qr')
            ->value('referencia_proveedor');

        $this->getJson(
            '/api/pagos/qr/callback?'.http_build_query([
                'transaction_id' => $referencia,
                'error' => '0',
                'monto_total' => '100.00',
            ])
        )->assertConflict()
            ->assertJsonPath('error.code', 'PAGO_QR_NO_VERIFICADO');

        $this->assertDatabaseCount('pago', 0);
        $this->assertDatabaseHas('intento_qr', [
            'estado' => 'INICIADA',
        ]);
    }

    public function test_fallo_de_pasarela_conserva_reserva_y_permite_recuperacion(): void
    {
        $this->fakeDependencies(
            pagado: false,
            registroFalla: true
        );

        $this->iniciarQr()
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'QR_REGISTRO_INCIERTO');

        $this->assertDatabaseCount('intento_qr', 1);
        $this->assertDatabaseCount('pago', 0);

        $intento = DB::table('intento_qr')->first();

        $this->assertDatabaseHas('pago_idempotencia', [
            'estado' => 'EN_PROCESO',
            'recurso_id' => $intento->id_intento_qr,
        ]);

        $this->iniciarQr()
            ->assertConflict()
            ->assertJsonPath('error.code', 'OPERACION_EN_PROCESO');

        $this->iniciarQr('100.00', 'qr-init-test-key-0002')
            ->assertConflict()
            ->assertJsonPath('error.code', 'QR_PENDIENTE');

        $this->assertCount(1, Http::recorded(
            fn ($r) => str_contains($r->url(), 'libelula.test/registrar')
        ));

        // Simular que posteriormente Libelula acredita el pago.
        $this->fakeDependencies(pagado: true);

        $callback = '/api/pagos/qr/callback?'.http_build_query([
            'transaction_id' => $intento->referencia_proveedor,
            'error' => '0',
        ]);

        $this->getJson($callback)->assertOk();
        $this->getJson($callback)->assertOk();

        $this->assertDatabaseCount('pago', 1);

        $this->assertDatabaseHas('intento_qr', [
            'id_intento_qr' => $intento->id_intento_qr,
            'estado' => 'CONFIRMADA',
        ]);

        $this->assertDatabaseHas('pago_idempotencia', [
            'recurso_id' => $intento->id_intento_qr,
            'estado' => 'COMPLETADA',
        ]);

        $this->iniciarQr()
            ->assertCreated()
            ->assertJsonPath('intento_qr.estado', 'CONFIRMADA');

        Http::assertNotSent(
            fn ($r) => str_contains($r->url(), 'libelula.test/registrar')
        );
    }

    public function test_ciclo_completo_qr_libelula_y_callback(): void
    {
        // 1. Iniciar pago QR
        $respInicio = $this->withHeaders([
            'Authorization' => 'Bearer test-token',
            'Idempotency-Key' => 'qr-init-test-key-0001',
        ])->postJson('/api/pagos/qr', [
            'origen_tipo' => 'VENTA',
            'origen_id' => 1,
            'monto' => 100.00,
        ])->assertCreated();

        $idIntento = $respInicio->json('intento_qr.id_intento_qr');
        $this->assertNotNull($idIntento);

        $intentoDb = DB::table('intento_qr')->where('id_intento_qr', $idIntento)->first();
        $this->assertNotNull($intentoDb);
        $this->assertSame('INICIADA', $intentoDb->estado);
        $identificadorEnviado = $intentoDb->referencia_proveedor;

        // 2. Consulta de intento QR
        $this->withHeaders(['Authorization' => 'Bearer test-token'])
            ->getJson("/api/pagos/qr/{$idIntento}")
            ->assertOk()
            ->assertJsonPath('intento_qr.id_intento_qr', $idIntento)
            ->assertJsonPath('intento_qr.estado', 'INICIADA');

        // 3. Callback GET enviado por Libélula
        $respCallback = $this->get("/api/pagos/qr/callback?transaction_id={$identificadorEnviado}&error=0&message=Aprobado&cancel_order=0&idqr=LIB-99999&monto_total=100.00");
        $respCallback->assertOk();

        // 4. Verificar confirmación en base de datos
        $intentoConfirmado = DB::table('intento_qr')->where('id_intento_qr', $idIntento)->first();
        $this->assertSame('CONFIRMADA', $intentoConfirmado->estado);

        // Se debió registrar auditoría inmutable en evento_qr
        $this->assertDatabaseHas('evento_qr', [
            'intento_qr_id' => $idIntento,
            'estado_normalizado' => 'CONFIRMADA',
        ]);

        // Se debió crear atómicamente el Pago confirmado
        $this->assertDatabaseHas('pago', [
            'origen_tipo' => 'VENTA',
            'origen_id' => 1,
            'monto' => 100.00,
            'medio' => 'QR',
            'estado' => 'CONFIRMADO',
        ]);

        // 5. Reintento de callback no duplica el pago
        $this->get("/api/pagos/qr/callback?transaction_id={$identificadorEnviado}&error=0&message=Aprobado&cancel_order=0&idqr=LIB-99999&monto_total=100.00")->assertOk();
        $this->assertDatabaseCount('pago', 1);
    }
}
