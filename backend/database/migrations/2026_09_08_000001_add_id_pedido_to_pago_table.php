<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE pago ALTER COLUMN id_venta DROP NOT NULL;");

        Schema::table('pago', function (Blueprint $table) {
            $table->unsignedBigInteger('id_pedido')
                ->nullable()
                ->after('id_venta');

            $table->foreign(
                'id_pedido',
                'fk_pago_pedido'
            )
                ->references('id_pedido')
                ->on('pedido')
                ->restrictOnDelete();
        });

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_origen
            CHECK (
                (id_venta IS NOT NULL AND id_pedido IS NULL)
                OR
                (id_venta IS NULL AND id_pedido IS NOT NULL)
            )
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE pago
            DROP CONSTRAINT IF EXISTS chk_pago_origen
        ");

        Schema::table('pago', function (Blueprint $table) {
            $table->dropForeign('fk_pago_pedido');
            $table->dropColumn('id_pedido');
        });

        DB::statement("ALTER TABLE pago ALTER COLUMN id_venta SET NOT NULL;");
    }
};
