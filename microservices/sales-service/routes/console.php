<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ventas:auditar', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->error('La auditoría requiere la base PostgreSQL de Sales.');

        return 1;
    }

    $resultado = DB::selectOne(<<<'SQL'
        SELECT
            (SELECT COUNT(*) FROM detalle_venta d
                LEFT JOIN venta v ON v.id_venta = d.id_venta
                WHERE v.id_venta IS NULL) AS detalles_huerfanos,
            (SELECT COUNT(*) FROM detalle_venta
                WHERE subtotal <> ROUND(precio_unitario_snapshot * cantidad + costo_personalizacion, 2)) AS subtotales_incorrectos,
            (SELECT COUNT(*) FROM (
                SELECT v.id_venta
                FROM venta v LEFT JOIN detalle_venta d ON d.id_venta = v.id_venta
                GROUP BY v.id_venta, v.total
                HAVING COUNT(d.id_detalle_venta) = 0 OR v.total <> COALESCE(SUM(d.subtotal), 0)
            ) diferencias) AS totales_incorrectos,
            (SELECT COUNT(*) FROM venta_idempotencia i
                WHERE i.codigo_http IN (200, 201)
                  AND i.respuesta->'venta'->>'id_venta' IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM venta v
                      WHERE v.id_venta = (i.respuesta->'venta'->>'id_venta')::bigint
                  )) AS reintentos_sin_venta
        SQL);

    $hallazgos = (array) $resultado;
    $this->table(['Comprobación', 'Hallazgos'], array_map(
        fn (string $nombre, int $cantidad) => [$nombre, $cantidad],
        array_keys($hallazgos),
        array_map('intval', array_values($hallazgos))
    ));

    if (array_sum($hallazgos) > 0) {
        $this->error('Se encontraron inconsistencias en Sales.');

        return 1;
    }

    $this->info('Sales no presenta inconsistencias locales.');

    return 0;
})->purpose('Comprueba importes, detalles e idempotencia de Sales sin modificar datos');
