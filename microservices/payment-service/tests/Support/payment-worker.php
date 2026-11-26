<?php

use App\Services\Pagos\OrigenPagoService;
use App\Services\Pagos\PagoEfectivoService;
use App\Services\Pagos\PagoException;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.connections.pgsql.database') !== 'dulce_payment_test' || config('database.connections.pgsql.host') !== 'payment-test-db') {
    throw new RuntimeException('Unsafe test database');
}
$origin = new class extends OrigenPagoService
{
    public function obtener(string $tipo, int $id, string $token, bool $requierePagable = true): array
    {
        return ['tipo' => $tipo, 'id' => $id, 'total' => '100.00', 'moneda' => 'BOB', 'estado' => 'BORRADOR'];
    }
};
while (microtime(true) < (float) $argv[2]) {
    usleep(1000);
}
try {
    $result = (new PagoEfectivoService($origin))->registrar(
        ['origen_tipo' => 'VENTA', 'origen_id' => 1, 'monto' => '100.00'], 9, $argv[1], 'test-token'
    );
    echo json_encode(['status' => $result['status']]);
} catch (PagoException $e) {
    echo json_encode(['status' => $e->httpStatus]);
}
