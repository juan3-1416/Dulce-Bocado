<?php

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