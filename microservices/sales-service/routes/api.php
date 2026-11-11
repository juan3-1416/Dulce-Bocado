<?php

use App\Http\Controllers\VentaController;
use App\Http\Middleware\AutorizarPermisoVentas;
use Illuminate\Support\Facades\Route;

Route::get('/ventas', [VentaController::class, 'index'])->middleware(AutorizarPermisoVentas::class.':ventas.ver');
Route::post('/ventas', [VentaController::class, 'store'])->middleware(AutorizarPermisoVentas::class.':ventas.crear');
Route::get('/ventas/{venta}', [VentaController::class, 'show'])->middleware(AutorizarPermisoVentas::class.':ventas.ver');
Route::put('/ventas/{venta}', [VentaController::class, 'update'])->middleware(AutorizarPermisoVentas::class.':ventas.modificar');
Route::post('/ventas/{venta}/anular', [VentaController::class, 'cancel'])->middleware(AutorizarPermisoVentas::class.':ventas.anular');
