<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class IntrospeccionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $bearer = $request->bearerToken();
        $token = $bearer ? PersonalAccessToken::findToken($bearer) : null;
        $usuario = $token?->tokenable;

        if (!$token || !$usuario instanceof Usuario || !$usuario->activo ||
            ($token->expires_at && $token->expires_at->isPast()) ||
            (config('sanctum.expiration') && $token->created_at->addMinutes((int) config('sanctum.expiration'))->isPast())) {
            return response()->json([
                'error' => [
                    'code' => 'TOKEN_INVALIDO',
                    'message' => 'Token de usuario no válido.',
                    'details' => (object) [],
                ],
            ], 401);
        }

        $usuario->load('usuarioRolPermisos.rolPermiso.rol', 'usuarioRolPermisos.rolPermiso.permiso');

        $permisos = $usuario->usuarioRolPermisos
            ->map(fn ($asignacion) => $asignacion->rolPermiso)
            ->filter(fn ($relacion) => $relacion?->rol?->activo && $relacion?->permiso?->activo)
            ->map(fn ($relacion) => $relacion->permiso->nombre)
            ->unique()
            ->values()
            ->all();

        return response()->json([
            'usuario' => [
                'id_usuario' => $usuario->id_usuario,
                'activo' => true,
                'permisos' => $permisos,
            ],
        ]);
    }
}
