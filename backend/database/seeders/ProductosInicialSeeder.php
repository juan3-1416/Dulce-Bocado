<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class ProductosInicialSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'nombre' => 'productos.gestionar_producto',
                'descripcion' => 'Permite gestionar productos y categorías del catálogo.',
            ],
            [
                'nombre' => 'productos.gestionar_presentacion',
                'descripcion' => 'Permite gestionar las presentaciones, asignaciones y precios de los productos.',
            ],
        ];

        $rolAdmin = Rol::where('nombre', 'Administrador')
            ->where('activo', true)
            ->first();

        foreach ($permisos as $datosPermiso) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $datosPermiso['nombre']],
                [
                    'descripcion' => $datosPermiso['descripcion'],
                    'activo' => true,
                ]
            );

            if ($rolAdmin) {
                $rolPermiso = RolPermiso::firstOrCreate([
                    'rol_id' => $rolAdmin->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);

                // Asignar a los usuarios que ya tienen el rol Administrador
                $usuariosAdmin = Usuario::whereHas('usuarioRolPermisos.rolPermiso', function ($query) use ($rolAdmin) {
                    $query->where('rol_id', $rolAdmin->id_rol);
                })->get();

                foreach ($usuariosAdmin as $usuario) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' => $usuario->id_usuario,
                        'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }
    }
}
