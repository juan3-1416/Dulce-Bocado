<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Permiso;
use App\Models\Rol;

class InventarioPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permisos = [
            [
                'nombre' => 'inventario.listar_almacenes',
                'descripcion' => 'Permite visualizar la lista de almacenes del sistema'
            ],
            [
                'nombre' => 'inventario.ver_existencias',
                'descripcion' => 'Permite visualizar el stock o existencias dentro de un almacén'
            ]
        ];

        foreach ($permisos as $permiso) {
            Permiso::firstOrCreate(['nombre' => $permiso['nombre']], $permiso);
        }

        // Asignar permisos básicos a Administrador
        $rolAdmin = Rol::where('nombre', 'Administrador')->first();
        if ($rolAdmin) {
            $nombresPermisos = array_column($permisos, 'nombre');
            $permisosIds = Permiso::whereIn('nombre', $nombresPermisos)->pluck('id_permiso')->toArray();

            foreach ($permisosIds as $permisoId) {
                DB::table('rol_permiso')->updateOrInsert([
                    'rol_id' => $rolAdmin->id_rol,
                    'permiso_id' => $permisoId,
                ]);
            }
        }
    }
}
