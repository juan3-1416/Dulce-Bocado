<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;

class DashboardPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'dashboard.consultar'],
            [
                'descripcion' => 'Permite consultar el dashboard administrativo y métricas consolidadas del sistema',
                'activo' => true,
            ]
        );

        if (!$permiso->activo) {
            $permiso->update(['activo' => true]);
        }

        // Asignar permiso al rol Administrador
        $rolAdmin = Rol::where('nombre', 'Administrador')->where('activo', true)->first();
        if ($rolAdmin) {
            $rolPermiso = RolPermiso::firstOrCreate([
                'rol_id' => $rolAdmin->id_rol,
                'permiso_id' => $permiso->id_permiso,
            ]);

            // Asignar a los usuarios que ya tienen el rol Administrador
            $usuariosIds = UsuarioRolPermiso::query()
                ->whereHas('rolPermiso', function ($query) use ($rolAdmin) {
                    $query->where('rol_id', $rolAdmin->id_rol);
                })
                ->pluck('usuario_id')
                ->unique();

            foreach ($usuariosIds as $usuarioId) {
                UsuarioRolPermiso::firstOrCreate([
                    'usuario_id' => $usuarioId,
                    'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                ]);
            }
        }
    }
}
