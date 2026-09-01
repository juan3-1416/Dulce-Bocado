<?php

namespace App\Http\Controllers\Api\Seguridad;

use App\Http\Controllers\Controller;
use App\Models\RolPermiso;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Seguridad\StoreRolPermisoRequest;
use App\Models\Permiso;
use App\Models\Rol;

class RolPermisoController extends Controller
{
    public function index(): JsonResponse
    {
        $relaciones = RolPermiso::query()
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

                        'activo' =>
                            $relacion->rol->activo,
                    ],

                    'permiso' => [
                        'id_permiso' =>
                            $relacion->permiso->id_permiso,

                        'nombre' =>
                            $relacion->permiso->nombre,

                        'descripcion' =>
                            $relacion->permiso->descripcion,

                        'activo' =>
                            $relacion->permiso->activo,
                    ],
                ];
            });

        return response()->json([
            'relaciones' => $relaciones,
        ]);
    }
    public function store(
    StoreRolPermisoRequest $request
): JsonResponse {
    $datos = $request->validated();

    $relacion = RolPermiso::create([
        'rol_id' => $datos['rol_id'],
        'permiso_id' => $datos['permiso_id'],
    ]);

    $relacion->load([
        'rol:id_rol,nombre,activo',
        'permiso:id_permiso,nombre,descripcion,activo',
    ]);

    return response()->json([
        'message' =>
            'Permiso asignado al rol correctamente.',

        'relacion' => [
            'id_rol_permiso' =>
                $relacion->id_rol_permiso,

            'rol' => [
                'id_rol' =>
                    $relacion->rol->id_rol,

                'nombre' =>
                    $relacion->rol->nombre,

                'activo' =>
                    $relacion->rol->activo,
            ],

            'permiso' => [
                'id_permiso' =>
                    $relacion->permiso->id_permiso,

                'nombre' =>
                    $relacion->permiso->nombre,

                'descripcion' =>
                    $relacion->permiso->descripcion,

                'activo' =>
                    $relacion->permiso->activo,
            ],
        ],
    ], 201);
}
public function destroy(int $id): JsonResponse
{
    $relacion = RolPermiso::query()
        ->with([
            'rol:id_rol,nombre',
            'permiso:id_permiso,nombre',
        ])
        ->find($id);

    if (!$relacion) {
        return response()->json([
            'message' => 'Relación Rol-Permiso no encontrada.',
        ], 404);
    }

    /*
     * Si esta relación ya fue asignada a algún usuario
     * mediante usuario_rol_permiso, no la eliminamos.
     */
    if ($relacion->usuarioRolPermisos()->exists()) {
        return response()->json([
            'message' =>
                'No se puede quitar esta relación porque está asignada a uno o más usuarios.',
        ], 409);
    }

    $nombreRol = $relacion->rol->nombre;
    $nombrePermiso = $relacion->permiso->nombre;

    $relacion->delete();

    return response()->json([
        'message' =>
            'Permiso quitado del rol correctamente.',

        'datos' => [
            'rol' => $nombreRol,
            'permiso' => $nombrePermiso,
        ],
    ]);
}
public function catalogos(): JsonResponse
{
    $roles = Rol::query()
        ->where('activo', true)
        ->orderBy('nombre')
        ->get([
            'id_rol',
            'nombre',
        ]);

    $permisos = Permiso::query()
        ->where('activo', true)
        ->orderBy('nombre')
        ->get([
            'id_permiso',
            'nombre',
            'descripcion',
        ]);

    return response()->json([
        'roles' => $roles,
        'permisos' => $permisos,
    ]);
}
}
