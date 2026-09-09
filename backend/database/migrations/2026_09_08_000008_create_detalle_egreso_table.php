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
        Schema::create('detalle_egreso', function (Blueprint $table) {
            $table->id('id_detalle_egreso');
            $table->unsignedBigInteger('id_egreso');
            $table->unsignedBigInteger('id_almacen');
            $table->unsignedBigInteger('id_producto_presentacion')->nullable();
            $table->unsignedBigInteger('id_materia_prima')->nullable();
            $table->decimal('cantidad', 10, 2);
            $table->timestamps();

            $table->foreign('id_egreso')->references('id_egreso')->on('egreso')->onDelete('cascade');
            $table->foreign('id_almacen')->references('id_almacen')->on('almacen')->onDelete('restrict');
            $table->foreign('id_producto_presentacion')->references('id_producto_presentacion')->on('producto_presentacion')->onDelete('restrict');
            $table->foreign('id_materia_prima')->references('id_materia_prima')->on('materia_prima')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_egreso');
    }
};
