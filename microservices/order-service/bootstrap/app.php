<?php

use App\Services\Catalogo\CatalogoServiceException;
use App\Services\Clientes\ClienteServiceException;
use App\Services\Pedidos\PedidoException;
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
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $respuesta = fn ($e) => response()->json([
            'error' => [
                'code' => $e->codigo,
                'message' => $e->getMessage(),
                'details' => (object) [],
            ],
        ], $e->httpStatus);

        $exceptions->render(
            fn (ClienteServiceException $e) =>
                $respuesta($e)
        );

        $exceptions->render(
            fn (CatalogoServiceException $e) =>
                $respuesta($e)
        );

        $exceptions->render(
            fn (PedidoException $e) =>
                $respuesta($e)
        );

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) =>
                $request->is('api/*') ||
                $request->expectsJson()
        );
    })
    ->create();