<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presentacion', function (Blueprint $table) {
            $table->bigIncrements('id_presentacion');
            $table->string('nombre', 150)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->boolean('estado')->default(true);

            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamp('fecha_actualizacion')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presentacion');
    }
};
