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
        config(['integrations.security.key' => 'test-internal']);
        Http::preventStrayRequests();
        $this->fakeDependencies();
    }

    private function fakeDependencies(array $permissions = ['pagos.crear', 'pagos.ver']): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            'security-service:8000/*' => Http::response(['usuario' => [
                'id_usuario' => 9, 'activo' => true, 'permisos' => $permissions,
            ]]),
            'sales-service:8000/*' => Http::response(['venta' => [
                'id_venta' => 1, 'total' => '100.00', 'estado' => 'CONFIRMADA', 'cliente' => ['nombre' => 'Ana', 'apellido' => 'Gomez'],
            ]]),
            'order-service:8000/*' => Http::response(['pedido' => [
                'id_pedido' => 1, 'total' => '100.00', 'estado' => 'PROGRAMADO', 'cliente' => ['nombre' => 'Carlos', 'apellido' => 'Lopez'],
            ]]),
            'api.libelula.bo/*' => Http::response([
                'error' => 0,
                'mensaje' => 'Deuda registrada correctamente',
                'id_transaccion' => 'LIB-99999',
                'qr_simple_url' => 'https://api.libelula.bo/qr/img/LIB-99999',
                'url_pasarela_pagos' => 'https://pago.libelula.bo/checkout/LIB-99999',
            ], 200),
        ]);
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
            'monto' => 45.00,
        ])->assertCreated();

        $idIntento = $respInicio->json('intento_qr.id_intento_qr');
        $this->assertNotNull($idIntento);

        $intentoDb = DB::table('intento_qr')->where('id_intento_qr', $idIntento)->first();
        $this->assertNotNull($intentoDb);
        $this->assertSame('PENDIENTE', $intentoDb->estado);
        $identificadorEnviado = $intentoDb->referencia_proveedor;

        // 2. Consulta de intento QR
        $this->withHeaders(['Authorization' => 'Bearer test-token'])
            ->getJson("/api/pagos/qr/{$idIntento}")
            ->assertOk()
            ->assertJsonPath('intento_qr.id_intento_qr', $idIntento)
            ->assertJsonPath('intento_qr.estado', 'PENDIENTE');

        // 3. Callback GET enviado por Libélula
        $respCallback = $this->get("/api/pagos/qr/callback?transaction_id={$identificadorEnviado}&error=0&message=Aprobado&cancel_order=0&idqr=LIB-99999&monto_total=45.00");
        $respCallback->assertOk();

        // 4. Verificar confirmación en base de datos
        $intentoConfirmado = DB::table('intento_qr')->where('id_intento_qr', $idIntento)->first();
        $this->assertSame('CONFIRMADA', $intentoConfirmado->estado);

        // Se debió registrar auditoría inmutable en evento_qr
        $this->assertDatabaseHas('evento_qr', [
            'id_intento_qr' => $idIntento,
            'estado_resultante' => 'CONFIRMADA',
        ]);

        // Se debió crear atómicamente el Pago confirmado
        $this->assertDatabaseHas('pago', [
            'origen_tipo' => 'VENTA',
            'origen_id' => 1,
            'monto' => 45.00,
            'medio' => 'QR',
            'estado' => 'CONFIRMADO',
        ]);

        // 5. Reintento de callback no duplica el pago
        $this->get("/api/pagos/qr/callback?transaction_id={$identificadorEnviado}&error=0&message=Aprobado&cancel_order=0&idqr=LIB-99999&monto_total=45.00")->assertOk();
        $this->assertDatabaseCount('pago', 1);
    }
}
