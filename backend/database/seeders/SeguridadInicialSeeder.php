<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use Illuminate\Database\Seeder;

class SeguridadInicialSeeder extends Seeder
{
    public function run(): void
    {
        $administrador = Rol::updateOrCreate(
            ['nombre' => 'Administrador'],
            [
                'descripcion' => 'Rol con acceso administrativo al sistema.',
                'activo' => true,
            ]
        );

        Rol::updateOrCreate(
            ['nombre' => 'Vendedor'],
            [
                'descripcion' => 'Rol destinado a las operaciones comerciales autorizadas.',
                'activo' => true,
            ]
        );

        Rol::updateOrCreate(
            ['nombre' => 'Producción'],
            [
                'descripcion' => 'Rol destinado a las operaciones de producción e inventario autorizadas.',
                'activo' => true,
            ]
        );

        $permisos = [
            [
                'nombre' => 'seguridad.gestionar_usuario',
                'descripcion' => 'Permite gestionar usuarios del sistema.',
            ],
            [
                'nombre' => 'seguridad.gestionar_rol',
                'descripcion' => 'Permite gestionar roles del sistema.',
            ],
            [
                'nombre' => 'seguridad.gestionar_permiso',
                'descripcion' => 'Permite gestionar permisos del sistema.',
            ],
            [
                'nombre' => 'seguridad.gestionar_rol_permiso',
                'descripcion' => 'Permite gestionar las relaciones entre roles y permisos.',
            ],
            [
                'nombre' => 'seguridad.asignar_roles_permisos',
                'descripcion' => 'Permite asignar relaciones de roles y permisos a los usuarios.',
            ],
        ];

        foreach ($permisos as $datosPermiso) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $datosPermiso['nombre']],
                [
                    'descripcion' => $datosPermiso['descripcion'],
                    'activo' => true,
                ]
            );

            RolPermiso::firstOrCreate([
                'rol_id' => $administrador->id_rol,
                'permiso_id' => $permiso->id_permiso,
            ]);
        }
    }
}