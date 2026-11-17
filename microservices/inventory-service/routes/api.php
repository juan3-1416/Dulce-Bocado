<?php

use App\Http\Controllers\EgresoController;
use App\Http\Controllers\IngresoController;
use App\Http\Controllers\TrasladoController;
use App\Http\Controllers\InventarioConsultaController;
use App\Http\Middleware\AutorizarPermisoInventario;
use Illuminate\Support\Facades\Route;

Route::get(
    '/almacenes',
    [InventarioConsultaController::class, 'almacenes']
)->middleware(
    AutorizarPermisoInventario::class.':inventario.ver'
);

Route::get(
    '/existencias',
    [InventarioConsultaController::class, 'existencias']
)->middleware(
    AutorizarPermisoInventario::class.':inventario.ver'
);

Route::post(
    '/ingresos',
    [IngresoController::class, 'store']
)->middleware(
    AutorizarPermisoInventario::class.':inventario.ingresar'
);
Route::post(
    '/egresos',
    [EgresoController::class, 'store']
)->middleware(
    AutorizarPermisoInventario::class.':inventario.egresar'
);
Route::post(
    '/traslados',
    [TrasladoController::class, 'store']
)->middleware(
    AutorizarPermisoInventario::class.':inventario.trasladar'
);
Route::get(
    '/movimientos',
    [InventarioConsultaController::class, 'movimientos']
)->middleware(
    AutorizarPermisoInventario::class.':inventario.ver'
);