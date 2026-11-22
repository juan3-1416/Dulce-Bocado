<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reporte_envio', function (Blueprint $table) {
            $table->id('id_envio');
            $table->string('tipo_reporte', 50); // ventas, pedidos, inventario
            $table->string('titulo', 150);
            $table->jsonb('destinatarios'); // array de correos normalizados
            $table->jsonb('filtros')->nullable(); // filtros aplicados
            $table->string('archivo_pdf', 255);
            $table->string('ruta_guardada', 255)->nullable();
            $table->string('estado', 50)->default('GENERADO'); // GENERADO, EN_COLA, ACEPTADO_POR_TRANSPORTE, FALLIDO
            $table->text('error_mensaje')->nullable();
            $table->string('idempotency_key', 128)->nullable()->unique();
            $table->unsignedBigInteger('id_usuario')->nullable();
            $table->timestamps();

            $table->index(['tipo_reporte', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reporte_envio');
    }
};
