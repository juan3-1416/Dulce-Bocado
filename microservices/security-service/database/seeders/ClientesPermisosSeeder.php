<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use Illuminate\Database\Seeder;

class ClientesPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            'clientes.ver',
            'clientes.crear',
            'clientes.modificar',
            'clientes.cambiar_estado',
        ];

        foreach ($permisos as $nombre) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $nombre],
                [
                    'descripcion' => "Permiso de Clientes: {$nombre}.",
                    'activo' => true,
                ],
            );

            foreach (['Administrador', 'Vendedor'] as $nombreRol) {
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