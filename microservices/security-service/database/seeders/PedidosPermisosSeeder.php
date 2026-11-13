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

                /*
                 * El usuario administrador inicial recibe
                 * explícitamente los permisos administrativos.
                 *
                 * Los demás usuarios obtienen accesos mediante
                 * el flujo normal de asignación de Seguridad.
                 */
                if ($nombreRol === 'Administrador') {
                    $admin = Usuario::query()
                        ->where(
                            'nombre_usuario',
                            'admin'
                        )
                        ->first();

                    if ($admin) {
                        UsuarioRolPermiso::firstOrCreate([
                            'usuario_id' =>
                                $admin->id_usuario,
                            'rol_permiso_id' =>
                                $rolPermiso
                                    ->id_rol_permiso,
                        ]);
                    }
                }
            }
        }
    }
}