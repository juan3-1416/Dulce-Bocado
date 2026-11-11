<?php

namespace App\Http\Controllers;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RolPermisoController extends Controller
{
    public function permisosRol(
        Request $request,
        Rol $rol
    ): JsonResponse {
        $this->autorizar($request);

        $relaciones = RolPermiso::query()
            ->with('permiso')
            ->where('rol_id', $rol->id_rol)
            ->orderBy('id_rol_permiso')
            ->get();

        return response()->json([
            'rol' => $rol,
            'relaciones' => $relaciones,
            'permisos' => $relaciones
                ->pluck('permiso')
                ->values(),
        ]);
    }

    public function sincronizarPermisos(
        Request $request,
        Rol $rol
    ): JsonResponse {
        $this->autorizar($request);

        if (!$rol->activo) {
            return response()->json([
                'message' =>
                    'No se pueden asignar permisos a un rol inactivo.',
            ], 422);
        }

        $datos = $request->validate([
            'permiso_ids' => [
                'present',
                'array',
            ],
            'permiso_ids.*' => [
                'integer',
                'distinct',
                'exists:permisos,id_permiso',
            ],
        ]);

        $permisoIds = collect(
            $datos['permiso_ids']
        )
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $permisosInactivos = Permiso::query()
            ->whereIn(
                'id_permiso',
                $permisoIds
            )
            ->where('activo', false)
            ->pluck('nombre');

        if ($permisosInactivos->isNotEmpty()) {
            return response()->json([
                'message' =>
                    'No se pueden asignar permisos inactivos.',
                'permisos_inactivos' =>
                    $permisosInactivos,
            ], 422);
        }

        return DB::transaction(
            function () use (
                $rol,
                $permisoIds
            ) {
                $actuales = RolPermiso::query()
                    ->where(
                        'rol_id',
                        $rol->id_rol
                    )
                    ->withCount(
                        'usuarioRolPermisos'
                    )
                    ->get();

                $aQuitar = $actuales
                    ->whereNotIn(
                        'permiso_id',
                        $permisoIds->all()
                    );

                $relacionesEnUso = $aQuitar
                    ->filter(
                        fn ($relacion) =>
                            $relacion
                                ->usuario_rol_permisos_count
                                > 0
                    );

                if (
                    $relacionesEnUso->isNotEmpty()
                ) {
                    return response()->json([
                        'message' =>
                            'No se pueden retirar relaciones Rol-Permiso que estén asignadas a usuarios.',
                        'relaciones_en_uso' =>
                            $relacionesEnUso
                                ->pluck(
                                    'id_rol_permiso'
                                )
                                ->values(),
                    ], 409);
                }

                if ($aQuitar->isNotEmpty()) {
                    RolPermiso::query()
                        ->whereIn(
                            'id_rol_permiso',
                            $aQuitar->pluck(
                                'id_rol_permiso'
                            )
                        )
                        ->delete();
                }

                foreach (
                    $permisoIds as $permisoId
                ) {
                    RolPermiso::firstOrCreate([
                        'rol_id' =>
                            $rol->id_rol,
                        'permiso_id' =>
                            $permisoId,
                    ]);
                }

                $relaciones = RolPermiso::query()
                    ->with('permiso')
                    ->where(
                        'rol_id',
                        $rol->id_rol
                    )
                    ->orderBy(
                        'id_rol_permiso'
                    )
                    ->get();

                return response()->json([
                    'message' =>
                        'Permisos del rol actualizados correctamente.',
                    'rol' => $rol,
                    'relaciones' =>
                        $relaciones,
                    'permisos' =>
                        $relaciones
                            ->pluck('permiso')
                            ->values(),
                ]);
            }
        );
    }

    private function autorizar(
        Request $request
    ): void {
        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if (
            !$usuario ||
            !$usuario->tienePermiso(
                'seguridad.gestionar_rol_permiso'
            )
        ) {
            abort(
                403,
                'No tiene permiso para gestionar relaciones Rol-Permiso.'
            );
        }
    }
}