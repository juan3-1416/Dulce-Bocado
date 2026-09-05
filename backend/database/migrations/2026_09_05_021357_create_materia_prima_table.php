<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('materia_prima', function (Blueprint $table) {
            $table->bigIncrements('id_materia_prima');

            $table->string('nombre', 100)->unique();

            $table->string(
                'unidad_medida',
                20
            );

            $table->text('descripcion')->nullable();

            $table->boolean('estado')
                ->default(true);

            $table->timestamp('fecha_creacion')
                ->useCurrent();

            $table->timestamp('fecha_actualizacion')
                ->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materia_prima');
    }
};