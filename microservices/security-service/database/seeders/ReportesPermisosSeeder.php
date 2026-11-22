<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class ReportesPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $permisosData = [
            [
                'nombre' => 'reportes.generar',
                'descripcion' => 'Permite consultar y generar reportes parametrizados (PDF/vista).',
                'activo' => true,
            ],
            [
                'nombre' => 'reportes.enviar',
                'descripcion' => 'Permite enviar reportes generados a múltiples destinatarios por correo.',
                'activo' => true,
            ],
            [
                'nombre' => 'reportes.ver',
                'descripcion' => 'Permite visualizar la sección de reportes e histórico de envíos.',
                'activo' => true,
            ],
        ];

        $rolAdmin = Rol::where('nombre', 'Administrador')
            ->where('activo', true)
            ->first();

        $admin = Usuario::where('nombre_usuario', 'admin')
            ->where('activo', true)
            ->first();

        foreach ($permisosData as $data) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $data['nombre']],
                [
                    'descripcion' => $data['descripcion'],
                    'activo' => $data['activo'],
                ]
            );

            if ($rolAdmin) {
                $rolPermiso = RolPermiso::firstOrCreate([
                    'rol_id' => $rolAdmin->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);

                if ($admin) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' => $admin->id_usuario,
                        'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }
    }
}
