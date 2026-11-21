<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventoryDemoSeeder extends Seeder
{
    private const MARCA = 'DEMO_DULCE_BOCADO_2026';

    private int $actorUsuarioId;

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'InventoryDemoSeeder no puede ejecutarse en producción.'
            );
        }

        $this->actorUsuarioId =
            (int) env('DEMO_ACTOR_USUARIO_ID', 7);

        if ($this->actorUsuarioId <= 0) {
            throw new RuntimeException(
                'DEMO_ACTOR_USUARIO_ID debe ser mayor a cero.'
            );
        }

        DB::transaction(function (): void {
            $almacenes = $this->prepararAlmacenes();

            $this->crearStockMateriasPrimas(
                $almacenes['MATERIAS_PRIMAS']
            );

            $this->crearStockPresentaciones(
                $almacenes['PRODUCCION'],
                $almacenes['MOSTRADOR']
            );

            $this->crearMovimientosHistoricos(
                $almacenes
            );
        });

        $this->command?->info(
            'InventoryDemoSeeder cargado correctamente.'
        );
    }

    private function prepararAlmacenes(): array
    {
        $config = [
            'MATERIAS_PRIMAS' => 'Materias primas',
            'PRODUCCION' => 'Producción',
            'MOSTRADOR' => 'Mostrador',
        ];

        $resultado = [];

        foreach ($config as $tipo => $nombre) {
            DB::table('almacen')->updateOrInsert(
                ['tipo' => $tipo],
                [
                    'nombre' => $nombre,
                    'activo' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            $resultado[$tipo] =
                (int) DB::table('almacen')
                    ->where('tipo', $tipo)
                    ->value('id_almacen');
        }

        return $resultado;
    }

    private function crearStockMateriasPrimas(
        int $almacenId
    ): void {
        /*
         * IDs confirmados actualmente en catalog-service.
         * Se excluye ID 1 porque pertenece a una prueba previa.
         */
        $materias = [
            2  => ['g',      45000],
            3  => ['g',      32000],
            4  => ['unidad',   420],
            5  => ['ml',     30000],
            6  => ['g',      18000],
            7  => ['g',      12000],
            8  => ['g',       8500],
            9  => ['ml',     14000],
            10 => ['g',       9000],
            11 => ['g',       6500],
            12 => ['unidad',   180],
            13 => ['g',       1500],
            14 => ['g',       7500],
            15 => ['g',      10000],
            16 => ['ml',      2200],
        ];

        foreach (
            $materias as
            $materiaId => [$unidad, $cantidad]
        ) {
            DB::table('existencia')->updateOrInsert(
                [
                    'almacen_id' => $almacenId,
                    'tipo_articulo' => 'MATERIA_PRIMA',
                    'articulo_id' => $materiaId,
                ],
                [
                    'cantidad' => $cantidad,
                    'unidad' => $unidad,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    private function crearStockPresentaciones(
        int $produccionId,
        int $mostradorId
    ): void {
        /*
         * Presentaciones demo confirmadas:
         * IDs 2 a 49.
         *
         * Variamos el stock deliberadamente para que existan
         * productos abundantes, medios y críticos.
         */
        for ($id = 2; $id <= 49; $id++) {
            $stockProduccion =
                10 + (($id * 7) % 24);

            $stockMostrador =
                6 + (($id * 5) % 18);

            /*
             * Algunos productos quedan con stock crítico
             * para mostrar alertas en la operación.
             */
            if ($id % 11 === 0) {
                $stockMostrador = 2;
            } elseif ($id % 13 === 0) {
                $stockMostrador = 4;
            }

            DB::table('existencia')->updateOrInsert(
                [
                    'almacen_id' => $produccionId,
                    'tipo_articulo' => 'PRESENTACION',
                    'articulo_id' => $id,
                ],
                [
                    'cantidad' => $stockProduccion,
                    'unidad' => 'unidad',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            DB::table('existencia')->updateOrInsert(
                [
                    'almacen_id' => $mostradorId,
                    'tipo_articulo' => 'PRESENTACION',
                    'articulo_id' => $id,
                ],
                [
                    'cantidad' => $stockMostrador,
                    'unidad' => 'unidad',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    private function crearMovimientosHistoricos(
        array $almacenes
    ): void {
        /*
         * Ingresos históricos de materias primas.
         */
        $materias = [
            2  => ['g', 50000],
            3  => ['g', 35000],
            4  => ['unidad', 500],
            5  => ['ml', 35000],
            6  => ['g', 22000],
            7  => ['g', 15000],
            8  => ['g', 10000],
            9  => ['ml', 18000],
            10 => ['g', 12000],
            11 => ['g', 8000],
            12 => ['unidad', 220],
            13 => ['g', 2000],
            14 => ['g', 9000],
            15 => ['g', 13000],
            16 => ['ml', 3000],
        ];

        foreach (
            $materias as
            $materiaId => [$unidad, $cantidad]
        ) {
            $this->movimientoDemo(
                referencia:
                    'MP-ING-' .
                    str_pad(
                        (string) $materiaId,
                        3,
                        '0',
                        STR_PAD_LEFT
                    ),
                datos: [
                    'tipo' => 'INGRESO',
                    'tipo_articulo' =>
                        'MATERIA_PRIMA',
                    'articulo_id' =>
                        $materiaId,
                    'cantidad' =>
                        $cantidad,
                    'unidad' =>
                        $unidad,
                    'almacen_origen_id' =>
                        null,
                    'almacen_destino_id' =>
                        $almacenes[
                            'MATERIAS_PRIMAS'
                        ],
                    'motivo' =>
                        'Compra de materia prima demo',
                    'observaciones' =>
                        self::MARCA .
                        ' | Ingreso histórico.',
                ]
            );
        }

        /*
         * Producción histórica: ingreso de productos terminados.
         */
        for ($id = 2; $id <= 49; $id++) {
            $this->movimientoDemo(
                referencia:
                    'PROD-ING-' .
                    str_pad(
                        (string) $id,
                        3,
                        '0',
                        STR_PAD_LEFT
                    ),
                datos: [
                    'tipo' =>
                        'PRODUCCION_INGRESO',
                    'tipo_articulo' =>
                        'PRESENTACION',
                    'articulo_id' =>
                        $id,
                    'cantidad' =>
                        20 + (($id * 3) % 25),
                    'unidad' =>
                        'unidad',
                    'almacen_origen_id' =>
                        null,
                    'almacen_destino_id' =>
                        $almacenes['PRODUCCION'],
                    'motivo' =>
                        'Producción terminada demo',
                    'observaciones' =>
                        self::MARCA .
                        ' | Producción histórica.',
                ]
            );
        }

        /*
         * Traslados hacia Mostrador.
         */
        for ($id = 2; $id <= 49; $id++) {
            $this->movimientoDemo(
                referencia:
                    'TRAS-' .
                    str_pad(
                        (string) $id,
                        3,
                        '0',
                        STR_PAD_LEFT
                    ),
                datos: [
                    'tipo' =>
                        'TRASLADO',
                    'tipo_articulo' =>
                        'PRESENTACION',
                    'articulo_id' =>
                        $id,
                    'cantidad' =>
                        8 + (($id * 2) % 12),
                    'unidad' =>
                        'unidad',
                    'almacen_origen_id' =>
                        $almacenes['PRODUCCION'],
                    'almacen_destino_id' =>
                        $almacenes['MOSTRADOR'],
                    'motivo' =>
                        'Reposición de mostrador demo',
                    'observaciones' =>
                        self::MARCA .
                        ' | Traslado histórico.',
                ]
            );
        }

        /*
         * Egresos representativos de ventas.
         */
        for ($id = 2; $id <= 49; $id += 2) {
            $this->movimientoDemo(
                referencia:
                    'VENTA-EGR-' .
                    str_pad(
                        (string) $id,
                        3,
                        '0',
                        STR_PAD_LEFT
                    ),
                datos: [
                    'tipo' =>
                        'EGRESO',
                    'tipo_articulo' =>
                        'PRESENTACION',
                    'articulo_id' =>
                        $id,
                    'cantidad' =>
                        1 + ($id % 4),
                    'unidad' =>
                        'unidad',
                    'almacen_origen_id' =>
                        $almacenes['MOSTRADOR'],
                    'almacen_destino_id' =>
                        null,
                    'motivo' =>
                        'Venta histórica demo',
                    'observaciones' =>
                        self::MARCA .
                        ' | Egreso representativo.',
                ]
            );
        }
    }

    private function movimientoDemo(
        string $referencia,
        array $datos
    ): void {
        $referenciaCompleta =
            self::MARCA . '-' . $referencia;

        $existe = DB::table('movimiento')
            ->where(
                'referencia_tipo',
                'DEMO_SEED'
            )
            ->where(
                'referencia_id',
                $referenciaCompleta
            )
            ->exists();

        if ($existe) {
            return;
        }

        DB::table('movimiento')->insert(
            array_merge(
                $datos,
                [
                    'referencia_tipo' =>
                        'DEMO_SEED',

                    'referencia_id' =>
                        $referenciaCompleta,

                    'actor_usuario_id' =>
                        $this->actorUsuarioId,

                    'created_at' =>
                        now()->subDays(
                            random_int(1, 90)
                        ),

                    'updated_at' =>
                        now(),
                ]
            )
        );
    }
}