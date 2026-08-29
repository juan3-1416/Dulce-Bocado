<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Seguridad\UsuarioController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Seguridad\RolController;

Route::get('/health', function () {
    try {
        $database = DB::selectOne(
            'SELECT current_database() AS database_name, current_user AS database_user'
        );

        return response()->json([
            'status' => 'ok',
            'message' => 'API Dulce Bocado funcionando correctamente.',
            'backend' => 'Laravel',
            'database' => [
                'connection' => DB::connection()->getDriverName(),
                'name' => $database->database_name,
                'user' => $database->database_user,
            ],
        ]);
    } catch (\Throwable $exception) {
        return response()->json([
            'status' => 'error',
            'message' => 'No se pudo establecer conexión con PostgreSQL.',
        ], 500);
    }
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/usuario', [AuthController::class, 'usuario']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::prefix('seguridad')
    ->middleware([
        'auth:sanctum',
        'permiso:seguridad.gestionar_usuario',
    ])
    ->group(function () {
        Route::get(
            '/usuarios',
            [UsuarioController::class, 'index']
        );

        Route::get(
            '/usuarios/{id}',
            [UsuarioController::class, 'show']
        )->whereNumber('id');

        Route::post(
            '/usuarios',
            [UsuarioController::class, 'store']
        );

        Route::put(
            '/usuarios/{id}',
            [UsuarioController::class, 'update']
        )->whereNumber('id');

        Route::patch(
            '/usuarios/{id}/estado',
            [UsuarioController::class, 'updateEstado']
        )->whereNumber('id');
    });
Route::prefix('seguridad')
    ->middleware([
        'auth:sanctum',
        'permiso:seguridad.gestionar_rol',
    ])
    ->group(function () {
        Route::get(
            '/roles',
            [RolController::class, 'index']
        );

        Route::get(
            '/roles/{id}',
            [RolController::class, 'show']
        )->whereNumber('id');

        Route::post(
            '/roles',
            [RolController::class, 'store']
        );

        Route::put(
            '/roles/{id}',
            [RolController::class, 'update']
        )->whereNumber('id');

        Route::patch(
            '/roles/{id}/estado',
            [RolController::class, 'updateEstado']
        )->whereNumber('id');
    });