<?php

use App\Services\Pagos\PagoException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(
    basePath: dirname(__DIR__)
)
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(
        function (Middleware $middleware): void {
            //
        }
    )
    ->withExceptions(
        function (Exceptions $exceptions): void {
            $exceptions->render(
                fn (PagoException $e) =>
                    response()->json([
                        'error' => [
                            'code' =>
                                $e->codigo,
                            'message' =>
                                $e->getMessage(),
                            'details' =>
                                empty($e->detalles)
                                    ? (object) []
                                    : $e->detalles,
                        ],
                    ], $e->httpStatus)
            );

            $exceptions->shouldRenderJsonWhen(
                fn (Request $request) =>
                    $request->is('api/*') ||
                    $request->expectsJson()
            );
        }
    )
    ->create();