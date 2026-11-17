<?php

use App\Models\Produccion;
use App\Services\Produccion\ProduccionService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('produccion:conciliar', function (ProduccionService $service) {
    $revisadas = 0;
    Produccion::where('estado', 'EN_PROCESO')->chunkById(100, function ($lote) use ($service, &$revisadas) {
        foreach ($lote as $produccion) {
            $service->conciliar($produccion);
            $revisadas++;
        }
    }, 'id_produccion');
    $this->info("Producciones revisadas: {$revisadas}");
})->purpose('Conciliar producciones inciertas con Inventory usando su operación original');

Schedule::command('produccion:conciliar')->everyMinute()->withoutOverlapping();
