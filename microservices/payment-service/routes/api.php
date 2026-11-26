<?php

use App\Http\Controllers\PagoController;
use App\Http\Controllers\ReciboController;
use App\Http\Controllers\VentaPagoInternoController;
use App\Http\Middleware\AutorizarPermisoPagos;
use App\Http\Middleware\AutorizarServicioInternoPagos;
use Illuminate\Support\Facades\Route;

Route::get(
    '/internal/ventas/{venta}/pagos',
    [VentaPagoInternoController::class, 'show']
)->whereNumber('venta')
    ->middleware(
        AutorizarServicioInternoPagos::class
    );

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

/*
|--------------------------------------------------------------------------
| Rutas de Pagos QR Libélula (HU12 / T408)
|--------------------------------------------------------------------------
*/
Route::post(
    '/pagos/qr',
    [PagoController::class, 'storeQr']
)->middleware(
    AutorizarPermisoPagos::class.
        ':pagos.crear'
);

Route::get(
    '/pagos/qr/{id}',
    [PagoController::class, 'showQr']
)->where('id', '[0-9]+')->middleware(
    AutorizarPermisoPagos::class.
        ':pagos.ver'
);

// Callback público de Libélula (aviso por GET o POST con transaction_id)
Route::match(
    ['GET', 'POST'],
    '/pagos/qr/callback',
    [PagoController::class, 'callbackQr']
);

/*
|--------------------------------------------------------------------------
| Rutas de Recibos Internos (HU13 / T411)
|--------------------------------------------------------------------------
*/
Route::get(
    '/recibos',
    [ReciboController::class, 'index']
)->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.ver'
);

Route::get(
    '/recibos/catalogos',
    [ReciboController::class, 'catalogos']
)->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.crear'
);

Route::post(
    '/recibos',
    [ReciboController::class, 'store']
)->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.crear'
);

Route::get(
    '/recibos/{id}',
    [ReciboController::class, 'show']
)->where('id', '[0-9]+')->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.ver'
);

Route::get(
    '/recibos/{id}/pdf',
    [ReciboController::class, 'pdf']
)->where('id', '[0-9]+')->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.ver'
);

Route::match(
    ['POST', 'PATCH'],
    '/recibos/{id}/anular',
    [ReciboController::class, 'anular']
)->where('id', '[0-9]+')->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.anular'
);

Route::match(
    ['POST', 'PATCH'],
    '/recibos/{id}/imprimir',
    [ReciboController::class, 'imprimir']
)->where('id', '[0-9]+')->middleware(
    AutorizarPermisoPagos::class.
        ':recibos.ver'
);