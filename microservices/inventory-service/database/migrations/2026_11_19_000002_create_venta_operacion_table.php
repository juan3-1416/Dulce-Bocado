<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venta_operacion', function (Blueprint $table) {
            $table->uuid('operacion_id')->primary();
            $table->unsignedBigInteger('venta_id')->unique();
            $table->char('huella_solicitud', 64);
            $table->unsignedBigInteger('actor_usuario_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venta_operacion');
    }
};
