<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use Illuminate\Database\Seeder;

class ProduccionSeeder extends Seeder
{
    public function run(): void
    {
        $administrador = Rol::where('nombre', 'Administrador')->first();
        $produccion = Rol::where('nombre', 'Producción')->first();

        $permisos = [
            [
                'nombre' => 'produccion.listar',
                'descripcion' => 'Permite listar y consultar órdenes de producción.',
            ],
            [
                'nombre' => 'produccion.crear',
                'descripcion' => 'Permite crear nuevas órdenes de producción.',
            ],
            [
                'nombre' => 'produccion.gestionar',
                'descripcion' => 'Permite completar, cancelar y gestionar el estado de órdenes de producción.',
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

            // Asignar al rol Administrador
            if ($administrador) {
                RolPermiso::firstOrCreate([
                    'rol_id' => $administrador->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);
            }

            // Asignar al rol Producción
            if ($produccion) {
                RolPermiso::firstOrCreate([
                    'rol_id' => $produccion->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);
            }
        }
    }
}
