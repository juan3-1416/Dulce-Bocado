<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProduccionPermissionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $permisos = [
                [
                    'nombre' => 'produccion.listar',
                    'descripcion' =>
                        'Permite consultar las órdenes de producción.',
                ],
                [
                    'nombre' => 'produccion.crear',
                    'descripcion' =>
                        'Permite registrar nuevas órdenes de producción.',
                ],
                [
                    'nombre' => 'produccion.gestionar',
                    'descripcion' =>
                        'Permite iniciar y cancelar órdenes de producción.',
                ],
                [
                    'nombre' => 'produccion.registrar_consumo',
                    'descripcion' =>
                        'Permite registrar consumo, costo y desperdicio de producción.',
                ],
            ];

            foreach ($permisos as $datosPermiso) {
                DB::table('permisos')->updateOrInsert(
                    [
                        'nombre' => $datosPermiso['nombre'],
                    ],
                    [
                        'descripcion' => $datosPermiso['descripcion'],
                        'activo' => true,
                    ]
                );
            }

            $permisosProduccion = DB::table('permisos')
                ->whereIn('nombre', [
                    'produccion.listar',
                    'produccion.crear',
                    'produccion.gestionar',
                    'produccion.registrar_consumo',
                ])
                ->get();

            $roles = DB::table('roles')
                ->whereIn('nombre', [
                    'Administrador',
                    'Producción',
                ])
                ->get();

            foreach ($roles as $rol) {
                /*
                 * Primero obtenemos usuarios que ya pertenecen
                 * al rol antes de agregar nuevas relaciones.
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

                foreach ($permisosProduccion as $permiso) {
                    DB::table('rol_permiso')->updateOrInsert(
                        [
                            'rol_id' =>
                                $rol->id_rol,

                            'permiso_id' =>
                                $permiso->id_permiso,
                        ]
                    );

                    $rolPermiso = DB::table('rol_permiso')
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
                        continue;
                    }

                    foreach ($usuariosDelRol as $usuarioId) {
                        DB::table(
                            'usuario_rol_permiso'
                        )->updateOrInsert([
                            'usuario_id' =>
                                $usuarioId,

                            'rol_permiso_id' =>
                                $rolPermiso
                                    ->id_rol_permiso,
                        ]);
                    }
                }
            }
        });
    }
}