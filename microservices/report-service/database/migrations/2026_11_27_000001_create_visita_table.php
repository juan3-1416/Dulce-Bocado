<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visita', function (Blueprint $table) {
            $table->bigIncrements('id_visita');
            $table->string('ruta', 255)->unique();
            $table->bigInteger('cantidad')->default(0);

            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamp('fecha_actualizacion')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visita');
    }
};
