<?php

use App\Http\Controllers\PedidoController;
use App\Http\Middleware\AutorizarPermisoPedidos;
use Illuminate\Support\Facades\Route;

Route::get(
    '/pedidos',
    [PedidoController::class, 'index']
)->middleware(
    AutorizarPermisoPedidos::class
        .':pedidos.gestionar_pedido'
);

Route::post(
    '/pedidos',
    [PedidoController::class, 'store']
)->middleware(
    AutorizarPermisoPedidos::class
        .':pedidos.gestionar_pedido'
);

Route::get(
    '/pedidos/{pedido}',
    [PedidoController::class, 'show']
)->whereNumber('pedido')
    ->middleware(
        AutorizarPermisoPedidos::class
            .':pedidos.gestionar_pedido'
    );

Route::put(
    '/pedidos/{pedido}',
    [PedidoController::class, 'update']
)->whereNumber('pedido')
    ->middleware(
        AutorizarPermisoPedidos::class
            .':pedidos.gestionar_pedido'
    );

Route::patch(
    '/pedidos/{pedido}/estado',
    [PedidoController::class, 'cambiarEstado']
)->whereNumber('pedido')
    ->middleware(
        AutorizarPermisoPedidos::class
            .':pedidos.gestionar_estado_entrega'
    );
