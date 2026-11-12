<?php

use App\Http\Controllers\CatalogoController;
use App\Http\Middleware\AutorizarPermisoCatalogo;
use Illuminate\Support\Facades\Route;

Route::get('/categorias', [CatalogoController::class, 'categorias'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.ver');
Route::post('/categorias', [CatalogoController::class, 'guardarCategoria'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.gestionar');
Route::put('/categorias/{categoria}', [CatalogoController::class, 'actualizarCategoria'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.gestionar')->whereNumber('categoria');

Route::get('/productos', [CatalogoController::class, 'productos'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.ver');
Route::post('/productos', [CatalogoController::class, 'guardarProducto'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.gestionar');
Route::put('/productos/{producto}', [CatalogoController::class, 'actualizarProducto'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.gestionar')->whereNumber('producto');

Route::get('/presentaciones', [CatalogoController::class, 'presentaciones'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.ver');
Route::post('/presentaciones', [CatalogoController::class, 'guardarPresentacion'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.gestionar');
Route::get('/presentaciones/{presentacion}', [CatalogoController::class, 'presentacion'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.ver,interno')->whereNumber('presentacion');
Route::put('/presentaciones/{presentacion}', [CatalogoController::class, 'actualizarPresentacion'])
    ->middleware(AutorizarPermisoCatalogo::class.':catalogo.gestionar')->whereNumber('presentacion');
