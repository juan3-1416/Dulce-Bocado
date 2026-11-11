<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class AutorizarPermisoVentas
{
    public function handle(Request $request, Closure $next, string $permiso): Response
    {
        $token = $request->bearerToken();
        if (!$token) {
            return $this->error(401, 'TOKEN_REQUERIDO', 'Debe iniciar sesión.');
        }

        $clave = config('services.security.key');
        $url = config('services.security.url');
        if (!is_string($clave) || $clave === '' || !is_string($url) || $url === '') {
            return $this->error(503, 'SEGURIDAD_NO_CONFIGURADA', 'Seguridad no está disponible.');
        }

        try {
            $respuesta = Http::timeout(max(1, (int) config('services.security.timeout', 3)))
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => 'Bearer '.$token,
                    'X-Internal-Service-Key' => $clave,
                ])
                ->post(rtrim($url, '/').'/api/internal/introspect');
        } catch (ConnectionException) {
            return $this->error(503, 'SEGURIDAD_NO_DISPONIBLE', 'Seguridad no está disponible.');
        }

        if ($respuesta->status() === 401) {
            return $this->error(401, 'TOKEN_INVALIDO', 'La sesión no es válida.');
        }

        if (!$respuesta->ok()) {
            return $this->error(503, 'SEGURIDAD_NO_DISPONIBLE', 'Seguridad no está disponible.');
        }

        $usuario = $respuesta->json('usuario');
        if (!is_array($usuario) || !is_numeric($usuario['id_usuario'] ?? null) ||
            ($usuario['activo'] ?? false) !== true || !is_array($usuario['permisos'] ?? null)) {
            return $this->error(503, 'RESPUESTA_SEGURIDAD_INVALIDA', 'Seguridad no está disponible.');
        }

        if (!in_array($permiso, $usuario['permisos'], true)) {
            return $this->error(403, 'PERMISO_DENEGADO', 'No tiene permiso para esta operación.');
        }

        $request->attributes->set('id_usuario_autenticado', (int) $usuario['id_usuario']);

        return $next($request);
    }

    private function error(int $estado, string $codigo, string $mensaje): Response
    {
        return response()->json([
            'error' => [
                'code' => $codigo,
                'message' => $mensaje,
                'details' => (object) [],
            ],
        ], $estado);
    }
}
