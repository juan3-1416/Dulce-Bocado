<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * pago_internet podrá pertenecer a:
         *
         * - una venta
         * - o un pedido
         *
         * pero nunca a ambos al mismo tiempo.
         */

        DB::statement("
            ALTER TABLE pago_internet
            ALTER COLUMN id_venta DROP NOT NULL
        ");

        Schema::table('pago_internet', function (Blueprint $table) {
            $table
                ->unsignedBigInteger('id_pedido')
                ->nullable();

            $table
                ->foreign(
                    'id_pedido',
                    'fk_pago_internet_pedido'
                )
                ->references('id_pedido')
                ->on('pedido')
                ->restrictOnDelete();
        });

        /*
         * Garantiza exactamente un origen:
         *
         * venta XOR pedido
         */
        DB::statement("
            ALTER TABLE pago_internet
            ADD CONSTRAINT chk_pago_internet_origen
            CHECK (
                (
                    id_venta IS NOT NULL
                    AND id_pedido IS NULL
                )
                OR
                (
                    id_venta IS NULL
                    AND id_pedido IS NOT NULL
                )
            )
        ");
    }

    public function down(): void
    {
        /*
         * Evitar perder transacciones QR asociadas
         * a pedidos durante un rollback.
         */
        $existenPagosPedido =
            DB::table('pago_internet')
                ->whereNotNull('id_pedido')
                ->exists();

        if ($existenPagosPedido) {
            throw new RuntimeException(
                'No se puede revertir esta migración porque existen pagos por internet asociados a pedidos.'
            );
        }

        DB::statement("
            ALTER TABLE pago_internet
            DROP CONSTRAINT IF EXISTS chk_pago_internet_origen
        ");

        Schema::table('pago_internet', function (Blueprint $table) {
            $table->dropForeign(
                'fk_pago_internet_pedido'
            );

            $table->dropColumn(
                'id_pedido'
            );
        });

        DB::statement("
            ALTER TABLE pago_internet
            ALTER COLUMN id_venta SET NOT NULL
        ");
    }
};