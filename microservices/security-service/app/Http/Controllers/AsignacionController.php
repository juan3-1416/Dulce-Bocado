<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsignacionController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $this->autorizar($request);

        $query =
            UsuarioRolPermiso::query()
                ->with([
                    'usuario',
                    'rolPermiso.rol',
                    'rolPermiso.permiso',
                ]);

        if (
            $request->filled('usuario_id')
        ) {
            $query->where(
                'usuario_id',
                $request->integer(
                    'usuario_id'
                )
            );
        }

        $asignaciones = $query
            ->orderBy(
                'id_usuario_rol_permiso'
            )
            ->get();

        return response()->json([
            'asignaciones' =>
                $asignaciones,
        ]);
    }

    public function accesosUsuario(
        Request $request,
        Usuario $usuario
    ): JsonResponse {
        $this->autorizar($request);

        $asignaciones =
            UsuarioRolPermiso::query()
                ->with([
                    'rolPermiso.rol',
                    'rolPermiso.permiso',
                ])
                ->where(
                    'usuario_id',
                    $usuario->id_usuario
                )
                ->orderBy(
                    'id_usuario_rol_permiso'
                )
                ->get();

        return response()->json([
            'usuario' => $usuario,
            'asignaciones' =>
                $asignaciones,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'usuario_id' => [
                'required',
                'integer',
                'exists:usuarios,id_usuario',
            ],
            'rol_permiso_id' => [
                'required',
                'integer',
                'exists:rol_permiso,id_rol_permiso',
            ],
        ]);

        $usuario = Usuario::findOrFail(
            $datos['usuario_id']
        );

        $rolPermiso =
            RolPermiso::with([
                'rol',
                'permiso',
            ])->findOrFail(
                $datos['rol_permiso_id']
            );

        if (!$usuario->activo) {
            return response()->json([
                'message' =>
                    'No se pueden asignar accesos a un usuario inactivo.',
            ], 422);
        }

        if (
            !$rolPermiso->rol->activo ||
            !$rolPermiso->permiso->activo
        ) {
            return response()->json([
                'message' =>
                    'El rol y el permiso deben estar activos.',
            ], 422);
        }

        $asignacion =
            UsuarioRolPermiso::firstOrCreate([
                'usuario_id' =>
                    $usuario->id_usuario,
                'rol_permiso_id' =>
                    $rolPermiso
                        ->id_rol_permiso,
            ]);

        if (
            !$asignacion->wasRecentlyCreated
        ) {
            return response()->json([
                'message' =>
                    'El usuario ya tiene asignado este acceso.',
            ], 422);
        }

        $asignacion->load([
            'usuario',
            'rolPermiso.rol',
            'rolPermiso.permiso',
        ]);

        return response()->json([
            'message' =>
                'Acceso asignado correctamente.',
            'asignacion' =>
                $asignacion,
        ], 201);
    }

    public function destroy(
        Request $request,
        UsuarioRolPermiso $asignacion
    ): JsonResponse {
        $this->autorizar($request);

        $asignacion->delete();

        return response()->json([
            'message' =>
                'Acceso retirado correctamente.',
        ]);
    }

    public function asignarRol(
        Request $request
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'usuario_id' => [
                'required',
                'integer',
                'exists:usuarios,id_usuario',
            ],
            'rol_id' => [
                'required',
                'integer',
                'exists:roles,id_rol',
            ],
        ]);

        $usuario = Usuario::findOrFail(
            $datos['usuario_id']
        );

        $rol = Rol::findOrFail(
            $datos['rol_id']
        );

        if (!$usuario->activo) {
            return response()->json([
                'message' =>
                    'No se puede asignar un rol a un usuario inactivo.',
            ], 422);
        }

        if (!$rol->activo) {
            return response()->json([
                'message' =>
                    'No se puede asignar un rol inactivo.',
            ], 422);
        }

        $relaciones = RolPermiso::query()
            ->where(
                'rol_id',
                $rol->id_rol
            )
            ->whereHas(
                'permiso',
                fn ($query) =>
                    $query->where(
                        'activo',
                        true
                    )
            )
            ->get();

        if ($relaciones->isEmpty()) {
            return response()->json([
                'message' =>
                    'El rol no tiene permisos activos configurados.',
            ], 422);
        }

        $nuevos = DB::transaction(
            function () use (
                $usuario,
                $relaciones
            ) {
                $contador = 0;

                foreach (
                    $relaciones as $relacion
                ) {
                    $asignacion =
                        UsuarioRolPermiso::firstOrCreate([
                            'usuario_id' =>
                                $usuario
                                    ->id_usuario,
                            'rol_permiso_id' =>
                                $relacion
                                    ->id_rol_permiso,
                        ]);

                    if (
                        $asignacion
                            ->wasRecentlyCreated
                    ) {
                        $contador++;
                    }
                }

                return $contador;
            }
        );

        return response()->json([
            'message' =>
                'Rol asignado correctamente.',
            'nuevos_permisos_asignados' =>
                $nuevos,
            'total_permisos_rol' =>
                $relaciones->count(),
        ]);
    }

    public function quitarRol(
        Request $request
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'usuario_id' => [
                'required',
                'integer',
                'exists:usuarios,id_usuario',
            ],
            'rol_id' => [
                'required',
                'integer',
                'exists:roles,id_rol',
            ],
        ]);

        $relacionIds =
            RolPermiso::query()
                ->where(
                    'rol_id',
                    $datos['rol_id']
                )
                ->pluck(
                    'id_rol_permiso'
                );

        $eliminadas =
            UsuarioRolPermiso::query()
                ->where(
                    'usuario_id',
                    $datos['usuario_id']
                )
                ->whereIn(
                    'rol_permiso_id',
                    $relacionIds
                )
                ->delete();

        return response()->json([
            'message' =>
                'Rol retirado del usuario correctamente.',
            'asignaciones_eliminadas' =>
                $eliminadas,
        ]);
    }

    private function autorizar(
        Request $request
    ): void {
        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if (
            !$usuario ||
            !$usuario->tienePermiso(
                'seguridad.asignar_roles_permisos'
            )
        ) {
            abort(
                403,
                'No tiene permiso para gestionar asignaciones.'
            );
        }
    }
}