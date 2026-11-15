<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class PedidosPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'nombre' => 'pedidos.gestionar_pedido',
                'descripcion' =>
                    'Registrar, consultar y modificar pedidos.',
            ],
            [
                'nombre' => 'pedidos.gestionar_estado_entrega',
                'descripcion' =>
                    'Gestionar estados, entrega y cancelación de pedidos.',
            ],
        ];

        $roles = Rol::query()
            ->whereIn('nombre', [
                'Administrador',
                'Vendedor',
            ])
            ->get()
            ->keyBy('nombre');

        $nombreUsuario = env('ADMIN_USERNAME');
        $admin = $nombreUsuario
            ? Usuario::query()->where('nombre_usuario', $nombreUsuario)->first()
            : null;

        foreach ($permisos as $datosPermiso) {
            $permiso = Permiso::updateOrCreate(
                [
                    'nombre' => $datosPermiso['nombre'],
                ],
                [
                    'descripcion' =>
                        $datosPermiso['descripcion'],
                    'activo' => true,
                ]
            );

            foreach (
                ['Administrador', 'Vendedor']
                as $nombreRol
            ) {
                $rol = $roles->get($nombreRol);

                if (!$rol) {
                    continue;
                }

                $rolPermiso = RolPermiso::firstOrCreate([
                    'rol_id' => $rol->id_rol,
                    'permiso_id' =>
                        $permiso->id_permiso,
                ]);

                // También asigna el permiso en instalaciones existentes.
                if ($nombreRol === 'Administrador' && $admin) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' => $admin->id_usuario,
                        'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }
    }
}
