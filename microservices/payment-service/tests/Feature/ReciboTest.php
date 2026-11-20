<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReciboTest extends TestCase
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

    private function fakeDependencies(array $permissions = ['recibos.crear', 'recibos.ver', 'recibos.anular', 'pagos.crear', 'pagos.ver']): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            'security-service:8000/*' => Http::response(['usuario' => [
                'id_usuario' => 9, 'nombre' => 'Admin Test', 'activo' => true, 'permisos' => $permissions,
            ]]),
            'sales-service:8000/*' => Http::response(['venta' => [
                'id_venta' => 1, 'total' => '100.00', 'estado' => 'CONFIRMADA', 'cliente' => ['nombre' => 'Juan', 'apellido' => 'Perez'],
                'detalles' => [['descripcion' => 'Torta Chocolate', 'cantidad' => 1, 'precio_unitario' => '100.00', 'subtotal' => '100.00']],
            ]]),
            'order-service:8000/*' => Http::response(['pedido' => [
                'id_pedido' => 1, 'total' => '100.00', 'estado' => 'PROGRAMADO',
            ]]),
        ]);
    }

    private function crearPagoBase(): int
    {
        return DB::table('pago')->insertGetId([
            'origen_tipo' => 'VENTA',
            'origen_id' => 1,
            'monto' => 50.00,
            'moneda' => 'BOB',
            'medio' => 'EFECTIVO',
            'estado' => 'CONFIRMADO',
            'referencia' => 'TEST-PAGO-01',
            'id_usuario' => 9,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'id_pago');
    }

    public function test_crear_recibo_consulta_y_pdf(): void
    {
        $idPago = $this->crearPagoBase();

        $respuesta = $this->withHeaders([
            'Authorization' => 'Bearer test-token',
            'Idempotency-Key' => 'recibo-test-key-0001',
        ])->postJson('/api/recibos', [
            'id_pago' => $idPago,
        ])->assertCreated();

        $idRecibo = $respuesta->json('recibo.id_recibo');
        $this->assertNotNull($idRecibo);
        $this->assertDatabaseHas('recibo', [
            'id_recibo' => $idRecibo,
            'id_pago' => $idPago,
            'estado' => 'EMITIDO',
        ]);

        // Consulta de recibo
        $this->withHeaders(['Authorization' => 'Bearer test-token'])
            ->getJson("/api/recibos/{$idRecibo}")
            ->assertOk()
            ->assertJsonPath('recibo.id_recibo', $idRecibo);

        // Descarga de PDF
        $pdfResp = $this->withHeaders(['Authorization' => 'Bearer test-token'])
            ->get("/api/recibos/{$idRecibo}/pdf")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringStartsWith('%PDF-1.4', $pdfResp->getContent());
    }

    public function test_anular_recibo_conserva_pago(): void
    {
        $idPago = $this->crearPagoBase();

        $respRecibo = $this->withHeaders([
            'Authorization' => 'Bearer test-token',
            'Idempotency-Key' => 'recibo-test-key-0002',
        ])->postJson('/api/recibos', [
            'id_pago' => $idPago,
        ])->assertCreated();

        $idRecibo = $respRecibo->json('recibo.id_recibo');

        // Anular recibo
        $this->withHeaders([
            'Authorization' => 'Bearer test-token',
            'Idempotency-Key' => 'recibo-anular-key-0001',
        ])->postJson("/api/recibos/{$idRecibo}/anular", [
            'motivo_anulacion' => 'Error en datos de facturación del cliente',
        ])->assertOk()
            ->assertJsonPath('recibo.estado', 'ANULADO')
            ->assertJsonPath('recibo.motivo_anulacion', 'Error en datos de facturación del cliente');

        // Verificar que el pago en la base de datos sigue intacto y CONFIRMADO (no se borra ni reembolsa)
        $this->assertDatabaseHas('pago', [
            'id_pago' => $idPago,
            'estado' => 'CONFIRMADO',
        ]);
    }
}
