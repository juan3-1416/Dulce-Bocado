<?php

namespace App\Http\Controllers\Api\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\StoreRolPermisoRequest;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

        return DB::transaction(
            function () use ($datos) {

                /*
                 * Buscar qué usuarios ya tienen este rol.
                 *
                 * Como el proyecto utiliza usuario_rol_permiso,
                 * consideramos que un usuario posee un rol cuando
                 * tiene al menos una relación de ese rol.
                 */
                $usuariosDelRol =
                    UsuarioRolPermiso::query()
                        ->whereHas(
                            'rolPermiso',
                            function ($query) use ($datos) {
                                $query->where(
                                    'rol_id',
                                    $datos['rol_id']
                                );
                            }
                        )
                        ->distinct()
                        ->pluck('usuario_id');

                /*
                 * Crear la nueva relación Rol-Permiso.
                 */
                $relacion =
                    RolPermiso::create([
                        'rol_id' =>
                            $datos['rol_id'],

                        'permiso_id' =>
                            $datos['permiso_id'],
                    ]);

                /*
                 * Sincronizar automáticamente el nuevo permiso
                 * con todos los usuarios que ya poseen el rol.
                 */
                $usuariosSincronizados = 0;

                foreach (
                    $usuariosDelRol
                    as $usuarioId
                ) {
                    $asignacion =
                        UsuarioRolPermiso::firstOrCreate([
                            'usuario_id' =>
                                $usuarioId,

                            'rol_permiso_id' =>
                                $relacion
                                    ->id_rol_permiso,
                        ]);

                    if (
                        $asignacion
                            ->wasRecentlyCreated
                    ) {
                        $usuariosSincronizados++;
                    }
                }

                $relacion->load([
                    'rol:id_rol,nombre,activo',
                    'permiso:id_permiso,nombre,descripcion,activo',
                ]);

                return response()->json([
                    'message' =>
                        'Permiso asignado al rol correctamente.',

                    'usuarios_sincronizados' =>
                        $usuariosSincronizados,

                    'relacion' => [
                        'id_rol_permiso' =>
                            $relacion
                                ->id_rol_permiso,

                        'rol' => [
                            'id_rol' =>
                                $relacion
                                    ->rol
                                    ->id_rol,

                            'nombre' =>
                                $relacion
                                    ->rol
                                    ->nombre,

                            'activo' =>
                                $relacion
                                    ->rol
                                    ->activo,
                        ],

                        'permiso' => [
                            'id_permiso' =>
                                $relacion
                                    ->permiso
                                    ->id_permiso,

                            'nombre' =>
                                $relacion
                                    ->permiso
                                    ->nombre,

                            'descripcion' =>
                                $relacion
                                    ->permiso
                                    ->descripcion,

                            'activo' =>
                                $relacion
                                    ->permiso
                                    ->activo,
                        ],
                    ],
                ], 201);
            }
        );
    }

    public function destroy(
        int $id
    ): JsonResponse {
        return DB::transaction(
            function () use ($id) {

                $relacion =
                    RolPermiso::query()
                        ->with([
                            'rol:id_rol,nombre',
                            'permiso:id_permiso,nombre',
                        ])
                        ->find($id);

                if (!$relacion) {
                    return response()->json([
                        'message' =>
                            'Relación Rol-Permiso no encontrada.',
                    ], 404);
                }

                $nombreRol =
                    $relacion->rol->nombre;

                $nombrePermiso =
                    $relacion
                        ->permiso
                        ->nombre;

                /*
                 * Primero retirar este permiso de todos
                 * los usuarios que lo recibieron mediante
                 * esta relación Rol-Permiso.
                 */
                $usuariosActualizados =
                    UsuarioRolPermiso::query()
                        ->where(
                            'rol_permiso_id',
                            $relacion
                                ->id_rol_permiso
                        )
                        ->delete();

                /*
                 * Una vez retiradas las asignaciones,
                 * eliminar la relación del rol.
                 */
                $relacion->delete();

                return response()->json([
                    'message' =>
                        'Permiso quitado del rol correctamente.',

                    'usuarios_actualizados' =>
                        $usuariosActualizados,

                    'datos' => [
                        'rol' =>
                            $nombreRol,

                        'permiso' =>
                            $nombrePermiso,
                    ],
                ]);
            }
        );
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