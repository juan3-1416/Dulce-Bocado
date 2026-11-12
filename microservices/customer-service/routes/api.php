<?php

use App\Http\Controllers\Api\Clientes\ClienteController;
use App\Http\Middleware\AutorizarPermisoClientes;
use Illuminate\Support\Facades\Route;

Route::prefix('clientes')
    ->group(function () {
        Route::get(
            '/',
            [ClienteController::class, 'index']
        )->middleware(
            AutorizarPermisoClientes::class . ':clientes.ver'
        );

        Route::post(
            '/',
            [ClienteController::class, 'store']
        )->middleware(
            AutorizarPermisoClientes::class . ':clientes.crear'
        );

        Route::get(
            '/{id}',
            [ClienteController::class, 'show']
        )
            ->middleware(
                AutorizarPermisoClientes::class . ':clientes.ver,interno'
            )
            ->whereNumber('id');

        Route::put(
            '/{id}',
            [ClienteController::class, 'update']
        )
            ->middleware(
                AutorizarPermisoClientes::class . ':clientes.modificar'
            )
            ->whereNumber('id');

        Route::patch(
            '/{id}/estado',
            [ClienteController::class, 'updateEstado']
        )
            ->middleware(
                AutorizarPermisoClientes::class . ':clientes.cambiar_estado'
            )
            ->whereNumber('id');
    });