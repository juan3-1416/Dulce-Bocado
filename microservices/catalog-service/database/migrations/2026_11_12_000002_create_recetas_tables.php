<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('materias_primas', function (Blueprint $table) {
            $table->id('id_materia_prima');
            $table->string('nombre', 100)->unique();
            $table->enum('unidad_medida', ['g', 'ml', 'unidad']);
            $table->decimal('costo_unitario', 12, 4);
            $table->string('descripcion', 1000)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('recetas', function (Blueprint $table) {
            $table->id('id_receta');
            $table->foreignId('presentacion_id')->unique()->constrained('presentaciones', 'presentacion_id');
            $table->string('observaciones', 2000)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('detalle_recetas', function (Blueprint $table) {
            $table->id('id_detalle_receta');
            $table->foreignId('id_receta')->constrained('recetas', 'id_receta')->cascadeOnDelete();
            $table->foreignId('id_materia_prima')->constrained('materias_primas', 'id_materia_prima');
            $table->decimal('cantidad', 12, 3);
            $table->timestamps();
            $table->unique(['id_receta', 'id_materia_prima']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_recetas');
        Schema::dropIfExists('recetas');
        Schema::dropIfExists('materias_primas');
    }
};
