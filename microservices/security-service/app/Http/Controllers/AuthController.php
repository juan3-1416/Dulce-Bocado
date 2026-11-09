<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Iniciar sesión.
     */
    public function login(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre_usuario' => ['required', 'string'],
            'contrasena' => ['required', 'string'],
        ]);

        $usuario = Usuario::where(
            'nombre_usuario',
            $datos['nombre_usuario']
        )->first();

        if (
            !$usuario ||
            !Hash::check(
                $datos['contrasena'],
                $usuario->contrasena
            )
        ) {
            return response()->json([
                'message' =>
                    'Las credenciales proporcionadas son incorrectas.',
            ], 401);
        }

        if (!$usuario->activo) {
            return response()->json([
                'message' =>
                    'El usuario se encuentra desactivado.',
            ], 401);
        }

        if (
            $usuario->bloqueado_hasta !== null &&
            $usuario->bloqueado_hasta->isFuture()
        ) {
            return response()->json([
                'message' =>
                    'El usuario se encuentra bloqueado temporalmente.',
            ], 401);
        }

        $usuario->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
        ]);

        $token = $usuario
            ->createToken('dulce-bocado-access-token')
            ->plainTextToken;

        return response()->json([
            'message' => 'Autenticación correcta.',
            'token' => $token,
            'token_type' => 'Bearer',
            'usuario' => $this->datosUsuario($usuario),
        ]);
    }

    /**
     * Obtener usuario autenticado.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        return response()->json([
            'usuario' => $this->datosUsuario($usuario),
        ]);
    }

    /**
     * Cerrar sesión.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()
            ->currentAccessToken()
            ?->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Construir información pública del usuario
     * junto con sus roles y permisos activos.
     */
    private function datosUsuario(Usuario $usuario): array
    {
        $usuario->load([
            'usuarioRolPermisos.rolPermiso.rol',
            'usuarioRolPermisos.rolPermiso.permiso',
        ]);

        $accesos = $usuario->usuarioRolPermisos
            ->filter(function ($asignacion) {
                $rolPermiso = $asignacion->rolPermiso;

                if (!$rolPermiso) {
                    return false;
                }

                $rol = $rolPermiso->rol;
                $permiso = $rolPermiso->permiso;

                return $rol
                    && $permiso
                    && $rol->activo
                    && $permiso->activo;
            });

        $roles = $accesos
            ->map(
                fn ($asignacion) =>
                    $asignacion
                        ->rolPermiso
                        ->rol
                        ->nombre
            )
            ->filter()
            ->unique()
            ->values()
            ->all();

        $permisos = $accesos
            ->map(
                fn ($asignacion) =>
                    $asignacion
                        ->rolPermiso
                        ->permiso
                        ->nombre
            )
            ->filter()
            ->unique()
            ->values()
            ->all();

        return [
            'id_usuario' => $usuario->id_usuario,
            'nombre' => $usuario->nombre,
            'nombre_usuario' =>
                $usuario->nombre_usuario,
            'correo_electronico' =>
                $usuario->correo_electronico,
            'activo' => $usuario->activo,
            'roles' => $roles,
            'permisos' => $permisos,
        ];
    }
}