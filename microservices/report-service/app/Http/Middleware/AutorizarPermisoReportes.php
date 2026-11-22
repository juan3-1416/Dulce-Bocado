<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class AutorizarPermisoReportes
{
    public function handle(
        Request $request,
        Closure $next,
        string $permiso = ''
    ): Response {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'error' => [
                    'code' => 'TOKEN_REQUERIDO',
                    'message' => 'Debe iniciar sesión para acceder a este recurso.',
                ],
            ], 401);
        }

        $clave = config('integrations.security.key');
        $url = config('integrations.security.url');

        if (!is_string($clave) || $clave === '' || !is_string($url) || $url === '') {
            return response()->json([
                'error' => [
                    'code' => 'SEGURIDAD_NO_CONFIGURADA',
                    'message' => 'Servicio de seguridad no configurado.',
                ],
            ], 503);
        }

        try {
            $respuesta = Http::timeout(max(1, (int) config('integrations.security.timeout', 3)))
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => 'Bearer '.$token,
                    'X-Internal-Service-Key' => $clave,
                ])
                ->post($url.'/api/internal/introspect');
        } catch (ConnectionException) {
            return response()->json([
                'error' => [
                    'code' => 'SECURITY_NO_DISPONIBLE',
                    'message' => 'El servicio de seguridad no responde.',
                ],
            ], 503);
        }

        if ($respuesta->status() === 401) {
            return response()->json([
                'error' => [
                    'code' => 'SESION_EXPIRADA',
                    'message' => 'Sesión expirada o no válida.',
                ],
            ], 401);
        }

        if ($respuesta->status() === 503) {
            return response()->json([
                'error' => [
                    'code' => 'SEGURIDAD_NO_DISPONIBLE',
                    'message' => 'Servicio de seguridad temporalmente fuera de línea.',
                ],
            ], 503);
        }

        if ($respuesta->status() !== 200) {
            return response()->json([
                'error' => [
                    'code' => 'AUTORIZACION_FALLIDA',
                    'message' => 'No fue posible validar la autorización.',
                ],
            ], 403);
        }

        $datos = $respuesta->json('usuario');

        if (!is_array($datos) || !isset($datos['id_usuario'])) {
            return response()->json([
                'error' => [
                    'code' => 'RESPUESTA_SEGURIDAD_INVALIDA',
                    'message' => 'Estructura de respuesta de seguridad no válida.',
                ],
            ], 502);
        }

        if (!($datos['activo'] ?? false)) {
            return response()->json([
                'error' => [
                    'code' => 'USUARIO_INACTIVO',
                    'message' => 'La cuenta de usuario está desactivada.',
                ],
            ], 403);
        }

        if ($permiso !== '') {
            $permisos = (array) ($datos['permisos'] ?? []);

            if (!in_array($permiso, $permisos, true)) {
                return response()->json([
                    'error' => [
                        'code' => 'PERMISO_DENEGADO',
                        'message' => "Se requiere el permiso '{$permiso}' para realizar esta acción.",
                    ],
                ], 403);
            }
        }

        $request->attributes->set('id_usuario_autenticado', (int) $datos['id_usuario']);
        $request->attributes->set('nombre_usuario_autenticado', (string) ($datos['nombre'] ?? 'Usuario'));
        $request->attributes->set('email_usuario_autenticado', (string) ($datos['email'] ?? ''));

        return $next($request);
    }
}
