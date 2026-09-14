<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IngresoPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permisos = [
            [
                'nombre' => 'inventario.gestionar_ingreso',
                'descripcion' => 'Permite listar, ver y registrar nuevos ingresos al inventario'
            ],
        ];

        foreach ($permisos as $permiso) {
            Permiso::firstOrCreate(['nombre' => $permiso['nombre']], $permiso);
        }

        // Asignar al Administrador
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
