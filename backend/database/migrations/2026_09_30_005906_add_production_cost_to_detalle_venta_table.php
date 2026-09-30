<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_venta', function (Blueprint $table) {
            $table->decimal(
                'costo_unitario_produccion',
                12,
                4
            )->nullable();

            $table->decimal(
                'costo_total_produccion',
                12,
                2
            )->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('detalle_venta', function (Blueprint $table) {
            $table->dropColumn([
                'costo_unitario_produccion',
                'costo_total_produccion',
            ]);
        });
    }
};