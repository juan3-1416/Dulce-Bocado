<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class VentasInicialSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * 1. Crear permiso de CU10.
         */
        $permiso = Permiso::firstOrCreate(
            [
                'nombre' => 'ventas.gestionar_venta',
            ],
            [
                'descripcion' =>
                    'Permite registrar, consultar, editar y anular ventas.',
                'activo' => true,
            ]
        );

        /*
         * Si el permiso ya existía pero estaba inactivo,
         * se vuelve a activar.
         */
        if (!$permiso->activo) {
            $permiso->update([
                'activo' => true,
            ]);
        }

        /*
         * 2. Asignar el permiso a los roles
         * Administrador y Vendedor.
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
             * 3. Agregar la nueva relación a los usuarios
             * que ya poseen asignaciones correspondientes
             * al rol actual.
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