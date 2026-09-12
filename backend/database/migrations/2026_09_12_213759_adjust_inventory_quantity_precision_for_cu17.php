<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE inventario
            ALTER COLUMN cantidad
            TYPE NUMERIC(12,3)
        ");

        DB::statement("
            ALTER TABLE detalle_ingreso
            ALTER COLUMN cantidad
            TYPE NUMERIC(12,3)
        ");

        DB::statement("
            ALTER TABLE detalle_egreso
            ALTER COLUMN cantidad
            TYPE NUMERIC(12,3)
        ");

        DB::statement("
            ALTER TABLE detalle_produccion
            ALTER COLUMN cantidad_producida
            TYPE NUMERIC(12,3)
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE inventario
            ALTER COLUMN cantidad
            TYPE NUMERIC(10,2)
        ");

        DB::statement("
            ALTER TABLE detalle_ingreso
            ALTER COLUMN cantidad
            TYPE NUMERIC(10,2)
        ");

        DB::statement("
            ALTER TABLE detalle_egreso
            ALTER COLUMN cantidad
            TYPE NUMERIC(10,2)
        ");

        DB::statement("
            ALTER TABLE detalle_produccion
            ALTER COLUMN cantidad_producida
            TYPE NUMERIC(10,2)
        ");
    }
};