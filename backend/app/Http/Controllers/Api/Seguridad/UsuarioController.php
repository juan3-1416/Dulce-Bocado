<?php

namespace App\Http\Controllers\Api\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\StoreUsuarioRequest;
use App\Http\Requests\Seguridad\UpdateUsuarioRequest;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Http\Requests\Seguridad\UpdateEstadoUsuarioRequest;
class UsuarioController extends Controller
{
    public function index(): JsonResponse
    {
        $usuarios = Usuario::query()
            ->with([
                'usuarioRolPermisos.rolPermiso.rol',
                'usuarioRolPermisos.rolPermiso.permiso',
            ])
            ->orderBy('id_usuario')
            ->get()
            ->map(fn (Usuario $usuario) => $this->formatearUsuario($usuario));

        return response()->json([
            'usuarios' => $usuarios,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $usuario = Usuario::query()
            ->with([
                'usuarioRolPermisos.rolPermiso.rol',
                'usuarioRolPermisos.rolPermiso.permiso',
            ])
            ->find($id);

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        return response()->json([
            'usuario' => $this->formatearUsuario($usuario),
        ]);
    }

    public function store(
        StoreUsuarioRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $usuario = Usuario::create([
            'nombre' => trim($datos['nombre']),

            'nombre_usuario' => Str::lower(
                trim($datos['nombre_usuario'])
            ),

            'correo_electronico' => Str::lower(
                trim($datos['correo_electronico'])
            ),

            'contrasena' => Hash::make(
                $datos['contrasena']
            ),

            'activo' => true,
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
        ]);

        $usuario->load([
            'usuarioRolPermisos.rolPermiso.rol',
            'usuarioRolPermisos.rolPermiso.permiso',
        ]);

        return response()->json([
            'message' => 'Usuario registrado correctamente.',
            'usuario' => $this->formatearUsuario($usuario),
        ], 201);
    }

    public function update(
        UpdateUsuarioRequest $request,
        int $id
    ): JsonResponse {
        $usuario = Usuario::find($id);

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $datos = $request->validated();

        $usuario->nombre = $datos['nombre'];
        $usuario->nombre_usuario = $datos['nombre_usuario'];
        $usuario->correo_electronico = $datos['correo_electronico'];

        if (!empty($datos['contrasena'])) {
            $usuario->contrasena = Hash::make(
                $datos['contrasena']
            );

            // Si se cambia la contraseña dejamos limpio
            // el estado de bloqueo del usuario.
            $usuario->intentos_fallidos = 0;
            $usuario->bloqueado_hasta = null;
        }

        $usuario->save();

        $usuario->load([
            'usuarioRolPermisos.rolPermiso.rol',
            'usuarioRolPermisos.rolPermiso.permiso',
        ]);

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'usuario' => $this->formatearUsuario($usuario),
        ]);
    }
public function updateEstado(
    UpdateEstadoUsuarioRequest $request,
    int $id
): JsonResponse {
    $usuario = Usuario::find($id);

    if (!$usuario) {
        return response()->json([
            'message' => 'Usuario no encontrado.',
        ], 404);
    }

    $usuario->activo = $request->validated()['activo'];
    $usuario->save();

    $usuario->load([
        'usuarioRolPermisos.rolPermiso.rol',
        'usuarioRolPermisos.rolPermiso.permiso',
    ]);

    return response()->json([
        'message' => $usuario->activo
            ? 'Usuario activado correctamente.'
            : 'Usuario desactivado correctamente.',

        'usuario' => $this->formatearUsuario($usuario),
    ]);
}
    private function formatearUsuario(
        Usuario $usuario
    ): array {
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
            'activo' => $usuario->activo,
            'intentos_fallidos' => $usuario->intentos_fallidos,
            'bloqueado_hasta' => $usuario->bloqueado_hasta,
            'roles' => $roles,
            'permisos' => $permisos,
            'fecha_creacion' => $usuario->fecha_creacion,
            'fecha_actualizacion' => $usuario->fecha_actualizacion,
        ];
    }
}