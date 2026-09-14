<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class EgresoPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permisos = [
            [
                'nombre' => 'inventario.gestionar_egreso',
                'descripcion' => 'Permite listar, ver y registrar nuevos egresos del inventario'
            ],
        ];

        foreach ($permisos as $permisoData) {
            $permiso = Permiso::firstOrCreate(
                ['nombre' => $permisoData['nombre']],
                ['descripcion' => $permisoData['descripcion']]
            );

            // Asignar al Rol Administrador
            $rolAdmin = Rol::where('nombre', 'Administrador')->first();
            if ($rolAdmin) {
                $rolPermiso = RolPermiso::firstOrCreate([
                    'rol_id' => $rolAdmin->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);

                // Asignar la relación a los usuarios administradores existentes
                $usuarios = Usuario::all();
                foreach ($usuarios as $usuario) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' => $usuario->id_usuario,
                        'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }
    }
}
