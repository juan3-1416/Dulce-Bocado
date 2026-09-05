<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receta', function (Blueprint $table) {
            $table->bigIncrements('id_receta');

            $table->unsignedBigInteger(
                'id_producto_presentacion'
            );

            $table->text('observaciones')
                ->nullable();

            $table->boolean('estado')
                ->default(true);

            $table->timestamp('fecha_creacion')
                ->useCurrent();

            $table->timestamp('fecha_actualizacion')
                ->useCurrent();

            /*
             * Una combinación Producto + Presentación
             * puede tener una sola receta.
             */
            $table->unique(
                'id_producto_presentacion',
                'uq_receta_producto_presentacion'
            );

            $table->foreign(
                'id_producto_presentacion',
                'fk_receta_producto_presentacion'
            )
                ->references(
                    'id_producto_presentacion'
                )
                ->on('producto_presentacion')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receta');
    }
};