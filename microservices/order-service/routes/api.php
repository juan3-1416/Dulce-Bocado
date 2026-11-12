<?php

use App\Http\Controllers\PedidoController;
use App\Http\Middleware\AutorizarPermisoPedidos;
use Illuminate\Support\Facades\Route;

Route::get('/pedidos', [PedidoController::class, 'index'])
    ->middleware(AutorizarPermisoPedidos::class.':pedidos.ver');
Route::post('/pedidos', [PedidoController::class, 'store'])
    ->middleware(AutorizarPermisoPedidos::class.':pedidos.crear');
Route::get('/pedidos/{pedido}', [PedidoController::class, 'show'])
    ->middleware(AutorizarPermisoPedidos::class.':pedidos.ver')->whereNumber('pedido');
Route::put('/pedidos/{pedido}', [PedidoController::class, 'update'])
    ->middleware(AutorizarPermisoPedidos::class.':pedidos.modificar')->whereNumber('pedido');
