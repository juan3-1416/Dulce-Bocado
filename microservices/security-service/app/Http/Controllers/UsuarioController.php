<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    /**
     * Listar usuarios.
     */
    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $usuarios = Usuario::query()
            ->select([
                'id_usuario',
                'nombre',
                'nombre_usuario',
                'correo_electronico',
                'activo',
                'intentos_fallidos',
                'bloqueado_hasta',
                'fecha_creacion',
                'fecha_actualizacion',
            ])
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'usuarios' => $usuarios,
        ]);
    }

    /**
     * Registrar usuario.
     */
    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:150',
            ],
            'nombre_usuario' => [
                'required',
                'string',
                'max:80',
                'unique:usuarios,nombre_usuario',
            ],
            'correo_electronico' => [
                'required',
                'email',
                'max:150',
                'unique:usuarios,correo_electronico',
            ],
            'contrasena' => [
                'required',
                'string',
                'min:8',
            ],
            'activo' => [
                'sometimes',
                'boolean',
            ],
        ]);

        $usuario = Usuario::create([
            'nombre' => $datos['nombre'],
            'nombre_usuario' =>
                $datos['nombre_usuario'],
            'correo_electronico' =>
                $datos['correo_electronico'],
            'contrasena' =>
                Hash::make($datos['contrasena']),
            'activo' => $datos['activo'] ?? true,
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
        ]);

        return response()->json([
            'message' => 'Usuario registrado correctamente.',
            'usuario' => $this->datosUsuario($usuario),
        ], 201);
    }

    /**
     * Consultar usuario.
     */
    public function show(
        Request $request,
        Usuario $usuario
    ): JsonResponse {
        $this->autorizar($request);

        return response()->json([
            'usuario' => $this->datosUsuario($usuario),
        ]);
    }

    /**
     * Modificar usuario.
     */
    public function update(
        Request $request,
        Usuario $usuario
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:150',
            ],
            'nombre_usuario' => [
                'sometimes',
                'required',
                'string',
                'max:80',
                Rule::unique(
                    'usuarios',
                    'nombre_usuario'
                )->ignore(
                    $usuario->id_usuario,
                    'id_usuario'
                ),
            ],
            'correo_electronico' => [
                'sometimes',
                'required',
                'email',
                'max:150',
                Rule::unique(
                    'usuarios',
                    'correo_electronico'
                )->ignore(
                    $usuario->id_usuario,
                    'id_usuario'
                ),
            ],
            'contrasena' => [
                'sometimes',
                'nullable',
                'string',
                'min:8',
            ],
        ]);

        if (
            array_key_exists('contrasena', $datos) &&
            !empty($datos['contrasena'])
        ) {
            $datos['contrasena'] =
                Hash::make($datos['contrasena']);
        } else {
            unset($datos['contrasena']);
        }

        $usuario->update($datos);

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'usuario' => $this->datosUsuario(
                $usuario->fresh()
            ),
        ]);
    }

    /**
     * Activar o desactivar usuario.
     */
    public function cambiarEstado(
        Request $request,
        Usuario $usuario
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'activo' => [
                'required',
                'boolean',
            ],
        ]);

        $usuario->update([
            'activo' => $datos['activo'],
        ]);

        /*
         * Si el usuario queda inactivo,
         * se invalidan sus sesiones activas.
         */
        if (!$datos['activo']) {
            $usuario->tokens()->delete();
        }

        return response()->json([
            'message' => $datos['activo']
                ? 'Usuario activado correctamente.'
                : 'Usuario desactivado correctamente.',
            'usuario' => $this->datosUsuario(
                $usuario->fresh()
            ),
        ]);
    }

    /**
     * Verificar permiso de administración
     * de usuarios.
     */
    private function autorizar(Request $request): void
    {
        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if (
            !$usuario ||
            !$usuario->tienePermiso(
                'seguridad.gestionar_usuario'
            )
        ) {
            abort(
                403,
                'No tiene permiso para gestionar usuarios.'
            );
        }
    }

    /**
     * Datos públicos del usuario.
     */
    private function datosUsuario(
        Usuario $usuario
    ): array {
        return [
            'id_usuario' =>
                $usuario->id_usuario,
            'nombre' =>
                $usuario->nombre,
            'nombre_usuario' =>
                $usuario->nombre_usuario,
            'correo_electronico' =>
                $usuario->correo_electronico,
            'activo' =>
                $usuario->activo,
            'intentos_fallidos' =>
                $usuario->intentos_fallidos,
            'bloqueado_hasta' =>
                $usuario->bloqueado_hasta,
            'fecha_creacion' =>
                $usuario->fecha_creacion,
            'fecha_actualizacion' =>
                $usuario->fecha_actualizacion,
        ];
    }
}