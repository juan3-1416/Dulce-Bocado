<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class VerificarPermiso
{
    public function handle(
        Request $request,
        Closure $next,
        string $permiso
    ): Response {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'message' => 'No autenticado.',
            ], 401);
        }

        $url = config('services.security.url');
        $clave = config('services.security.key');

        if (
            !is_string($url) ||
            $url === '' ||
            !is_string($clave) ||
            $clave === ''
        ) {
            return response()->json([
                'message' => 'El servicio de seguridad no está configurado.',
            ], 503);
        }

        try {
            $respuesta = Http::timeout(
                max(
                    1,
                    (int) config('services.security.timeout', 3)
                )
            )
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => 'Bearer '.$token,
                    'X-Internal-Service-Key' => $clave,
                ])
                ->post(
                    rtrim($url, '/').
                    '/api/internal/introspect'
                );
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'El servicio de seguridad no está disponible.',
            ], 503);
        }

        if ($respuesta->status() === 401) {
            return response()->json([
                'message' => 'No autenticado.',
            ], 401);
        }

        if (!$respuesta->ok()) {
            return response()->json([
                'message' => 'No se pudo validar la sesión.',
            ], 503);
        }

        $usuario = $respuesta->json('usuario');

        if (
            !is_array($usuario) ||
            !is_numeric($usuario['id_usuario'] ?? null) ||
            ($usuario['activo'] ?? false) !== true ||
            !is_array($usuario['permisos'] ?? null)
        ) {
            return response()->json([
                'message' => 'Respuesta inválida del servicio de seguridad.',
            ], 503);
        }

        if (
            !in_array(
                $permiso,
                $usuario['permisos'],
                true
            )
        ) {
            return response()->json([
                'message' =>
                    'No tienes permiso para realizar esta operación.',
                'permiso_requerido' => $permiso,
            ], 403);
        }

        $request->attributes->set(
            'id_usuario_autenticado',
            (int) $usuario['id_usuario']
        );

        return $next($request);
    }
}