<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'detalle_receta',
            function (Blueprint $table) {
                $table->bigIncrements(
                    'id_detalle_receta'
                );

                $table->unsignedBigInteger(
                    'id_receta'
                );

                $table->unsignedBigInteger(
                    'id_materia_prima'
                );

                /*
                 * La unidad no se repite aquí.
                 *
                 * Se obtiene desde materia_prima.unidad_medida.
                 */
                $table->decimal(
                    'cantidad',
                    12,
                    3
                );

                $table->timestamp(
                    'fecha_creacion'
                )->useCurrent();

                $table->timestamp(
                    'fecha_actualizacion'
                )->useCurrent();

                /*
                 * Una materia prima no puede repetirse
                 * dentro de la misma receta.
                 */
                $table->unique(
                    [
                        'id_receta',
                        'id_materia_prima',
                    ],
                    'uq_detalle_receta_materia'
                );

                $table->foreign(
                    'id_receta',
                    'fk_detalle_receta_receta'
                )
                    ->references('id_receta')
                    ->on('receta')
                    ->cascadeOnDelete();

                $table->foreign(
                    'id_materia_prima',
                    'fk_detalle_receta_materia'
                )
                    ->references(
                        'id_materia_prima'
                    )
                    ->on('materia_prima')
                    ->restrictOnDelete();
            }
        );

        /*
         * Protección adicional en PostgreSQL:
         * no se aceptan cantidades cero o negativas.
         */
        DB::statement(
            'ALTER TABLE detalle_receta
             ADD CONSTRAINT chk_detalle_receta_cantidad
             CHECK (cantidad > 0)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_receta');
    }
};