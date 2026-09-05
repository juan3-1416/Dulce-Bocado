<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Clientes\ClienteController;
use App\Http\Controllers\Api\Productos\CategoriaController;
use App\Http\Controllers\Api\Productos\ProductoController;
use App\Http\Controllers\Api\Productos\PresentacionController;
use App\Http\Controllers\Api\Seguridad\UsuarioController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Seguridad\RolController;
use App\Http\Controllers\Api\Seguridad\PermisoController;
use App\Http\Controllers\Api\Seguridad\RolPermisoController;
use App\Http\Controllers\Api\Recetas\MateriaPrimaController;
use App\Http\Controllers\Api\Seguridad\UsuarioRolPermisoController;
use App\Http\Controllers\Api\Recetas\RecetaController;
use App\Http\Controllers\Api\Ventas\VentaController;
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
Route::prefix('seguridad')
    ->middleware([
        'auth:sanctum',
        'permiso:seguridad.gestionar_permiso',
    ])
    ->group(function () {
        Route::get(
            '/permisos',
            [PermisoController::class, 'index']
        );

        Route::get(
            '/permisos/{id}',
            [PermisoController::class, 'show']
        )->whereNumber('id');

        Route::post(
            '/permisos',
            [PermisoController::class, 'store']
        );

        Route::put(
            '/permisos/{id}',
            [PermisoController::class, 'update']
        )->whereNumber('id');

        Route::patch(
            '/permisos/{id}/estado',
            [PermisoController::class, 'updateEstado']
        )->whereNumber('id');
    });
Route::prefix('seguridad')
    ->middleware([
        'auth:sanctum',
        'permiso:seguridad.gestionar_rol_permiso',
    ])
    ->group(function () {
        Route::get(
            '/rol-permisos',
            [RolPermisoController::class, 'index']
        );

        Route::get(
            '/rol-permisos/catalogos',
            [RolPermisoController::class, 'catalogos']
        );

        Route::post(
            '/rol-permisos',
            [RolPermisoController::class, 'store']
        );

        Route::delete(
            '/rol-permisos/{id}',
            [RolPermisoController::class, 'destroy']
        )->whereNumber('id');
    });

Route::prefix('seguridad')
    ->middleware([
        'auth:sanctum',
        'permiso:seguridad.asignar_roles_permisos',
    ])
    ->group(function () {
        Route::get(
            '/usuario-rol-permisos',
            [UsuarioRolPermisoController::class, 'index']
        );
        Route::get(
            '/usuario-rol-permisos/catalogos',
            [UsuarioRolPermisoController::class, 'catalogos']
        );
        Route::post(
            '/usuario-rol-permisos',
            [UsuarioRolPermisoController::class, 'store']
        );
        Route::post(
            '/usuario-rol-permisos/asignar-rol',
            [UsuarioRolPermisoController::class, 'asignarRol']
        );
        Route::delete('/usuario-rol-permisos/{id}', [UsuarioRolPermisoController::class, 'destroy'])->whereNumber('id');
        Route::post('/usuario-rol-permisos/quitar-rol', [UsuarioRolPermisoController::class, 'quitarRol']);
    });

Route::middleware(['auth:sanctum'])->prefix('productos')->group(function () {
    // Categorías y Productos (gestión de producto)
    Route::middleware('permiso:productos.gestionar_producto')->group(function () {
        Route::get('/categorias', [CategoriaController::class, 'index']);
        Route::post('/categorias', [CategoriaController::class, 'store']);
        Route::put('/categorias/{id}', [CategoriaController::class, 'update'])->whereNumber('id');

        Route::get('/', [ProductoController::class, 'index']);
        Route::post('/', [ProductoController::class, 'store']);
        Route::get('/{id}', [ProductoController::class, 'show'])->whereNumber('id');
        Route::put('/{id}', [ProductoController::class, 'update'])->whereNumber('id');
        Route::patch('/{id}/estado', [ProductoController::class, 'updateEstado'])->whereNumber('id');
    });

    // Presentaciones (gestión de presentaciones, asignaciones y precios)
    Route::middleware('permiso:productos.gestionar_presentacion')->group(function () {
        Route::get('/presentaciones', [PresentacionController::class, 'index']);
        Route::post('/presentaciones', [PresentacionController::class, 'store']);
        Route::put('/presentaciones/{id}', [PresentacionController::class, 'update'])->whereNumber('id');
        Route::patch('/presentaciones/{id}/estado', [PresentacionController::class, 'updateEstado'])->whereNumber('id');

        Route::post('/{id}/presentaciones', [ProductoController::class, 'asignarPresentacion'])->whereNumber('id');
        Route::put('/{id}/presentaciones/{id_presentacion}', [ProductoController::class, 'actualizarPrecioPresentacion'])->whereNumber('id')->whereNumber('id_presentacion');
        Route::delete('/{id}/presentaciones/{id_presentacion}', [ProductoController::class, 'desvincularPresentacion'])->whereNumber('id')->whereNumber('id_presentacion');
    });
});

Route::middleware(['auth:sanctum'])->prefix('clientes')->group(function () {
    Route::middleware('permiso:clientes.gestionar_cliente')->group(function () {
        Route::get('/', [ClienteController::class, 'index']);
        Route::post('/', [ClienteController::class, 'store']);
        Route::get('/{id}', [ClienteController::class, 'show'])->whereNumber('id');
        Route::put('/{id}', [ClienteController::class, 'update'])->whereNumber('id');
        Route::patch('/{id}/estado', [ClienteController::class, 'updateEstado'])->whereNumber('id');
    });
});
Route::prefix('recetas')
    ->middleware([
        'auth:sanctum',
        'permiso:recetas.gestionar_receta',
    ])
    ->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Materias primas
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/materias-primas',
            [MateriaPrimaController::class, 'index']
        );

        Route::post(
            '/materias-primas',
            [MateriaPrimaController::class, 'store']
        );

        Route::get(
            '/materias-primas/{id}',
            [MateriaPrimaController::class, 'show']
        )->whereNumber('id');

        Route::put(
            '/materias-primas/{id}',
            [MateriaPrimaController::class, 'update']
        )->whereNumber('id');

        Route::patch(
            '/materias-primas/{id}/estado',
            [MateriaPrimaController::class, 'updateEstado']
        )->whereNumber('id');

        /*
        |--------------------------------------------------------------------------
        | Recetas
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/',
            [RecetaController::class, 'index']
        );

        Route::post(
            '/',
            [RecetaController::class, 'store']
        );

        Route::get(
            '/{id}',
            [RecetaController::class, 'show']
        )->whereNumber('id');

        Route::put(
            '/{id}',
            [RecetaController::class, 'update']
        )->whereNumber('id');

        Route::patch(
            '/{id}/estado',
            [RecetaController::class, 'updateEstado']
        )->whereNumber('id');

        Route::get(
    '/catalogos',
    [RecetaController::class, 'catalogos']
);

    });
    /*
|--------------------------------------------------------------------------
| CU10 - Gestionar Venta
|--------------------------------------------------------------------------
*/

Route::prefix('ventas')
    ->middleware([
        'auth:sanctum',
        'permiso:ventas.gestionar_venta',
    ])
    ->group(function () {

        Route::get(
            '/',
            [VentaController::class, 'index']
        );

        Route::post(
            '/',
            [VentaController::class, 'store']
        );

        Route::get(
            '/catalogos',
            [VentaController::class, 'catalogos']
        );

        Route::get(
            '/{id}',
            [VentaController::class, 'show']
        )->whereNumber('id');

        Route::put(
            '/{id}',
            [VentaController::class, 'update']
        )->whereNumber('id');

        Route::patch(
            '/{id}/anular',
            [VentaController::class, 'anular']
        )->whereNumber('id');
    });