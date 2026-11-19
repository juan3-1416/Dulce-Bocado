<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class PagoEfectivoTest extends TestCase
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

    private function fakeDependencies(array $permissions = ['pagos.crear', 'pagos.ver'], string $state = 'CONFIRMADA', int $status = 200): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            'security-service:8000/*' => Http::response(['usuario' => [
                'id_usuario' => 9, 'activo' => true, 'permisos' => $permissions,
            ]]),
            'sales-service:8000/*' => Http::response(['venta' => [
                'id_venta' => 1, 'total' => '100.00', 'estado' => $state,
            ]], $status),
            'order-service:8000/*' => Http::response(['pedido' => [
                'id_pedido' => 1, 'total' => '100.00', 'estado' => 'PROGRAMADO',
            ]]),
        ]);
    }

    private function pay(string $amount = '40.00', string $key = 'payment-test-key-0001', string $type = 'VENTA'): TestResponse
    {
        return $this->withHeaders(['Authorization' => 'Bearer test-token', 'Idempotency-Key' => $key])
            ->postJson('/api/pagos/efectivo', ['origen_tipo' => $type, 'origen_id' => 1, 'monto' => $amount]);
    }

    public function test_partial_payments_balance_and_replay(): void
    {
        $first = $this->pay()->assertCreated()->assertJsonPath('resumen.saldo', '60.00');
        $this->pay()->assertCreated()->assertExactJson($first->json());
        $this->pay('60.00', 'payment-test-key-0002')->assertCreated()->assertJsonPath('resumen.saldo', '0.00');
        $this->getJson('/api/pagos?origen=VENTA&origen_id=1')->assertOk()->assertJsonPath('pagado', '100.00')->assertJsonCount(2, 'pagos');
        $this->assertDatabaseCount('pago', 2);
        DB::purge('pgsql');
        $this->assertSame('100.00', DB::table('pago')->sum('monto'));
    }

    public function test_overpayment_and_conflicting_key_do_not_create_payments(): void
    {
        $this->pay()->assertCreated();
        $this->pay('41.00')->assertConflict()->assertJsonPath('error.code', 'CLAVE_IDEMPOTENTE_CONFLICTIVA');
        $this->pay('61.00', 'payment-test-key-0002')->assertConflict()->assertJsonPath('error.code', 'SOBREPAGO');
        $this->pay('61.00', 'payment-test-key-0002')->assertConflict();
        $this->assertDatabaseCount('pago', 1);
    }

    public static function invalidAmounts(): array
    {
        return array_map(fn ($v) => [$v], ['0', '-1', '0.001', '1.999', '1e2', '10000000000.00', 'abc']);
    }

    #[DataProvider('invalidAmounts')]
    public function test_invalid_amount_is_rejected(string $amount): void
    {
        $this->pay($amount)->assertUnprocessable()->assertJsonValidationErrors('monto');
        $this->assertDatabaseCount('pago', 0);
    }

    public function test_missing_token_and_permission_are_rejected(): void
    {
        $this->postJson('/api/pagos/efectivo', [])->assertUnauthorized();
        $this->fakeDependencies([]);
        $this->pay()->assertForbidden();
        $this->getJson('/api/pagos?origen=VENTA&origen_id=1')->assertForbidden();
        $this->assertDatabaseCount('pago', 0);
    }

    public function test_unconfirmed_sale_and_unavailable_origin_are_rejected(): void
    {
        $this->fakeDependencies(state: 'BORRADOR');
        $this->pay()->assertConflict()->assertJsonPath('error.code', 'VENTA_NO_CONFIRMADA');
        $this->fakeDependencies(status: 503);
        $this->pay()->assertStatus(503);
        $this->assertDatabaseCount('pago', 0);
    }

    public function test_order_payment_does_not_write_to_order_service(): void
    {
        $this->pay(type: 'PEDIDO')->assertCreated();
        Http::assertNotSent(fn ($r) => str_contains($r->url(), 'order-service') && $r->method() !== 'GET');
        $this->assertDatabaseHas('pago', ['origen_tipo' => 'PEDIDO', 'actor_usuario_id' => 9]);
    }

    public function test_invalid_token_security_outage_and_origin_access(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['security-service:8000/*' => Http::response([], 401)]);
        $this->pay()->assertUnauthorized();
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['security-service:8000/*' => Http::response([], 503)]);
        $this->pay()->assertStatus(503);
        $this->fakeDependencies(status: 403);
        $this->pay()->assertForbidden();
        $this->fakeDependencies(status: 404);
        $this->pay()->assertNotFound();
        $this->assertDatabaseCount('pago', 0);
    }

    public function test_concurrent_payments_cannot_overpay(): void
    {
        $this->runConcurrent(false);
    }

    public function test_concurrent_same_key_creates_one_payment(): void
    {
        $this->runConcurrent(true);
    }

    private function runConcurrent(bool $sameKey): void
    {
        $start = (string) (microtime(true) + 2);
        $processes = [];
        foreach ([1, 2] as $i) {
            $key = 'concurrent-payment-'.($sameKey ? 1 : $i);
            $p = new Process([PHP_BINARY, base_path('tests/Support/payment-worker.php'), $key, $start]);
            $p->setTimeout(30);
            $p->start();
            $processes[] = $p;
        }
        $statuses = [];
        foreach ($processes as $p) {
            $p->wait();
            $this->assertTrue($p->isSuccessful(), $p->getErrorOutput());
            $statuses[] = json_decode($p->getOutput(), true, flags: JSON_THROW_ON_ERROR)['status'];
        }
        sort($statuses);
        $this->assertSame($sameKey ? [201, 201] : [201, 409], $statuses);
        $this->assertDatabaseCount('pago', 1);
        $this->assertSame('70.00', DB::table('pago')->sum('monto'));
    }

    public function test_invalid_idempotency_key_and_spoofed_actor(): void
    {
        $this->pay(key: 'short')->assertUnprocessable();
        $this->withHeaders(['X-Actor-User-Id' => '999'])->pay()->assertCreated();
        $this->assertDatabaseHas('pago', ['actor_usuario_id' => 9]);
    }
}
