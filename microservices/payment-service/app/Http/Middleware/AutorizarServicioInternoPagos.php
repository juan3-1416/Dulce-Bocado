<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AutorizarServicioInternoPagos
{
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $esperada = config(
            'services.sales_internal.key'
        );

        $recibida = $request->header(
            'X-Internal-Service-Key'
        );

        $actor = $request->header(
            'X-Actor-User-Id'
        );

        if (
            !is_string($esperada) ||
            $esperada === ''
        ) {
            return $this->error(
                503,
                'SERVICIO_INTERNO_NO_CONFIGURADO',
                'La comunicación interna con Payment no está configurada.'
            );
        }

        if (
            !is_string($recibida) ||
            !hash_equals(
                $esperada,
                $recibida
            )
        ) {
            return $this->error(
                403,
                'SERVICIO_INTERNO_NO_AUTORIZADO',
                'El servicio llamante no está autorizado.'
            );
        }

        if (
            !is_numeric($actor) ||
            (int) $actor <= 0
        ) {
            return $this->error(
                422,
                'ACTOR_INTERNO_INVALIDO',
                'El actor interno no es válido.'
            );
        }

        $request->attributes->set(
            'id_usuario_autenticado',
            (int) $actor
        );

        $request->attributes->set(
            'solicitud_interna',
            true
        );

        return $next($request);
    }

    private function error(
        int $estado,
        string $codigo,
        string $mensaje
    ): Response {
        return response()->json([
            'error' => [
                'code' => $codigo,
                'message' => $mensaje,
                'details' => (object) [],
            ],
        ], $estado);
    }
}