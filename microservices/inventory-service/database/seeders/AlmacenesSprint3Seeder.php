<?php

namespace Database\Seeders;

use App\Models\Almacen;
use Illuminate\Database\Seeder;

class AlmacenesSprint3Seeder extends Seeder
{
    public function run(): void
    {
        $almacenes = [
            [
                'tipo' => 'MATERIAS_PRIMAS',
                'nombre' => 'Materias primas',
            ],
            [
                'tipo' => 'PRODUCCION',
                'nombre' => 'Producción',
            ],
            [
                'tipo' => 'MOSTRADOR',
                'nombre' => 'Mostrador',
            ],
        ];

        foreach ($almacenes as $datos) {
            Almacen::updateOrCreate(
                ['tipo' => $datos['tipo']],
                [
                    'nombre' => $datos['nombre'],
                    'activo' => true,
                ]
            );
        }
    }
}