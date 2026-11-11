<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\PermisoController;
use App\Http\Controllers\RolPermisoController;
use App\Http\Controllers\AsignacionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Autenticación
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Usuarios
|--------------------------------------------------------------------------
*/

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

        /*
         * HU6 / T10
         * Consultar accesos asignados a un usuario.
         */
        Route::get('/{usuario}/accesos', [
            AsignacionController::class,
            'accesosUsuario',
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

/*
|--------------------------------------------------------------------------
| Roles
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')
    ->prefix('roles')
    ->group(function () {
        Route::get('/', [
            RolController::class,
            'index',
        ]);

        Route::post('/', [
            RolController::class,
            'store',
        ]);

        /*
         * HU5 / T10
         * Consultar y sincronizar permisos de un rol.
         */
        Route::get('/{rol}/permisos', [
            RolPermisoController::class,
            'permisosRol',
        ]);

        Route::put('/{rol}/permisos', [
            RolPermisoController::class,
            'sincronizarPermisos',
        ]);

        Route::get('/{rol}', [
            RolController::class,
            'show',
        ]);

        Route::match(
            ['put', 'patch'],
            '/{rol}',
            [
                RolController::class,
                'update',
            ]
        );

        Route::patch('/{rol}/estado', [
            RolController::class,
            'cambiarEstado',
        ]);
    });

/*
|--------------------------------------------------------------------------
| Permisos
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')
    ->prefix('permisos')
    ->group(function () {
        Route::get('/', [
            PermisoController::class,
            'index',
        ]);

        Route::post('/', [
            PermisoController::class,
            'store',
        ]);

        Route::get('/{permiso}', [
            PermisoController::class,
            'show',
        ]);

        Route::match(
            ['put', 'patch'],
            '/{permiso}',
            [
                PermisoController::class,
                'update',
            ]
        );

        Route::patch('/{permiso}/estado', [
            PermisoController::class,
            'cambiarEstado',
        ]);
    });

/*
|--------------------------------------------------------------------------
| Asignaciones de acceso
|--------------------------------------------------------------------------
|
| POST   /api/asignaciones
| DELETE /api/asignaciones/{asignacion}
|
| Los endpoints asignar-rol y quitar-rol son auxiliares para la
| interfaz React actual, que administra un rol completo por usuario.
|
*/

Route::middleware('auth:sanctum')
    ->prefix('asignaciones')
    ->group(function () {
        Route::get('/', [
            AsignacionController::class,
            'index',
        ]);

        Route::post('/', [
            AsignacionController::class,
            'store',
        ]);

        Route::post('/asignar-rol', [
            AsignacionController::class,
            'asignarRol',
        ]);

        Route::post('/quitar-rol', [
            AsignacionController::class,
            'quitarRol',
        ]);

        Route::delete('/{asignacion}', [
            AsignacionController::class,
            'destroy',
        ]);
    });