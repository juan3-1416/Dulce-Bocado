<?php

namespace Database\Seeders;

use App\Models\MateriaPrima;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;

class RecetasInicialSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * 1. Crear permiso de CU9.
         */
        $permiso = Permiso::firstOrCreate(
            [
                'nombre' => 'recetas.gestionar_receta',
            ],
            [
                'descripcion' =>
                    'Permite gestionar materias primas y recetas.',
                'activo' => true,
            ]
        );

        /*
         * Si ya existía pero estaba inactivo,
         * lo dejamos nuevamente activo.
         */
        if (!$permiso->activo) {
            $permiso->update([
                'activo' => true,
            ]);
        }

        /*
         * 2. Asignar el permiso a los roles
         * Administrador y Producción.
         */
        $roles = Rol::query()
            ->whereIn(
                'nombre',
                [
                    'Administrador',
                    'Producción',
                ]
            )
            ->where('activo', true)
            ->get();

        foreach ($roles as $rol) {
            $rolPermiso = RolPermiso::firstOrCreate([
                'rol_id' => $rol->id_rol,
                'permiso_id' => $permiso->id_permiso,
            ]);

            /*
             * 3. Si existen usuarios que ya tienen
             * alguna asignación correspondiente a este rol,
             * también se les agrega la nueva relación.
             */
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

        /*
         * 4. Materias primas iniciales.
         *
         * Se utiliza una unidad base única
         * para evitar conversiones complejas.
         */
        $materiasPrimas = [
            [
                'nombre' => 'Harina',
                'unidad_medida' => 'g',
                'descripcion' =>
                    'Harina utilizada en preparación de productos.',
            ],
            [
                'nombre' => 'Azúcar',
                'unidad_medida' => 'g',
                'descripcion' =>
                    'Azúcar utilizada en recetas.',
            ],
            [
                'nombre' => 'Huevos',
                'unidad_medida' => 'unidad',
                'descripcion' =>
                    'Huevos utilizados en preparación.',
            ],
            [
                'nombre' => 'Leche',
                'unidad_medida' => 'ml',
                'descripcion' =>
                    'Leche utilizada en recetas.',
            ],
            [
                'nombre' => 'Chocolate',
                'unidad_medida' => 'g',
                'descripcion' =>
                    'Chocolate utilizado en preparación y decoración.',
            ],
        ];

        foreach ($materiasPrimas as $datos) {
            MateriaPrima::updateOrCreate(
                [
                    'nombre' => $datos['nombre'],
                ],
                [
                    'unidad_medida' =>
                        $datos['unidad_medida'],

                    'descripcion' =>
                        $datos['descripcion'],

                    'estado' => true,
                ]
            );
        }
    }
}