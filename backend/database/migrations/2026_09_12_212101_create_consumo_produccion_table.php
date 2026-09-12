<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consumo_produccion', function (Blueprint $table) {
            $table->bigIncrements(
                'id_consumo_produccion'
            );

            $table->unsignedBigInteger(
                'id_produccion'
            );

            $table->unsignedBigInteger(
                'id_materia_prima'
            );

            $table->unsignedBigInteger(
                'id_almacen'
            );

            $table->unsignedBigInteger(
                'id_usuario'
            );

            /*
             * Cantidad que debería consumirse
             * según receta × cantidad planificada.
             */
            $table->decimal(
                'cantidad_teorica',
                12,
                3
            );

            /*
             * Cantidad realmente utilizada.
             */
            $table->decimal(
                'cantidad_consumida',
                12,
                3
            );

            /*
             * Diferencia positiva entre consumo real
             * y consumo teórico.
             */
            $table->decimal(
                'cantidad_desperdicio',
                12,
                3
            )->default(0);

            /*
             * Snapshot del costo unitario utilizado
             * al momento de registrar la producción.
             */
            $table->decimal(
                'costo_unitario',
                12,
                4
            );

            /*
             * cantidad_consumida × costo_unitario
             */
            $table->decimal(
                'costo_total',
                14,
                4
            );

            $table->text(
                'observaciones'
            )->nullable();

            $table->timestamp(
                'fecha_registro'
            )->useCurrent();

            $table->timestamps();

            /*
             * Una materia prima se registra una sola vez
             * dentro de una misma producción.
             */
            $table->unique(
                [
                    'id_produccion',
                    'id_materia_prima',
                ],
                'uq_consumo_produccion_materia'
            );

            $table->foreign(
                'id_produccion',
                'fk_consumo_produccion_produccion'
            )
                ->references('id_produccion')
                ->on('produccion')
                ->cascadeOnDelete();

            $table->foreign(
                'id_materia_prima',
                'fk_consumo_produccion_materia'
            )
                ->references('id_materia_prima')
                ->on('materia_prima')
                ->restrictOnDelete();

            $table->foreign(
                'id_almacen',
                'fk_consumo_produccion_almacen'
            )
                ->references('id_almacen')
                ->on('almacen')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario',
                'fk_consumo_produccion_usuario'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        DB::statement("
            ALTER TABLE consumo_produccion
            ADD CONSTRAINT chk_consumo_cantidad_teorica
            CHECK (cantidad_teorica > 0)
        ");

        DB::statement("
            ALTER TABLE consumo_produccion
            ADD CONSTRAINT chk_consumo_cantidad_real
            CHECK (cantidad_consumida >= 0)
        ");

        DB::statement("
            ALTER TABLE consumo_produccion
            ADD CONSTRAINT chk_consumo_desperdicio
            CHECK (cantidad_desperdicio >= 0)
        ");

        DB::statement("
            ALTER TABLE consumo_produccion
            ADD CONSTRAINT chk_consumo_costo_unitario
            CHECK (costo_unitario >= 0)
        ");

        DB::statement("
            ALTER TABLE consumo_produccion
            ADD CONSTRAINT chk_consumo_costo_total
            CHECK (costo_total >= 0)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'consumo_produccion'
        );
    }
};