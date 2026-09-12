<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materia_prima', function (Blueprint $table) {
            $table->decimal(
                'costo_unitario',
                12,
                4
            )
                ->default(0)
                ->after('unidad_medida');
        });

        DB::statement("
            ALTER TABLE materia_prima
            ADD CONSTRAINT chk_materia_prima_costo_unitario
            CHECK (costo_unitario >= 0)
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE materia_prima
            DROP CONSTRAINT IF EXISTS chk_materia_prima_costo_unitario
        ");

        Schema::table('materia_prima', function (Blueprint $table) {
            $table->dropColumn('costo_unitario');
        });
    }
};