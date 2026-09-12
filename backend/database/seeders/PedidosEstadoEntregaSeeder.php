<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PedidosEstadoEntregaSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Crear / actualizar permiso CU15
        |--------------------------------------------------------------------------
        */
        DB::table('permisos')->updateOrInsert(
            [
                'nombre' =>
                    'pedidos.gestionar_estado_entrega',
            ],
            [
                'descripcion' =>
                    'Permite gestionar los estados, cancelación y entrega de pedidos.',
                'activo' =>
                    true,
            ]
        );

        $permiso = DB::table('permisos')
            ->where(
                'nombre',
                'pedidos.gestionar_estado_entrega'
            )
            ->first();

        if (!$permiso) {
            throw new \RuntimeException(
                'No se pudo crear el permiso de CU15.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Roles autorizados
        |--------------------------------------------------------------------------
        |
        | CU15 puede ser gestionado por:
        | - Administrador
        | - Vendedor
        |--------------------------------------------------------------------------
        */
        $roles = DB::table('roles')
            ->whereIn(
                'nombre',
                [
                    'Administrador',
                    'Vendedor',
                ]
            )
            ->where(
                'activo',
                true
            )
            ->get();

        foreach ($roles as $rol) {
            /*
             * Obtener los usuarios que actualmente
             * pertenecen a este rol.
             *
             * En este proyecto la pertenencia al rol
             * se representa a través de
             * usuario_rol_permiso.
             */
            $usuariosDelRol = DB::table(
                'usuario_rol_permiso as urp'
            )
                ->join(
                    'rol_permiso as rp',
                    'rp.id_rol_permiso',
                    '=',
                    'urp.rol_permiso_id'
                )
                ->where(
                    'rp.rol_id',
                    $rol->id_rol
                )
                ->distinct()
                ->pluck(
                    'urp.usuario_id'
                );

            /*
             * Crear relación Rol ↔ Permiso.
             */
            DB::table('rol_permiso')
                ->insertOrIgnore([
                    'rol_id' =>
                        $rol->id_rol,

                    'permiso_id' =>
                        $permiso->id_permiso,
                ]);

            $rolPermiso = DB::table(
                'rol_permiso'
            )
                ->where(
                    'rol_id',
                    $rol->id_rol
                )
                ->where(
                    'permiso_id',
                    $permiso->id_permiso
                )
                ->first();

            if (!$rolPermiso) {
                throw new \RuntimeException(
                    "No se pudo asignar el permiso al rol {$rol->nombre}."
                );
            }

            /*
             * Propagar el nuevo permiso a los usuarios
             * que ya tenían ese rol.
             */
            foreach ($usuariosDelRol as $usuarioId) {
                DB::table(
                    'usuario_rol_permiso'
                )
                    ->insertOrIgnore([
                        'usuario_id' =>
                            $usuarioId,

                        'rol_permiso_id' =>
                            $rolPermiso
                                ->id_rol_permiso,
                    ]);
            }
        }
    }
}