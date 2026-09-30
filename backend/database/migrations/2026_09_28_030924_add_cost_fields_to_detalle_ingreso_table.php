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
        Schema::table('detalle_ingreso', function (Blueprint $table) {
            $table->decimal('precio_unitario', 12, 4)
                ->nullable()
                ->after('cantidad');

            $table->decimal('costo_total', 12, 2)
                ->nullable()
                ->after('precio_unitario');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detalle_ingreso', function (Blueprint $table) {
            $table->dropColumn([
                'precio_unitario',
                'costo_total',
            ]);
        });
    }
};