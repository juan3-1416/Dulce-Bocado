<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * La tabla actualmente utiliza:
         *
         * PRIMARY KEY (id_producto, id_presentacion)
         *
         * Se reemplaza por una PK propia para facilitar
         * relaciones desde Receta, Producción, Inventario,
         * Venta y Pedido.
         */

        DB::statement(
            'ALTER TABLE producto_presentacion
             DROP CONSTRAINT producto_presentacion_pkey'
        );

        Schema::table('producto_presentacion', function (Blueprint $table) {
            $table->bigIncrements(
                'id_producto_presentacion'
            );

            $table->unique(
                [
                    'id_producto',
                    'id_presentacion',
                ],
                'uq_producto_presentacion'
            );
        });
    }

    public function down(): void
    {
        Schema::table('producto_presentacion', function (Blueprint $table) {
            $table->dropUnique(
                'uq_producto_presentacion'
            );
        });

        DB::statement(
            'ALTER TABLE producto_presentacion
             DROP CONSTRAINT producto_presentacion_pkey'
        );

        Schema::table('producto_presentacion', function (Blueprint $table) {
            $table->dropColumn(
                'id_producto_presentacion'
            );

            $table->primary([
                'id_producto',
                'id_presentacion',
            ]);
        });
    }
};