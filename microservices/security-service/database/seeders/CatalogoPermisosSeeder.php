<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use Illuminate\Database\Seeder;

class CatalogoPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $mapa = [
            'catalogo.ver' => [
                'Administrador',
                'Vendedor',
            ],
            'catalogo.gestionar' => [
                'Administrador',
            ],
            'recetas.ver' => [
                'Administrador',
            ],
            'recetas.gestionar' => [
                'Administrador',
            ],
        ];

        foreach ($mapa as $nombrePermiso => $roles) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $nombrePermiso],
                [
                    'descripcion' => "Permiso de Catalog: {$nombrePermiso}.",
                    'activo' => true,
                ],
            );

            foreach ($roles as $nombreRol) {
                $rol = Rol::where('nombre', $nombreRol)
                    ->firstOrFail();

                RolPermiso::firstOrCreate([
                    'rol_id' => $rol->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);
            }
        }
    }
}