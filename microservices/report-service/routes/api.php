<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReporteController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
Route::get('/health', function () {
    try {
        $dbStatus = 'ok';
        $dbName = null;
        try {
            $db = DB::selectOne('SELECT current_database() as db');
            $dbName = $db?->db;
        } catch (\Throwable) {
            $dbStatus = 'disconnected';
        }

        return response()->json([
            'status' => 'ok',
            'service' => 'report-service',
            'version' => '1.0.0',
            'database' => [
                'status' => $dbStatus,
                'name' => $dbName,
            ],
            'timestamp' => now()->toIso8601String(),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'degraded',
            'service' => 'report-service',
            'error' => $e->getMessage(),
        ], 500);
    }
});

/*
|--------------------------------------------------------------------------
| CU24 / HU22 - Dashboard Interactivo y KPIs
|--------------------------------------------------------------------------
*/
Route::prefix('dashboard')
    ->middleware(['permiso.reportes:dashboard.consultar'])
    ->group(function () {
        Route::get('/', [DashboardController::class, 'resumen']);
        Route::get('/resumen', [DashboardController::class, 'resumen']);
    });

/*
|--------------------------------------------------------------------------
| CU25 / HU23 - Generar y Enviar Reportes
|--------------------------------------------------------------------------
*/
Route::prefix('reportes')->group(function () {
    // Consultas y PDF protegidos por permiso de generación/visualización
    Route::middleware(['permiso.reportes:reportes.generar'])->group(function () {
        Route::get('/ventas', [ReporteController::class, 'ventas']);
        Route::get('/pedidos', [ReporteController::class, 'pedidos']);
        Route::get('/inventario', [ReporteController::class, 'inventario']);

        Route::get('/{tipo}/pdf', [ReporteController::class, 'pdf'])
            ->where('tipo', 'ventas|pedidos|inventario');

        Route::get('/envios/{id}', [ReporteController::class, 'estadoEnvio']);
    });

    // Envío por correo protegido por permiso de envío (o generar)
    Route::middleware(['permiso.reportes:reportes.enviar'])->group(function () {
        Route::post('/{tipo}/enviar', [ReporteController::class, 'enviar'])
            ->where('tipo', 'ventas|pedidos|inventario');
    });
});
