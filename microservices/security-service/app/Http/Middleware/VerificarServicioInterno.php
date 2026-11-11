<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificarServicioInterno
{
    public function handle(Request $request, Closure $next): Response
    {
        $esperada = config('services.internal_service.key');
        $recibida = $request->header('X-Internal-Service-Key');

        if (!is_string($esperada) || $esperada === '' ||
            !is_string($recibida) || !hash_equals($esperada, $recibida)) {
            return response()->json([
                'error' => [
                    'code' => 'SERVICIO_NO_AUTORIZADO',
                    'message' => 'Servicio interno no autorizado.',
                    'details' => (object) [],
                ],
            ], 403);
        }

        return $next($request);
    }
}
