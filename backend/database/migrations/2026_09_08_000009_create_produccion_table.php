<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('produccion', function (Blueprint $table) {
            $table->id('id_produccion');
            $table->unsignedBigInteger('id_producto_presentacion');
            $table->unsignedBigInteger('id_usuario');
            $table->timestamp('fecha_produccion')->useCurrent();
            $table->enum('estado', ['PROGRAMADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'])->default('PROGRAMADA');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->foreign('id_producto_presentacion')->references('id_producto_presentacion')->on('producto_presentacion')->onDelete('restrict');
            $table->foreign('id_usuario')->references('id_usuario')->on('usuarios')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produccion');
    }
};
