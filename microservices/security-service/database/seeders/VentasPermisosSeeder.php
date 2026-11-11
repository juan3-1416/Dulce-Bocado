<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use Illuminate\Database\Seeder;

class VentasPermisosSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['ventas.ver', 'ventas.crear', 'ventas.modificar', 'ventas.anular'] as $nombre) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $nombre],
                ['descripcion' => "Permiso de Ventas: {$nombre}.", 'activo' => true],
            );

            foreach (['Administrador', 'Vendedor'] as $nombreRol) {
                $rol = Rol::where('nombre', $nombreRol)->firstOrFail();

                RolPermiso::firstOrCreate([
                    'rol_id' => $rol->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);
            }
        }
    }
}
