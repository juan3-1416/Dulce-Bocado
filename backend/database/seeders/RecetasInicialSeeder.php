<?php

namespace Database\Seeders;

use App\Models\DetalleReceta;
use App\Models\MateriaPrima;
use App\Models\Permiso;
use App\Models\ProductoPresentacion;
use App\Models\Receta;
use App\Models\Rol;
use App\Models\RolPermiso;
use App\Models\UsuarioRolPermiso;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RecetasInicialSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $this->crearPermiso();
            $this->corregirMateriaPrimaExistente();

            $materiasPrimas =
                $this->crearMateriasPrimas();

            $this->crearRecetas(
                $materiasPrimas
            );
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Permiso CU9
    |--------------------------------------------------------------------------
    */
    private function crearPermiso(): void
    {
        $permiso = Permiso::updateOrCreate(
            [
                'nombre' =>
                    'recetas.gestionar_receta',
            ],
            [
                'descripcion' =>
                    'Permite gestionar materias primas y recetas.',
                'activo' => true,
            ]
        );

        $roles = Rol::query()
            ->whereIn(
                'nombre',
                [
                    'Administrador',
                    'Producción',
                ]
            )
            ->where(
                'activo',
                true
            )
            ->get();

        foreach ($roles as $rol) {
            $rolPermiso =
                RolPermiso::firstOrCreate([
                    'rol_id' =>
                        $rol->id_rol,

                    'permiso_id' =>
                        $permiso->id_permiso,
                ]);

            $usuariosIds =
                UsuarioRolPermiso::query()
                    ->whereHas(
                        'rolPermiso',
                        function (
                            $query
                        ) use ($rol) {
                            $query->where(
                                'rol_id',
                                $rol->id_rol
                            );
                        }
                    )
                    ->pluck(
                        'usuario_id'
                    )
                    ->unique();

            foreach (
                $usuariosIds as
                $usuarioId
            ) {
                UsuarioRolPermiso::firstOrCreate(
                    [
                        'usuario_id' =>
                            $usuarioId,

                        'rol_permiso_id' =>
                            $rolPermiso
                                ->id_rol_permiso,
                    ]
                );
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Corregir dato antiguo
    |--------------------------------------------------------------------------
    */
    private function corregirMateriaPrimaExistente(): void
    {
        $incorrecta =
            MateriaPrima::query()
                ->where(
                    'nombre',
                    'Crema de lechea'
                )
                ->first();

        $correcta =
            MateriaPrima::query()
                ->where(
                    'nombre',
                    'Crema de leche'
                )
                ->first();

        /*
         * Solo renombramos cuando todavía no
         * existe el nombre correcto.
         *
         * Así evitamos una colisión con la
         * restricción UNIQUE de nombre.
         */
        if (
            $incorrecta &&
            !$correcta
        ) {
            $incorrecta->update([
                'nombre' =>
                    'Crema de leche',

                'descripcion' =>
                    'Crema de leche utilizada en rellenos, coberturas y postres.',

                'unidad_medida' =>
                    'ml',

                'estado' =>
                    true,
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Materias primas
    |--------------------------------------------------------------------------
    */
    private function crearMateriasPrimas(): array
    {
        /*
         * costo_unitario se expresa en Bs por
         * unidad base:
         *
         * g       -> Bs por gramo
         * ml      -> Bs por mililitro
         * unidad  -> Bs por unidad
         *
         * Son valores académicos para permitir
         * cálculo de costos de producción.
         */
        $datos = [
            [
                'nombre' => 'Harina',
                'unidad' => 'g',
                'costo' => 0.0080,
                'descripcion' =>
                    'Harina de trigo utilizada en productos de pastelería y repostería.',
            ],

            [
                'nombre' => 'Azúcar',
                'unidad' => 'g',
                'costo' => 0.0090,
                'descripcion' =>
                    'Azúcar utilizada en preparaciones dulces.',
            ],

            [
                'nombre' => 'Huevos',
                'unidad' => 'unidad',
                'costo' => 1.2000,
                'descripcion' =>
                    'Huevos utilizados en preparación de masas y rellenos.',
            ],

            [
                'nombre' => 'Leche',
                'unidad' => 'ml',
                'costo' => 0.0080,
                'descripcion' =>
                    'Leche utilizada en masas, cremas y rellenos.',
            ],

            [
                'nombre' => 'Chocolate',
                'unidad' => 'g',
                'costo' => 0.0600,
                'descripcion' =>
                    'Chocolate utilizado en masas, rellenos y coberturas.',
            ],

            [
                'nombre' => 'Crema de leche',
                'unidad' => 'ml',
                'costo' => 0.0250,
                'descripcion' =>
                    'Crema de leche utilizada en rellenos, coberturas y postres.',
            ],

            [
                'nombre' => 'Mantequilla',
                'unidad' => 'g',
                'costo' => 0.0450,
                'descripcion' =>
                    'Mantequilla utilizada en masas, galletas y cremas.',
            ],

            [
                'nombre' => 'Vainilla',
                'unidad' => 'ml',
                'costo' => 0.2000,
                'descripcion' =>
                    'Esencia de vainilla utilizada para aromatizar preparaciones.',
            ],

            [
                'nombre' => 'Cacao en polvo',
                'unidad' => 'g',
                'costo' => 0.0400,
                'descripcion' =>
                    'Cacao en polvo utilizado en productos de chocolate.',
            ],

            [
                'nombre' => 'Dulce de leche',
                'unidad' => 'g',
                'costo' => 0.0350,
                'descripcion' =>
                    'Dulce de leche utilizado como relleno.',
            ],

            [
                'nombre' => 'Queso crema',
                'unidad' => 'g',
                'costo' => 0.0500,
                'descripcion' =>
                    'Queso crema utilizado en cheesecakes y coberturas.',
            ],

            [
                'nombre' => 'Frutos rojos',
                'unidad' => 'g',
                'costo' => 0.0700,
                'descripcion' =>
                    'Frutos rojos utilizados en rellenos y decoraciones.',
            ],

            [
                'nombre' => 'Jugo de limón',
                'unidad' => 'ml',
                'costo' => 0.0200,
                'descripcion' =>
                    'Jugo de limón utilizado en rellenos y cremas.',
            ],

            [
                'nombre' => 'Avena',
                'unidad' => 'g',
                'costo' => 0.0180,
                'descripcion' =>
                    'Avena utilizada en galletas y productos horneados.',
            ],

            [
                'nombre' => 'Canela',
                'unidad' => 'g',
                'costo' => 0.0800,
                'descripcion' =>
                    'Canela utilizada en masas y rellenos.',
            ],

            [
                'nombre' => 'Zanahoria',
                'unidad' => 'g',
                'costo' => 0.0100,
                'descripcion' =>
                    'Zanahoria utilizada en tortas y repostería.',
            ],

            [
                'nombre' => 'Aceite',
                'unidad' => 'ml',
                'costo' => 0.0180,
                'descripcion' =>
                    'Aceite vegetal utilizado en preparaciones de repostería.',
            ],

            [
                'nombre' => 'Polvo de hornear',
                'unidad' => 'g',
                'costo' => 0.0300,
                'descripcion' =>
                    'Agente leudante utilizado en masas.',
            ],

            [
                'nombre' => 'Azúcar impalpable',
                'unidad' => 'g',
                'costo' => 0.0150,
                'descripcion' =>
                    'Azúcar impalpable utilizada en glaseados y decoraciones.',
            ],

            [
                'nombre' => 'Leche condensada',
                'unidad' => 'ml',
                'costo' => 0.0250,
                'descripcion' =>
                    'Leche condensada utilizada en postres y rellenos.',
            ],

            [
                'nombre' => 'Leche evaporada',
                'unidad' => 'ml',
                'costo' => 0.0200,
                'descripcion' =>
                    'Leche evaporada utilizada en postres.',
            ],

            [
                'nombre' => 'Cerezas',
                'unidad' => 'g',
                'costo' => 0.0800,
                'descripcion' =>
                    'Cerezas utilizadas en rellenos y decoración.',
            ],

            [
                'nombre' => 'Colorante rojo',
                'unidad' => 'ml',
                'costo' => 0.3000,
                'descripcion' =>
                    'Colorante utilizado en preparaciones Red Velvet.',
            ],

            [
                'nombre' => 'Chispas de chocolate',
                'unidad' => 'g',
                'costo' => 0.0550,
                'descripcion' =>
                    'Chispas de chocolate utilizadas en galletas y decoración.',
            ],

            [
                'nombre' => 'Levadura',
                'unidad' => 'g',
                'costo' => 0.0400,
                'descripcion' =>
                    'Levadura utilizada en masas fermentadas.',
            ],
        ];

        $resultado = [];

        foreach ($datos as $materia) {
            $modelo =
                MateriaPrima::updateOrCreate(
                    [
                        'nombre' =>
                            $materia['nombre'],
                    ],
                    [
                        'unidad_medida' =>
                            $materia['unidad'],

                        'costo_unitario' =>
                            $materia['costo'],

                        'descripcion' =>
                            $materia[
                                'descripcion'
                            ],

                        'estado' =>
                            true,
                    ]
                );

            $resultado[
                $materia['nombre']
            ] = $modelo;
        }

        return $resultado;
    }

    /*
    |--------------------------------------------------------------------------
    | Crear recetas
    |--------------------------------------------------------------------------
    */
    private function crearRecetas(
        array $materiasPrimas
    ): void {
        $presentaciones =
            ProductoPresentacion::query()
                ->with([
                    'producto',
                    'presentacion',
                ])
                ->get();

        foreach (
            $presentaciones as
            $productoPresentacion
        ) {
            $producto =
                $productoPresentacion
                    ->producto;

            $presentacion =
                $productoPresentacion
                    ->presentacion;

            if (
                !$producto ||
                !$presentacion
            ) {
                continue;
            }

            /*
             * Los productos creados únicamente
             * para pruebas no forman parte del
             * catálogo académico definitivo.
             */

if (
    mb_strtolower(trim($producto->nombre)) ===
    'producto prueba'
) {
    continue;
}
            $recetaBase =
                $this->obtenerRecetaBase(
                    $producto->nombre
                );

            /*
             * Si aparece posteriormente un nuevo
             * producto sin receta definida,
             * no inventamos ingredientes.
             *
             * Producción seguirá bloqueándolo
             * hasta que se registre su receta.
             */
if (!$recetaBase) {
    throw new \RuntimeException(
        'No existe una receta base definida para el producto: ' .
        $producto->nombre
    );
}

            $factor =
                $this->obtenerFactorPresentacion(
                    $producto->nombre,
                    $presentacion->nombre
                );

if ($factor === null) {
    throw new \RuntimeException(
        'No existe un factor de receta definido para: ' .
        $producto->nombre .
        ' / ' .
        $presentacion->nombre
    );
}
            $receta =
                Receta::updateOrCreate(
                    [
                        'id_producto_presentacion' =>
                            $productoPresentacion
                                ->id_producto_presentacion,
                    ],
                    [
                        'observaciones' =>
                            'Receta inicial de ' .
                            $producto->nombre .
                            ' - ' .
                            $presentacion->nombre .
                            '.',

                        'estado' =>
                            true,
                    ]
                );

            $materiasUsadas = [];

            foreach (
                $recetaBase as
                $nombreMateria =>
                $cantidadBase
            ) {
                if (
                    !isset(
                        $materiasPrimas[
                            $nombreMateria
                        ]
                    )
                ) {
                    continue;
                }

                $materia =
                    $materiasPrimas[
                        $nombreMateria
                    ];

                $cantidad = round(
                    $cantidadBase *
                    $factor,
                    3
                );

                DetalleReceta::updateOrCreate(
                    [
                        'id_receta' =>
                            $receta
                                ->id_receta,

                        'id_materia_prima' =>
                            $materia
                                ->id_materia_prima,
                    ],
                    [
                        'cantidad' =>
                            $cantidad,
                    ]
                );

                $materiasUsadas[] =
                    $materia
                        ->id_materia_prima;
            }

            /*
             * Si el seeder cambia una receta,
             * eliminamos ingredientes antiguos
             * que ya no correspondan.
             */
            DetalleReceta::query()
                ->where(
                    'id_receta',
                    $receta->id_receta
                )
                ->whereNotIn(
                    'id_materia_prima',
                    $materiasUsadas
                )
                ->delete();
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Factor según presentación
    |--------------------------------------------------------------------------
    */
    private function obtenerFactorPresentacion(
        string $producto,
        string $presentacion
    ): ?float {
        $nombreProducto =
            Str::lower(
                Str::ascii(
                    trim($producto)
                )
            );

        $nombrePresentacion =
            Str::lower(
                Str::ascii(
                    trim($presentacion)
                )
            );

        /*
         * Tortas.
         */
        if (
            Str::startsWith(
                $nombreProducto,
                'torta'
            )
        ) {
            return match (
                $nombrePresentacion
            ) {
                'pequena' => 1.00,
                'mediana' => 1.50,
                'grande' => 2.20,
                'porcion 15' => 1.50,
                default => null,
            };
        }

        /*
         * Cheesecake y Pie:
         * una unidad de receta = una porción.
         */
        if (
            Str::contains(
                $nombreProducto,
                [
                    'cheesecake',
                    'pie de limon',
                ]
            )
        ) {
            return match (
                $nombrePresentacion
            ) {
                'porcion' => 1.00,
                'entero' => 8.00,
                default => null,
            };
        }
if (
    in_array(
        $nombrePresentacion,
        [
            'pequena',
            'mediana',
            'grande',
            'porcion 15',
        ],
        true
    )
) {
    return match (
        $nombrePresentacion
    ) {
        'pequena' => 1.00,
        'mediana' => 1.50,
        'grande' => 2.20,
        'porcion 15' => 1.50,
    };
}
        /*
         * Productos vendidos por unidad.
         */
        return match (
            $nombrePresentacion
        ) {
            'unidad' => 1.00,
            'caja x6' => 6.00,
            'caja x12' => 12.00,
            default => null,
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Receta base por producto
    |--------------------------------------------------------------------------
    |
    | Cantidades expresadas en la unidad base
    | definida para cada materia prima.
    |
    | En productos individuales corresponde
    | a una unidad.
    |
    | En tortas corresponde al tamaño Pequeño.
    |
    | En Cheesecake y Pie corresponde
    | a una porción.
    |--------------------------------------------------------------------------
    */
    private function obtenerRecetaBase(
        string $nombreProducto
    ): ?array {
        $nombre =
            Str::lower(
                Str::ascii(
                    trim(
                        $nombreProducto
                    )
                )
            );

        return match ($nombre) {
            'torta negra' => [
                'Harina' => 280,
                'Azúcar' => 220,
                'Huevos' => 4,
                'Leche' => 180,
                'Chocolate' => 120,
                'Crema de leche' => 100,
                'Mantequilla' => 120,
                'Vainilla' => 5,
                'Polvo de hornear' => 10,
            ],

            'torta de chocolate' => [
                'Harina' => 250,
                'Azúcar' => 200,
                'Huevos' => 4,
                'Leche' => 200,
                'Chocolate' => 150,
                'Cacao en polvo' => 40,
                'Mantequilla' => 120,
                'Polvo de hornear' => 10,
            ],

            'torta de vainilla' => [
                'Harina' => 280,
                'Azúcar' => 200,
                'Huevos' => 4,
                'Leche' => 220,
                'Mantequilla' => 120,
                'Vainilla' => 10,
                'Polvo de hornear' => 10,
            ],

            'torta selva negra' => [
                'Harina' => 250,
                'Azúcar' => 200,
                'Huevos' => 4,
                'Leche' => 180,
                'Chocolate' => 120,
                'Cacao en polvo' => 35,
                'Crema de leche' => 250,
                'Cerezas' => 150,
                'Polvo de hornear' => 10,
            ],

            'torta red velvet' => [
                'Harina' => 270,
                'Azúcar' => 210,
                'Huevos' => 4,
                'Leche' => 200,
                'Mantequilla' => 110,
                'Cacao en polvo' => 20,
                'Queso crema' => 180,
                'Colorante rojo' => 5,
                'Polvo de hornear' => 10,
            ],
'torta prueba' => [
    'Harina' => 250,
    'Azúcar' => 180,
    'Huevos' => 4,
    'Leche' => 180,
    'Mantequilla' => 100,
    'Vainilla' => 5,
    'Polvo de hornear' => 8,
],

'prueba' => [
    'Harina' => 250,
    'Azúcar' => 180,
    'Huevos' => 4,
    'Leche' => 180,
    'Mantequilla' => 100,
    'Vainilla' => 5,
    'Polvo de hornear' => 8,
],
            'torta tres leches' => [
                'Harina' => 250,
                'Azúcar' => 180,
                'Huevos' => 5,
                'Leche' => 150,
                'Leche condensada' => 250,
                'Leche evaporada' => 250,
                'Crema de leche' => 200,
                'Vainilla' => 8,
                'Polvo de hornear' => 8,
            ],

            'torta de zanahoria' => [
                'Harina' => 250,
                'Azúcar' => 180,
                'Huevos' => 4,
                'Aceite' => 150,
                'Zanahoria' => 250,
                'Canela' => 5,
                'Queso crema' => 180,
                'Polvo de hornear' => 10,
            ],

            'cheesecake de frutos rojos' => [
                'Queso crema' => 80,
                'Azúcar' => 25,
                'Huevos' => 0.5,
                'Crema de leche' => 30,
                'Mantequilla' => 15,
                'Frutos rojos' => 40,
            ],

            'pie de limon' => [
                'Harina' => 40,
                'Mantequilla' => 20,
                'Azúcar' => 20,
                'Huevos' => 0.5,
                'Leche condensada' => 50,
                'Jugo de limón' => 30,
            ],

            'brownie clasico' => [
                'Harina' => 35,
                'Azúcar' => 30,
                'Huevos' => 0.5,
                'Chocolate' => 30,
                'Mantequilla' => 25,
                'Cacao en polvo' => 8,
            ],

            'alfajor de chocolate' => [
                'Harina' => 30,
                'Azúcar' => 10,
                'Huevos' => 0.15,
                'Mantequilla' => 15,
                'Dulce de leche' => 25,
                'Chocolate' => 20,
            ],

            'cupcake de chocolate' => [
                'Harina' => 45,
                'Azúcar' => 35,
                'Huevos' => 0.5,
                'Leche' => 30,
                'Mantequilla' => 25,
                'Cacao en polvo' => 10,
                'Chocolate' => 15,
                'Polvo de hornear' => 2,
            ],

            'cupcake de vainilla' => [
                'Harina' => 45,
                'Azúcar' => 35,
                'Huevos' => 0.5,
                'Leche' => 30,
                'Mantequilla' => 25,
                'Vainilla' => 3,
                'Polvo de hornear' => 2,
            ],

            'cupcake red velvet' => [
                'Harina' => 45,
                'Azúcar' => 35,
                'Huevos' => 0.5,
                'Leche' => 30,
                'Mantequilla' => 25,
                'Cacao en polvo' => 5,
                'Queso crema' => 20,
                'Colorante rojo' => 1,
                'Polvo de hornear' => 2,
            ],

            'galleta con chispas de chocolate' => [
                'Harina' => 35,
                'Azúcar' => 20,
                'Huevos' => 0.2,
                'Mantequilla' => 20,
                'Chispas de chocolate' => 20,
                'Vainilla' => 1,
                'Polvo de hornear' => 1,
            ],

            'galleta de avena' => [
                'Harina' => 20,
                'Avena' => 25,
                'Azúcar' => 15,
                'Huevos' => 0.15,
                'Mantequilla' => 15,
                'Canela' => 1,
                'Polvo de hornear' => 1,
            ],

            'roll de canela' => [
                'Harina' => 70,
                'Azúcar' => 20,
                'Huevos' => 0.3,
                'Leche' => 35,
                'Mantequilla' => 20,
                'Canela' => 4,
                'Levadura' => 2,
                'Azúcar impalpable' => 15,
            ],

            'croissant de chocolate' => [
                'Harina' => 80,
                'Azúcar' => 10,
                'Leche' => 30,
                'Mantequilla' => 35,
                'Chocolate' => 20,
                'Levadura' => 2,
            ],

            'empanada de manjar' => [
                'Harina' => 60,
                'Azúcar' => 10,
                'Huevos' => 0.2,
                'Mantequilla' => 20,
                'Dulce de leche' => 35,
            ],

            default => null,
        };
    }
}