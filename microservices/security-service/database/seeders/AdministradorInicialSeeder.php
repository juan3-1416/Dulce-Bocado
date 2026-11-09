<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdministradorInicialSeeder extends Seeder
{
    public function run(): void
    {
        $nombre = env('ADMIN_NAME');
        $nombreUsuario = env('ADMIN_USERNAME');
        $correo = env('ADMIN_EMAIL');
        $contrasena = env('ADMIN_PASSWORD');

        if (
            empty($nombre) ||
            empty($nombreUsuario) ||
            empty($correo) ||
            empty($contrasena)
        ) {
            throw new RuntimeException(
                'Faltan variables ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL o ADMIN_PASSWORD.'
            );
        }

        $administrador = Rol::where('nombre', 'Administrador')
            ->where('activo', true)
            ->firstOrFail();

        $usuario = Usuario::updateOrCreate(
            [
                'nombre_usuario' => $nombreUsuario,
            ],
            [
                'nombre' => $nombre,
                'correo_electronico' => $correo,
                'contrasena' => Hash::make($contrasena),
                'activo' => true,
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
            ]
        );

        $rolPermisos = $administrador
            ->rolPermisos()
            ->get();

        foreach ($rolPermisos as $rolPermiso) {
            UsuarioRolPermiso::firstOrCreate([
                'usuario_id' => $usuario->id_usuario,
                'rol_permiso_id' => $rolPermiso->id_rol_permiso,
            ]);
        }
    }
}