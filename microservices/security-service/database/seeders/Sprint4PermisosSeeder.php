<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class Sprint4PermisosSeeder extends Seeder
{
    public function run(): void
    {
        $mapa = [
            'ventas.confirmar' => [
                'descripcion' => 'Permite confirmar una venta y descontar stock.',
                'roles' => ['Administrador', 'Vendedor'],
            ],
            'pagos.crear' => [
                'descripcion' => 'Permite registrar pagos en efectivo o QR.',
                'roles' => ['Administrador', 'Vendedor'],
            ],
            'pagos.ver' => [
                'descripcion' => 'Permite consultar pagos y saldos.',
                'roles' => ['Administrador', 'Vendedor'],
            ],
            'recibos.crear' => [
                'descripcion' => 'Permite generar recibos internos.',
                'roles' => ['Administrador', 'Vendedor'],
            ],
            'recibos.ver' => [
                'descripcion' => 'Permite consultar, descargar e imprimir recibos.',
                'roles' => ['Administrador', 'Vendedor'],
            ],
            'recibos.anular' => [
                'descripcion' => 'Permite anular recibos internos con trazabilidad.',
                'roles' => ['Administrador'],
            ],
        ];

        $roles = Rol::query()
            ->whereIn('nombre', ['Administrador', 'Vendedor'])
            ->get()
            ->keyBy('nombre');

        $nombreAdministrador = env('ADMIN_USERNAME') ?: 'admin';

        $administrador = Usuario::query()
            ->where('nombre_usuario', $nombreAdministrador)
            ->first();

        foreach ($mapa as $nombrePermiso => $configuracion) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $nombrePermiso],
                [
                    'descripcion' => $configuracion['descripcion'],
                    'activo' => true,
                ]
            );

            foreach ($configuracion['roles'] as $nombreRol) {
                $rol = $roles->get($nombreRol);

                if (!$rol) {
                    continue;
                }

                $rolPermiso = RolPermiso::firstOrCreate([
                    'rol_id' => $rol->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);

                if (
                    $nombreRol === 'Administrador'
                    && $administrador
                ) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' => $administrador->id_usuario,
                        'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }
    }
}