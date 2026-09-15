<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class ReportePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'reportes.generar'],
            [
                'descripcion' => 'Permite consultar, generar, descargar y enviar reportes del sistema',
                'activo' => true,
            ]
        );

        if (!$permiso->activo) {
            $permiso->update(['activo' => true]);
        }

        $rolAdmin = Rol::where('nombre', 'Administrador')
            ->where('activo', true)
            ->first();

        if (!$rolAdmin) {
            return;
        }

        $rolPermiso = RolPermiso::firstOrCreate([
            'rol_id' => $rolAdmin->id_rol,
            'permiso_id' => $permiso->id_permiso,
        ]);

        $usuariosAdministradores = UsuarioRolPermiso::query()
            ->whereHas('rolPermiso', function ($query) use ($rolAdmin) {
                $query->where('rol_id', $rolAdmin->id_rol);
            })
            ->pluck('usuario_id')
            ->unique();

        foreach ($usuariosAdministradores as $usuarioId) {
            UsuarioRolPermiso::firstOrCreate([
                'usuario_id' => $usuarioId,
                'rol_permiso_id' => $rolPermiso->id_rol_permiso,
            ]);
        }
    }
}