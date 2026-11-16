<?php

use App\Services\Catalogo\CatalogoRecetaException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Las rutas públicas y sus permisos se incorporarán con T310.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(fn (CatalogoRecetaException $e) => response()->json([
            'error' => [
                'code' => $e->codigo,
                'message' => $e->getMessage(),
                'details' => (object) [],
            ],
        ], $e->httpStatus));

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })
    ->create();
