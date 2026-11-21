<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class DashboardPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $permiso = Permiso::updateOrCreate(
            ['nombre' => 'dashboard.consultar'],
            [
                'descripcion' => 'Permite consultar el dashboard administrativo.',
                'activo' => true,
            ]
        );

        $rol = Rol::where('nombre', 'Administrador')
            ->where('activo', true)
            ->first();

        if (!$rol) {
            return;
        }

        $rolPermiso = RolPermiso::firstOrCreate([
            'rol_id' => $rol->id_rol,
            'permiso_id' => $permiso->id_permiso,
        ]);

        $admin = Usuario::where('nombre_usuario', 'admin')
            ->where('activo', true)
            ->first();

        if ($admin) {
            UsuarioRolPermiso::firstOrCreate([
                'usuario_id' => $admin->id_usuario,
                'rol_permiso_id' => $rolPermiso->id_rol_permiso,
            ]);
        }
    }
}