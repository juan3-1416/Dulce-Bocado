<?php

namespace Database\Seeders;

use App\Models\Almacen;
use App\Models\Inventario;
use App\Models\MateriaPrima;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventarioMateriasPrimasSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $almacen = Almacen::query()
                ->where(
                    'nombre',
                    'Materias Primas'
                )
                ->first();

            if (!$almacen) {
                throw new RuntimeException(
                    'No existe el almacén de Materias Primas.'
                );
            }

            /*
             * Existencias iniciales académicas.
             *
             * IMPORTANTE:
             * firstOrCreate conserva cualquier
             * cantidad que ya exista.
             *
             * Esto evita reiniciar el inventario
             * después de registrar consumos.
             */
            $stocksIniciales = [
                'Harina' => 10000,
                'Azúcar' => 8000,
                'Huevos' => 100,
                'Leche' => 10000,
                'Chocolate' => 6000,

                'Crema de leche' => 5000,
                'Mantequilla' => 5000,
                'Vainilla' => 1500,
                'Cacao en polvo' => 3000,
                'Dulce de leche' => 5000,

                'Queso crema' => 5000,
                'Frutos rojos' => 3000,
                'Jugo de limón' => 3000,
                'Avena' => 5000,
                'Canela' => 1000,

                'Zanahoria' => 5000,
                'Aceite' => 5000,
                'Polvo de hornear' => 1500,
                'Azúcar impalpable' => 3000,
                'Leche condensada' => 5000,

                'Leche evaporada' => 5000,
                'Cerezas' => 2500,
                'Colorante rojo' => 500,
                'Chispas de chocolate' => 4000,
                'Levadura' => 1500,
            ];

            foreach (
                $stocksIniciales as
                $nombreMateria => $cantidad
            ) {
                $materiaPrima =
                    MateriaPrima::query()
                        ->where(
                            'nombre',
                            $nombreMateria
                        )
                        ->where(
                            'estado',
                            true
                        )
                        ->first();

                if (!$materiaPrima) {
                    throw new RuntimeException(
                        'No existe la materia prima: ' .
                        $nombreMateria
                    );
                }

                /*
                 * No utilizamos updateOrCreate.
                 *
                 * Si ya existe inventario,
                 * dejamos intacta su cantidad.
                 */
                Inventario::firstOrCreate(
                    [
                        'id_almacen' =>
                            $almacen->id_almacen,

                        'id_materia_prima' =>
                            $materiaPrima
                                ->id_materia_prima,
                    ],
                    [
                        'id_producto_presentacion' =>
                            null,

                        'cantidad' =>
                            $cantidad,

                        'ultima_actualizacion' =>
                            now(),
                    ]
                );
            }
        });
    }
}