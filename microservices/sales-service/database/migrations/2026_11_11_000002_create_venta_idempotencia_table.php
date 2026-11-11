<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venta_idempotencia', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('operacion', 80);
            $table->string('clave', 128);
            $table->char('hash_solicitud', 64);
            $table->unsignedBigInteger('id_usuario');
            $table->unsignedSmallInteger('codigo_http');
            $table->json('respuesta');
            $table->timestampsTz();
            $table->unique(['operacion', 'clave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venta_idempotencia');
    }
};
