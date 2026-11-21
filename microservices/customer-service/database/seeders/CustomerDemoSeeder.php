<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CustomerDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'CustomerDemoSeeder no puede ejecutarse en producción.'
            );
        }

        $nombres = [
            'María', 'José', 'Ana', 'Carlos',
            'Daniela', 'Luis', 'Camila', 'Jorge',
            'Valeria', 'Miguel', 'Fernanda', 'Diego',
            'Paola', 'Andrés', 'Gabriela', 'Sergio',
            'Lucía', 'Rodrigo', 'Natalia', 'Fernando',
        ];

        $apellidos = [
            'Gonzales Rojas',
            'Vargas Peña',
            'Mendoza Suárez',
            'Ribera Flores',
            'Salvatierra López',
            'Pérez Chávez',
            'Morales Ortiz',
            'Rojas Vaca',
            'Sánchez Méndez',
            'Torrez Aguilera',
            'Romero Justiniano',
            'Cuéllar Pinto',
            'Gutiérrez Cabrera',
            'Álvarez Mercado',
            'Castro Céspedes',
            'Vaca Rodríguez',
            'Flores Daza',
            'Méndez Parada',
            'Suárez Arce',
            'López Molina',
        ];

        $zonas = [
            'Zona Norte',
            'Zona Central',
            'Av. Banzer',
            'Av. Beni',
            'Av. Alemania',
            'Av. Mutualista',
            'Av. Virgen de Cotoca',
            'Barrio Equipetrol',
            'Barrio Hamacas',
            'Barrio Urbari',
            'Av. Santos Dumont',
            'Av. Paurito',
        ];

        DB::transaction(function () use (
            $nombres,
            $apellidos,
            $zonas
        ): void {
            for ($i = 1; $i <= 100; $i++) {
                $nombre =
                    $nombres[
                        ($i - 1) % count($nombres)
                    ];

                $apellido =
                    $apellidos[
                        (($i - 1) * 3) %
                        count($apellidos)
                    ];

                $ciNit = (string) (9600000 + $i);

                DB::table('cliente')->updateOrInsert(
                    [
                        'ci_nit' => $ciNit,
                    ],
                    [
                        'nombre' => $nombre,
                        'apellido' => $apellido,

                        'telefono' =>
                            (string) (71000000 + $i),

                        'correo_electronico' =>
                            sprintf(
                                'cliente.demo%03d@dulcebocado.test',
                                $i
                            ),

                        'direccion' =>
                            $zonas[
                                ($i - 1) %
                                count($zonas)
                            ] .
                            ' #' .
                            (100 + $i),

                        'observaciones' =>
                            self::MARCA .
                            ' | Cliente demo #' .
                            str_pad(
                                (string) $i,
                                3,
                                '0',
                                STR_PAD_LEFT
                            ),

                        'estado' => true,

                        'fecha_actualizacion' =>
                            now(),

                        'fecha_creacion' =>
                            now(),
                    ]
                );
            }
        });

        $this->command?->info(
            'CustomerDemoSeeder cargado correctamente.'
        );
    }
}