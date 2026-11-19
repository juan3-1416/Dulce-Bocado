<?php

use App\Http\Controllers\ProduccionInventarioController;
use App\Http\Middleware\AutorizarServicioInternoInventario;
use Illuminate\Support\Facades\Route;

Route::post('/internal/ventas/descontar', [\App\Http\Controllers\VentaInventarioController::class, 'aplicar'])
    ->middleware(AutorizarServicioInternoInventario::class.':inventory_sales');
Route::get('/internal/ventas/{operacionId}', [\App\Http\Controllers\VentaInventarioController::class, 'consultar'])
    ->middleware(AutorizarServicioInternoInventario::class.':inventory_sales')->whereUuid('operacionId');

Route::post(
    '/internal/producciones/aplicar',
    [ProduccionInventarioController::class, 'aplicar']
)->middleware(
    AutorizarServicioInternoInventario::class
);

Route::get(
    '/internal/producciones/{operacionId}',
    [ProduccionInventarioController::class, 'consultar']
)->middleware(
    AutorizarServicioInternoInventario::class
)->whereUuid('operacionId');
