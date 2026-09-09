<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido', function (Blueprint $table) {
            $table->unsignedBigInteger('id_usuario_entrega')
                ->nullable();

            $table->timestamp('fecha_entrega_efectiva')
                ->nullable();

            $table->unsignedBigInteger('id_usuario_cancelacion')
                ->nullable();

            $table->string('motivo_cancelacion', 500)
                ->nullable();

            $table->timestamp('fecha_cancelacion')
                ->nullable();

            $table->foreign(
                'id_usuario_entrega',
                'fk_pedido_usuario_entrega'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario_cancelacion',
                'fk_pedido_usuario_cancelacion'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        DB::statement("
            ALTER TABLE pedido
            ADD CONSTRAINT chk_pedido_auditoria_estado
            CHECK (
                (
                    estado IN ('PROGRAMADO', 'EN_PROCESO')
                    AND id_usuario_entrega IS NULL
                    AND fecha_entrega_efectiva IS NULL
                    AND id_usuario_cancelacion IS NULL
                    AND motivo_cancelacion IS NULL
                    AND fecha_cancelacion IS NULL
                )
                OR
                (
                    estado = 'ENTREGADO'
                    AND id_usuario_entrega IS NOT NULL
                    AND fecha_entrega_efectiva IS NOT NULL
                    AND id_usuario_cancelacion IS NULL
                    AND motivo_cancelacion IS NULL
                    AND fecha_cancelacion IS NULL
                )
                OR
                (
                    estado = 'CANCELADO'
                    AND id_usuario_entrega IS NULL
                    AND fecha_entrega_efectiva IS NULL
                    AND id_usuario_cancelacion IS NOT NULL
                    AND motivo_cancelacion IS NOT NULL
                    AND fecha_cancelacion IS NOT NULL
                )
            )
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE pedido
            DROP CONSTRAINT IF EXISTS chk_pedido_auditoria_estado
        ");

        Schema::table('pedido', function (Blueprint $table) {
            $table->dropForeign('fk_pedido_usuario_entrega');
            $table->dropForeign('fk_pedido_usuario_cancelacion');

            $table->dropColumn([
                'id_usuario_entrega',
                'fecha_entrega_efectiva',
                'id_usuario_cancelacion',
                'motivo_cancelacion',
                'fecha_cancelacion',
            ]);
        });
    }
};
