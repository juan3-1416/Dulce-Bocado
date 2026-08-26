<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Usuario;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $resultado = $this->authService->intentarLogin(
            $request->string('nombre_usuario')->toString(),
            $request->string('contrasena')->toString(),
        );

        if ($resultado['estado'] === 'inactivo') {
            return response()->json([
                'message' => 'El usuario se encuentra inactivo.',
            ], 403);
        }

        if ($resultado['estado'] === 'bloqueado') {
            return response()->json([
                'message' => 'Usuario bloqueado temporalmente por múltiples intentos fallidos.',
                'bloqueado_hasta' => $resultado['bloqueado_hasta'],
            ], 423);
        }

        if ($resultado['estado'] === 'credenciales_invalidas') {
            $respuesta = [
                'message' => 'Las credenciales proporcionadas no son correctas.',
            ];

            if (isset($resultado['intentos_restantes'])) {
                $respuesta['intentos_restantes'] =
                    $resultado['intentos_restantes'];
            }

            return response()->json($respuesta, 401);
        }

        /** @var Usuario $usuario */
        $usuario = $resultado['usuario'];

        Auth::guard('web')->login($usuario);

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Inicio de sesión correcto.',
            'usuario' => $this->datosUsuario($usuario),
        ]);
    }

    public function usuario(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        return response()->json([
            'usuario' => $this->datosUsuario($usuario),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    private function datosUsuario(Usuario $usuario): array
    {
        $usuario->load([
            'usuarioRolPermisos.rolPermiso.rol',
            'usuarioRolPermisos.rolPermiso.permiso',
        ]);

        $roles = $usuario->usuarioRolPermisos
            ->map(
                fn ($asignacion) =>
                    $asignacion->rolPermiso->rol->nombre
            )
            ->unique()
            ->values();

        $permisos = $usuario->usuarioRolPermisos
            ->map(
                fn ($asignacion) =>
                    $asignacion->rolPermiso->permiso->nombre
            )
            ->unique()
            ->values();

        return [
            'id_usuario' => $usuario->id_usuario,
            'nombre' => $usuario->nombre,
            'nombre_usuario' => $usuario->nombre_usuario,
            'correo_electronico' => $usuario->correo_electronico,
            'roles' => $roles,
            'permisos' => $permisos,
        ];
    }
}