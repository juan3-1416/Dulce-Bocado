<?php

use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\RecetaController;
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

Route::get('/materias-primas', [RecetaController::class, 'materiasPrimas'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.ver');
Route::post('/materias-primas', [RecetaController::class, 'guardarMateriaPrima'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.gestionar');
Route::put('/materias-primas/{materiaPrima}', [RecetaController::class, 'actualizarMateriaPrima'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.gestionar')->whereNumber('materiaPrima');
Route::patch('/materias-primas/{materiaPrima}/estado', [RecetaController::class, 'cambiarEstadoMateriaPrima'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.gestionar')->whereNumber('materiaPrima');

Route::get('/recetas', [RecetaController::class, 'recetas'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.ver');
Route::post('/recetas', [RecetaController::class, 'guardarReceta'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.gestionar');
Route::get('/recetas/{receta}', [RecetaController::class, 'receta'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.ver')->whereNumber('receta');
Route::put('/recetas/{receta}', [RecetaController::class, 'actualizarReceta'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.gestionar')->whereNumber('receta');
Route::patch('/recetas/{receta}/estado', [RecetaController::class, 'cambiarEstadoReceta'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.gestionar')->whereNumber('receta');
Route::get('/presentaciones/{presentacion}/receta', [RecetaController::class, 'recetaPorPresentacion'])
    ->middleware(AutorizarPermisoCatalogo::class.':recetas.ver,interno')->whereNumber('presentacion');
