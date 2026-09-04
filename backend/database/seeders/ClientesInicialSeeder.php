<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\Usuario;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ClientesInicialSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Permiso para gestionar clientes
        $permisos = [
            [
                'nombre' => 'clientes.gestionar_cliente',
                'descripcion' => 'Permite registrar, consultar, editar y gestionar clientes para pedidos y ventas.',
            ],
        ];

        // 2. Roles autorizados: Administrador y Vendedor
        $rolesAutorizados = Rol::whereIn('nombre', ['Administrador', 'Vendedor'])
            ->where('activo', true)
            ->get();

        foreach ($permisos as $datosPermiso) {
            $permiso = Permiso::updateOrCreate(
                ['nombre' => $datosPermiso['nombre']],
                [
                    'descripcion' => $datosPermiso['descripcion'],
                    'activo' => true,
                ]
            );

            foreach ($rolesAutorizados as $rol) {
                $rolPermiso = RolPermiso::firstOrCreate([
                    'rol_id' => $rol->id_rol,
                    'permiso_id' => $permiso->id_permiso,
                ]);

                // Asignar el permiso a los usuarios que ya tienen este rol asignado
                $usuariosConRol = Usuario::whereHas('usuarioRolPermisos.rolPermiso', function ($query) use ($rol) {
                    $query->where('rol_id', $rol->id_rol);
                })->get();

                foreach ($usuariosConRol as $usuario) {
                    UsuarioRolPermiso::firstOrCreate([
                        'usuario_id' => $usuario->id_usuario,
                        'rol_permiso_id' => $rolPermiso->id_rol_permiso,
                    ]);
                }
            }
        }

        // 3. Clientes de ejemplo orientados a pedidos no presenciales y entregas
        $clientes = [
            [
                'nombre' => 'María Elena',
                'apellido' => 'Gonzales Rojas',
                'ci_nit' => '4928172',
                'telefono' => '77341209',
                'correo_electronico' => 'maria.gonzales@gmail.com',
                'direccion' => 'Av. Busch #450, 2do Anillo',
                'observaciones' => 'Pide tortas personalizadas para cumpleaños. Preferencia de contacto por WhatsApp.',
                'estado' => true,
                'fecha_creacion' => now(),
                'fecha_actualizacion' => now(),
            ],
            [
                'nombre' => 'Carlos Andrés',
                'apellido' => 'Vaca Pereira',
                'ci_nit' => '6283910',
                'telefono' => '70019283',
                'correo_electronico' => 'carlos.vaca@hotmail.com',
                'direccion' => 'Barrio Las Palmas, Calle 5 #12',
                'observaciones' => 'Entrega siempre por la tarde después de las 16:00.',
                'estado' => true,
                'fecha_creacion' => now(),
                'fecha_actualizacion' => now(),
            ],
            [
                'nombre' => 'Eventos y Banquetes del Oriente S.R.L.',
                'apellido' => null,
                'ci_nit' => '1029384756',
                'telefono' => '33445566',
                'correo_electronico' => 'pedidos@eventosoriente.com',
                'direccion' => 'Av. San Martín, Edif. Platinum Piso 3',
                'observaciones' => 'Cliente corporativo para pedidos de bocaditos y mesas de postres a gran escala.',
                'estado' => true,
                'fecha_creacion' => now(),
                'fecha_actualizacion' => now(),
            ],
        ];

        foreach ($clientes as $cliente) {
            DB::table('cliente')->updateOrInsert(
                ['ci_nit' => $cliente['ci_nit']],
                $cliente
            );
        }
    }
}
