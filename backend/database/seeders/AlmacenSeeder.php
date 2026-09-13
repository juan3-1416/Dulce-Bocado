<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AlmacenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $almacenes = [
            ['id_almacen' => 1, 'nombre' => 'Materias Primas', 'descripcion' => 'Almacén principal para ingredientes puros.'],
            ['id_almacen' => 2, 'nombre' => 'Producción', 'descripcion' => 'Almacén para productos en proceso y productos terminados recién salidos.'],
            ['id_almacen' => 3, 'nombre' => 'Mostrador', 'descripcion' => 'Almacén físico en tienda para venta al público y entregas.']
        ];

        foreach ($almacenes as $almacen) {
            DB::table('almacen')->updateOrInsert(
                ['id_almacen' => $almacen['id_almacen']],
                $almacen
            );
        }
    }
}
