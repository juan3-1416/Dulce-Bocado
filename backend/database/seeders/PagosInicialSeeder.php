<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class PagosInicialSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * 1. Crear permiso de CU11.
         */
        $permiso = Permiso::firstOrCreate(
            [
                'nombre' => 'pagos.gestionar_pago',
            ],
            [
                'descripcion' =>
                    'Permite registrar, consultar y anular pagos.',
                'activo' => true,
            ]
        );

        /*
         * Reactivar si existía inactivo.
         */
        if (!$permiso->activo) {
            $permiso->update([
                'activo' => true,
            ]);
        }

        /*
         * 2. Asignar a Administrador y Vendedor.
         */
        $roles = Rol::query()
            ->whereIn(
                'nombre',
                [
                    'Administrador',
                    'Vendedor',
                ]
            )
            ->where('activo', true)
            ->get();

        foreach ($roles as $rol) {
            $rolPermiso = RolPermiso::firstOrCreate([
                'rol_id' => $rol->id_rol,
                'permiso_id' => $permiso->id_permiso,
            ]);

            /*
             * 3. Propagar a usuarios que ya tienen
             * asignaciones pertenecientes al rol.
             */
            $usuariosIds = UsuarioRolPermiso::query()
                ->whereHas(
                    'rolPermiso',
                    function ($query) use ($rol) {
                        $query->where(
                            'rol_id',
                            $rol->id_rol
                        );
                    }
                )
                ->pluck('usuario_id')
                ->unique();

            foreach ($usuariosIds as $usuarioId) {
                UsuarioRolPermiso::firstOrCreate([
                    'usuario_id' => $usuarioId,
                    'rol_permiso_id' =>
                        $rolPermiso->id_rol_permiso,
                ]);
            }
        }
    }
}