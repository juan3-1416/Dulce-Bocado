<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

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