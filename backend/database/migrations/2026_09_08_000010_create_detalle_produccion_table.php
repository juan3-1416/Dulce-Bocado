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
        Schema::create('detalle_produccion', function (Blueprint $table) {
            $table->id('id_detalle_produccion');
            $table->unsignedBigInteger('id_produccion');
            $table->unsignedBigInteger('id_almacen');
            $table->integer('cantidad_esperada');
            $table->decimal('cantidad_producida', 10, 2)->nullable();
            $table->timestamps();

            $table->foreign('id_produccion')->references('id_produccion')->on('produccion')->onDelete('cascade');
            $table->foreign('id_almacen')->references('id_almacen')->on('almacen')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_produccion');
    }
};
