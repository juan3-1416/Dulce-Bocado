<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class PagosInternetInicialSeeder extends Seeder
{
    public function run(): void
    {
        $permiso = Permiso::firstOrCreate(
            [
                'nombre' => 'pagos.gestionar_pago_internet',
            ],
            [
                'descripcion' =>
                    'Permite iniciar, consultar y confirmar pagos por internet.',
                'activo' => true,
            ]
        );

        if (!$permiso->activo) {
            $permiso->update([
                'activo' => true,
            ]);
        }

        $roles = Rol::query()
            ->whereIn(
                'nombre',
                [
                    'Administrador',
                    'Vendedor',
                ]
            )
            ->where('activo', true)
            ->get();

        foreach ($roles as $rol) {
            $rolPermiso = RolPermiso::firstOrCreate([
                'rol_id' => $rol->id_rol,
                'permiso_id' => $permiso->id_permiso,
            ]);

            $usuariosIds = UsuarioRolPermiso::query()
                ->whereHas(
                    'rolPermiso',
                    function ($query) use ($rol) {
                        $query->where(
                            'rol_id',
                            $rol->id_rol
                        );
                    }
                )
                ->pluck('usuario_id')
                ->unique();

            foreach ($usuariosIds as $usuarioId) {
                UsuarioRolPermiso::firstOrCreate([
                    'usuario_id' => $usuarioId,
                    'rol_permiso_id' =>
                        $rolPermiso->id_rol_permiso,
                ]);
            }
        }
    }
}