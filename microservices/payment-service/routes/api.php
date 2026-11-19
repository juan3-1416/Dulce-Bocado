<?php

use App\Http\Controllers\PagoController;
use App\Http\Middleware\AutorizarPermisoPagos;
use Illuminate\Support\Facades\Route;

Route::post(
    '/pagos/efectivo',
    [PagoController::class, 'storeEfectivo']
)->middleware(
    AutorizarPermisoPagos::class.
        ':pagos.crear'
);

Route::get(
    '/pagos',
    [PagoController::class, 'index']
)->middleware(
    AutorizarPermisoPagos::class.
        ':pagos.ver'
);