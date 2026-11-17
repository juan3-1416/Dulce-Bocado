<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class InventoryPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'nombre' => 'inventario.ver',
                'descripcion' =>
                    'Consultar almacenes, existencias y movimientos de inventario.',
            ],
            [
                'nombre' => 'inventario.ingresar',
                'descripcion' =>
                    'Registrar ingresos de inventario.',
            ],
            [
                'nombre' => 'inventario.egresar',
                'descripcion' =>
                    'Registrar egresos de inventario.',
            ],
            [
                'nombre' => 'inventario.trasladar',
                'descripcion' =>
                    'Trasladar existencias entre almacenes autorizados.',
            ],
        ];

        $roles = Rol::query()
            ->whereIn('nombre', [
                'Administrador',
                'Producción',
            ])
            ->get()
            ->keyBy('nombre');

        $admin = Usuario::query()
            ->where('nombre_usuario', 'admin')
            ->first();

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
                ['Administrador', 'Producción']
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

                if (
                    $nombreRol === 'Administrador'
                    && $admin
                ) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' =>
                            $admin->id_usuario,
                        'rol_permiso_id' =>
                            $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }
    }
}
