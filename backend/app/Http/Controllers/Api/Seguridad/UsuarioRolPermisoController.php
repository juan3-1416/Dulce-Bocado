<?php

namespace App\Http\Controllers\Api\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\AsignarRolAUsuarioRequest;
use App\Http\Requests\Seguridad\QuitarRolDeUsuarioRequest;
use App\Http\Requests\Seguridad\StoreUsuarioRolPermisoRequest;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuarioRolPermisoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = UsuarioRolPermiso::query()
            ->with([
                'usuario:id_usuario,nombre,nombre_usuario,activo',
                'rolPermiso.rol:id_rol,nombre,activo',
                'rolPermiso.permiso:id_permiso,nombre,descripcion,activo',
            ])
            ->orderBy('id_usuario_rol_permiso');

        if ($request->filled('usuario_id')) {
            $query->where('usuario_id', $request->integer('usuario_id'));
        }

        $asignaciones = $query
            ->get()
            ->map(function (UsuarioRolPermiso $asignacion) {
                return [
                    'id_usuario_rol_permiso' =>
                        $asignacion->id_usuario_rol_permiso,

                    'usuario' => [
                        'id_usuario' =>
                            $asignacion->usuario->id_usuario,

                        'nombre' =>
                            $asignacion->usuario->nombre,

                        'nombre_usuario' =>
                            $asignacion->usuario->nombre_usuario,

                        'activo' =>
                            $asignacion->usuario->activo,
                    ],

                    'rol_permiso' => [
                        'id_rol_permiso' =>
                            $asignacion->rolPermiso->id_rol_permiso,

                        'rol' => [
                            'id_rol' =>
                                $asignacion->rolPermiso->rol->id_rol,

                            'nombre' =>
                                $asignacion->rolPermiso->rol->nombre,

                            'activo' =>
                                $asignacion->rolPermiso->rol->activo,
                        ],

                        'permiso' => [
                            'id_permiso' =>
                                $asignacion->rolPermiso->permiso->id_permiso,

                            'nombre' =>
                                $asignacion->rolPermiso->permiso->nombre,

                            'descripcion' =>
                                $asignacion->rolPermiso->permiso->descripcion,

                            'activo' =>
                                $asignacion->rolPermiso->permiso->activo,
                        ],
                    ],
                ];
            });

        return response()->json([
            'asignaciones' => $asignaciones,
        ]);
    }

    public function catalogos(): JsonResponse
    {
        $usuarios = Usuario::query()
            ->where('activo', true)
            ->orderBy('nombre')
            ->get([
                'id_usuario',
                'nombre',
                'nombre_usuario',
            ]);

        $roles = Rol::query()
            ->where('activo', true)
            ->orderBy('nombre')
            ->get([
                'id_rol',
                'nombre',
            ]);

        $rolPermisos = RolPermiso::query()
            ->whereHas('rol', fn ($q) => $q->where('activo', true))
            ->whereHas('permiso', fn ($q) => $q->where('activo', true))
            ->with([
                'rol:id_rol,nombre,activo',
                'permiso:id_permiso,nombre,descripcion,activo',
            ])
            ->orderBy('id_rol_permiso')
            ->get()
            ->map(function (RolPermiso $relacion) {
                return [
                    'id_rol_permiso' =>
                        $relacion->id_rol_permiso,

                    'rol' => [
                        'id_rol' =>
                            $relacion->rol->id_rol,

                        'nombre' =>
                            $relacion->rol->nombre,
                    ],

                    'permiso' => [
                        'id_permiso' =>
                            $relacion->permiso->id_permiso,

                        'nombre' =>
                            $relacion->permiso->nombre,

                        'descripcion' =>
                            $relacion->permiso->descripcion,
                    ],
                ];
            });

        return response()->json([
            'usuarios' => $usuarios,
            'roles' => $roles,
            'rol_permisos' => $rolPermisos,
        ]);
    }

    public function store(
        StoreUsuarioRolPermisoRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $asignacion = UsuarioRolPermiso::create([
            'usuario_id' => $datos['usuario_id'],
            'rol_permiso_id' => $datos['rol_permiso_id'],
        ]);

        $asignacion->load([
            'usuario:id_usuario,nombre,nombre_usuario,activo',
            'rolPermiso.rol:id_rol,nombre,activo',
            'rolPermiso.permiso:id_permiso,nombre,descripcion,activo',
        ]);

        return response()->json([
            'message' => 'Permiso asignado al usuario correctamente.',
            'asignacion' => [
                'id_usuario_rol_permiso' =>
                    $asignacion->id_usuario_rol_permiso,

                'usuario' => [
                    'id_usuario' =>
                        $asignacion->usuario->id_usuario,

                    'nombre' =>
                        $asignacion->usuario->nombre,

                    'nombre_usuario' =>
                        $asignacion->usuario->nombre_usuario,

                    'activo' =>
                        $asignacion->usuario->activo,
                ],

                'rol_permiso' => [
                    'id_rol_permiso' =>
                        $asignacion->rolPermiso->id_rol_permiso,

                    'rol' => [
                        'id_rol' =>
                            $asignacion->rolPermiso->rol->id_rol,

                        'nombre' =>
                            $asignacion->rolPermiso->rol->nombre,

                        'activo' =>
                            $asignacion->rolPermiso->rol->activo,
                    ],

                    'permiso' => [
                        'id_permiso' =>
                            $asignacion->rolPermiso->permiso->id_permiso,

                        'nombre' =>
                            $asignacion->rolPermiso->permiso->nombre,

                        'descripcion' =>
                            $asignacion->rolPermiso->permiso->descripcion,

                        'activo' =>
                            $asignacion->rolPermiso->permiso->activo,
                    ],
                ],
            ],
        ], 201);
    }

    public function asignarRol(
        AsignarRolAUsuarioRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $relacionesRolPermiso = RolPermiso::query()
            ->where('rol_id', $datos['rol_id'])
            ->whereHas('permiso', fn ($q) => $q->where('activo', true))
            ->get();

        if ($relacionesRolPermiso->isEmpty()) {
            return response()->json([
                'message' => 'El rol seleccionado no tiene permisos activos asignados.',
            ], 422);
        }

        $nuevasAsignaciones = 0;

        foreach ($relacionesRolPermiso as $relacion) {
            $asignacion = UsuarioRolPermiso::firstOrCreate([
                'usuario_id' => $datos['usuario_id'],
                'rol_permiso_id' => $relacion->id_rol_permiso,
            ]);

            if ($asignacion->wasRecentlyCreated) {
                $nuevasAsignaciones++;
            }
        }

        return response()->json([
            'message' => 'Rol asignado al usuario correctamente.',
            'total_permisos_rol' => $relacionesRolPermiso->count(),
            'nuevos_permisos_asignados' => $nuevasAsignaciones,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $asignacion = UsuarioRolPermiso::query()
            ->with([
                'usuario:id_usuario,nombre',
                'rolPermiso.rol:id_rol,nombre',
                'rolPermiso.permiso:id_permiso,nombre',
            ])
            ->find($id);

        if (!$asignacion) {
            return response()->json([
                'message' => 'Asignación no encontrada.',
            ], 404);
        }

        $nombreUsuario = $asignacion->usuario->nombre;
        $nombreRol = $asignacion->rolPermiso->rol->nombre;
        $nombrePermiso = $asignacion->rolPermiso->permiso->nombre;

        $asignacion->delete();

        return response()->json([
            'message' => 'Asignación eliminada correctamente.',
            'datos' => [
                'usuario' => $nombreUsuario,
                'rol' => $nombreRol,
                'permiso' => $nombrePermiso,
            ],
        ]);
    }

    public function quitarRol(
        QuitarRolDeUsuarioRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $rolPermisoIds = RolPermiso::query()
            ->where('rol_id', $datos['rol_id'])
            ->pluck('id_rol_permiso');

        $eliminados = UsuarioRolPermiso::query()
            ->where('usuario_id', $datos['usuario_id'])
            ->whereIn('rol_permiso_id', $rolPermisoIds)
            ->delete();

        return response()->json([
            'message' => 'Permisos del rol revocados del usuario correctamente.',
            'total_revocados' => $eliminados,
        ]);
    }
}
