<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [
        AuthController::class,
        'login',
    ]);

    Route::middleware('auth:sanctum')
        ->group(function () {
            Route::get('/me', [
                AuthController::class,
                'me',
            ]);

            Route::post('/logout', [
                AuthController::class,
                'logout',
            ]);
        });
});

Route::middleware('auth:sanctum')
    ->prefix('usuarios')
    ->group(function () {
        Route::get('/', [
            UsuarioController::class,
            'index',
        ]);

        Route::post('/', [
            UsuarioController::class,
            'store',
        ]);

        Route::get('/{usuario}', [
            UsuarioController::class,
            'show',
        ]);

        Route::match(
            ['put', 'patch'],
            '/{usuario}',
            [
                UsuarioController::class,
                'update',
            ]
        );

        Route::patch('/{usuario}/estado', [
            UsuarioController::class,
            'cambiarEstado',
        ]);
    });