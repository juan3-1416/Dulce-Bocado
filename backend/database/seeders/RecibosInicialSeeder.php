<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class RecibosInicialSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * Crear permiso de CU13.
         */
        $permiso = Permiso::firstOrCreate(
            [
                'nombre' => 'recibos.gestionar_recibo',
            ],
            [
                'descripcion' =>
                    'Permite generar, consultar, imprimir, reimprimir y anular recibos.',
                'activo' => true,
            ]
        );

        /*
         * Reactivar si ya existía pero estaba inactivo.
         */
        if (!$permiso->activo) {
            $permiso->update([
                'activo' => true,
            ]);
        }

        /*
         * Administrador y Vendedor podrán
         * gestionar recibos.
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
             * Propagar el nuevo permiso a usuarios
             * que ya pertenecen al rol.
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