<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CatalogDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'CatalogDemoSeeder no puede ejecutarse en producción.'
            );
        }

        DB::transaction(function (): void {
            $categorias = [
                'Tortas',
                'Postres',
                'Cupcakes',
                'Galletas',
                'Panadería',
            ];

            foreach ($categorias as $nombre) {
                DB::table('categorias')->updateOrInsert(
                    ['nombre' => $nombre],
                    [
                        'estado' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            $productos = [
                [
                    'categoria' => 'Tortas',
                    'nombre' => 'Torta de Chocolate',
                    'descripcion' => 'Bizcocho de chocolate con relleno y cobertura de chocolate.',
                    'personalizable' => true,
                    'presentaciones' => [
                        'Pequeña' => 95,
                        'Mediana' => 150,
                        'Grande' => 220,
                    ],
                ],
                [
                    'categoria' => 'Tortas',
                    'nombre' => 'Torta de Vainilla',
                    'descripcion' => 'Bizcocho de vainilla con relleno suave.',
                    'personalizable' => true,
                    'presentaciones' => [
                        'Pequeña' => 90,
                        'Mediana' => 145,
                        'Grande' => 210,
                    ],
                ],
                [
                    'categoria' => 'Tortas',
                    'nombre' => 'Torta Selva Negra',
                    'descripcion' => 'Chocolate, crema y cerezas.',
                    'personalizable' => true,
                    'presentaciones' => [
                        'Pequeña' => 110,
                        'Mediana' => 175,
                        'Grande' => 250,
                    ],
                ],
                [
                    'categoria' => 'Tortas',
                    'nombre' => 'Torta Red Velvet',
                    'descripcion' => 'Red velvet con cobertura cremosa.',
                    'personalizable' => true,
                    'presentaciones' => [
                        'Pequeña' => 115,
                        'Mediana' => 185,
                        'Grande' => 265,
                    ],
                ],
                [
                    'categoria' => 'Tortas',
                    'nombre' => 'Torta Tres Leches',
                    'descripcion' => 'Bizcocho húmedo de tres leches.',
                    'personalizable' => true,
                    'presentaciones' => [
                        'Pequeña' => 105,
                        'Mediana' => 165,
                        'Grande' => 235,
                    ],
                ],
                [
                    'categoria' => 'Tortas',
                    'nombre' => 'Torta de Zanahoria',
                    'descripcion' => 'Torta de zanahoria con especias y cobertura cremosa.',
                    'personalizable' => true,
                    'presentaciones' => [
                        'Pequeña' => 100,
                        'Mediana' => 160,
                        'Grande' => 230,
                    ],
                ],
                [
                    'categoria' => 'Postres',
                    'nombre' => 'Cheesecake de Frutos Rojos',
                    'descripcion' => 'Cheesecake con salsa de frutos rojos.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Porción' => 25,
                        'Entero' => 180,
                    ],
                ],
                [
                    'categoria' => 'Postres',
                    'nombre' => 'Pie de Limón',
                    'descripcion' => 'Pie de limón con merengue.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Porción' => 18,
                        'Entero' => 120,
                    ],
                ],
                [
                    'categoria' => 'Postres',
                    'nombre' => 'Brownie Clásico',
                    'descripcion' => 'Brownie artesanal de chocolate.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 15,
                        'Caja x6' => 80,
                    ],
                ],
                [
                    'categoria' => 'Postres',
                    'nombre' => 'Alfajor de Chocolate',
                    'descripcion' => 'Alfajor relleno de dulce de leche con cobertura de chocolate.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 12,
                        'Caja x6' => 65,
                    ],
                ],
                [
                    'categoria' => 'Cupcakes',
                    'nombre' => 'Cupcake de Chocolate',
                    'descripcion' => 'Cupcake de chocolate con frosting.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 14,
                        'Caja x6' => 78,
                        'Caja x12' => 145,
                    ],
                ],
                [
                    'categoria' => 'Cupcakes',
                    'nombre' => 'Cupcake de Vainilla',
                    'descripcion' => 'Cupcake de vainilla con frosting.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 13,
                        'Caja x6' => 72,
                        'Caja x12' => 135,
                    ],
                ],
                [
                    'categoria' => 'Cupcakes',
                    'nombre' => 'Cupcake Red Velvet',
                    'descripcion' => 'Cupcake red velvet con cobertura cremosa.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 15,
                        'Caja x6' => 84,
                        'Caja x12' => 158,
                    ],
                ],
                [
                    'categoria' => 'Galletas',
                    'nombre' => 'Galleta con Chispas de Chocolate',
                    'descripcion' => 'Galleta artesanal con chispas de chocolate.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 8,
                        'Caja x6' => 42,
                        'Caja x12' => 78,
                    ],
                ],
                [
                    'categoria' => 'Galletas',
                    'nombre' => 'Galleta de Avena',
                    'descripcion' => 'Galleta de avena horneada.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 8,
                        'Caja x6' => 42,
                        'Caja x12' => 78,
                    ],
                ],
                [
                    'categoria' => 'Panadería',
                    'nombre' => 'Roll de Canela',
                    'descripcion' => 'Roll de canela con glaseado.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 14,
                        'Caja x6' => 75,
                        'Caja x12' => 140,
                    ],
                ],
                [
                    'categoria' => 'Panadería',
                    'nombre' => 'Croissant de Chocolate',
                    'descripcion' => 'Croissant relleno de chocolate.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 16,
                        'Caja x6' => 88,
                    ],
                ],
                [
                    'categoria' => 'Panadería',
                    'nombre' => 'Empanada de Manjar',
                    'descripcion' => 'Empanada dulce rellena de manjar.',
                    'personalizable' => false,
                    'presentaciones' => [
                        'Unidad' => 10,
                        'Caja x6' => 55,
                    ],
                ],
            ];

            foreach ($productos as $config) {
                $categoriaId = DB::table('categorias')
                    ->where('nombre', $config['categoria'])
                    ->value('id_categoria');

                DB::table('productos')->updateOrInsert(
                    [
                        'id_categoria' => $categoriaId,
                        'nombre' => $config['nombre'],
                    ],
                    [
                        'descripcion' => $config['descripcion'],
                        'estado' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );

                $productoId = DB::table('productos')
                    ->where('id_categoria', $categoriaId)
                    ->where('nombre', $config['nombre'])
                    ->value('id_producto');

                foreach ($config['presentaciones'] as $nombre => $precio) {
                    DB::table('presentaciones')->updateOrInsert(
                        [
                            'id_producto' => $productoId,
                            'nombre' => $nombre,
                        ],
                        [
                            'precio' => $precio,
                            'moneda' => 'BOB',
                            'disponible' => true,
                            'permite_personalizacion' => $config['personalizable'],
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }
            }

            $materiasPrimas = [
                ['Harina', 'g', 0.0120],
                ['Azúcar', 'g', 0.0140],
                ['Huevos', 'unidad', 1.2000],
                ['Leche', 'ml', 0.0090],
                ['Mantequilla', 'g', 0.0350],
                ['Chocolate', 'g', 0.0600],
                ['Cacao', 'g', 0.0550],
                ['Crema de leche', 'ml', 0.0250],
                ['Queso crema', 'g', 0.0550],
                ['Frutos rojos', 'g', 0.0800],
                ['Limón', 'unidad', 1.5000],
                ['Canela', 'g', 0.0800],
                ['Avena', 'g', 0.0200],
                ['Dulce de leche', 'g', 0.0450],
                ['Esencia de vainilla', 'ml', 0.0900],
            ];

            foreach ($materiasPrimas as [$nombre, $unidad, $costo]) {
                DB::table('materias_primas')->updateOrInsert(
                    ['nombre' => $nombre],
                    [
                        'unidad_medida' => $unidad,
                        'costo_unitario' => $costo,
                        'descripcion' => self::MARCA . ' | Materia prima demo.',
                        'estado' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            $bases = [
                'Tortas' => [
                    'Harina' => 500,
                    'Azúcar' => 350,
                    'Huevos' => 6,
                    'Leche' => 250,
                    'Mantequilla' => 200,
                ],
                'Postres' => [
                    'Harina' => 250,
                    'Azúcar' => 200,
                    'Huevos' => 4,
                    'Mantequilla' => 120,
                    'Crema de leche' => 150,
                ],
                'Cupcakes' => [
                    'Harina' => 300,
                    'Azúcar' => 220,
                    'Huevos' => 4,
                    'Leche' => 200,
                    'Mantequilla' => 180,
                ],
                'Galletas' => [
                    'Harina' => 350,
                    'Azúcar' => 180,
                    'Huevos' => 2,
                    'Mantequilla' => 200,
                ],
                'Panadería' => [
                    'Harina' => 500,
                    'Azúcar' => 120,
                    'Leche' => 250,
                    'Mantequilla' => 150,
                ],
            ];

            $multiplicadores = [
                'Pequeña' => 0.70,
                'Mediana' => 1.00,
                'Grande' => 1.40,
                'Unidad' => 0.10,
                'Porción' => 0.15,
                'Entero' => 1.00,
                'Caja x6' => 0.60,
                'Caja x12' => 1.10,
            ];

            $presentaciones = DB::table('presentaciones as p')
                ->join('productos as pr', 'p.id_producto', '=', 'pr.id_producto')
                ->join('categorias as c', 'pr.id_categoria', '=', 'c.id_categoria')
                ->select(
                    'p.presentacion_id',
                    'p.nombre as presentacion',
                    'pr.nombre as producto',
                    'c.nombre as categoria'
                )
                ->get();

            foreach ($presentaciones as $presentacion) {
                DB::table('recetas')->updateOrInsert(
                    ['presentacion_id' => $presentacion->presentacion_id],
                    [
                        'observaciones' =>
                            self::MARCA .
                            ' | Receta demo de ' .
                            $presentacion->producto .
                            ' - ' .
                            $presentacion->presentacion,
                        'estado' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );

                $recetaId = DB::table('recetas')
                    ->where('presentacion_id', $presentacion->presentacion_id)
                    ->value('id_receta');

                $base = $bases[$presentacion->categoria] ?? $bases['Tortas'];
                $factor = $multiplicadores[$presentacion->presentacion] ?? 1;

                foreach ($base as $materiaNombre => $cantidadBase) {
                    $materiaId = DB::table('materias_primas')
                        ->where('nombre', $materiaNombre)
                        ->value('id_materia_prima');

                    DB::table('detalle_recetas')->updateOrInsert(
                        [
                            'id_receta' => $recetaId,
                            'id_materia_prima' => $materiaId,
                        ],
                        [
                            'cantidad' => round($cantidadBase * $factor, 3),
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }
            }
        });

        $this->command?->info(
            'CatalogDemoSeeder cargado correctamente.'
        );
    }
}