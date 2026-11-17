<?php

use App\Http\Controllers\ProduccionController;
use App\Http\Middleware\AutorizarPermisoProduccion;
use Illuminate\Support\Facades\Route;

Route::get('/producciones', [ProduccionController::class, 'index'])
    ->middleware(AutorizarPermisoProduccion::class.':produccion.ver');
Route::get('/producciones/{produccion}', [ProduccionController::class, 'show'])
    ->whereNumber('produccion')
    ->middleware(AutorizarPermisoProduccion::class.':produccion.ver');
Route::post('/producciones', [ProduccionController::class, 'store'])
    ->middleware(AutorizarPermisoProduccion::class.':produccion.crear');
