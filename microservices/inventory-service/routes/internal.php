<?php

use App\Http\Controllers\ProduccionInventarioController;
use App\Http\Middleware\AutorizarServicioInternoInventario;
use Illuminate\Support\Facades\Route;

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