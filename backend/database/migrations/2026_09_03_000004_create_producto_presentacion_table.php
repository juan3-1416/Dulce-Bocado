<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producto_presentacion', function (Blueprint $table) {
            $table->unsignedBigInteger('id_producto');
            $table->unsignedBigInteger('id_presentacion');

            $table->decimal('precio', 10, 2);
            $table->timestamp('fecha_actualizacion')->useCurrent();

            // Clave Primaria Compuesta
            $table->primary(['id_producto', 'id_presentacion'], 'pk_producto_presentacion');

            // Llaves Foráneas
            $table->foreign('id_producto')
                ->references('id_producto')
                ->on('producto')
                ->onDelete('cascade');

            $table->foreign('id_presentacion')
                ->references('id_presentacion')
                ->on('presentacion')
                ->onDelete('restrict');
        });

        // Restricción a nivel de BD para asegurar precio > 0
        DB::statement(
            'ALTER TABLE producto_presentacion
             ADD CONSTRAINT chk_producto_presentacion_precio
             CHECK (precio > 0)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('producto_presentacion');
    }
};
