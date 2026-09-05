<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venta', function (Blueprint $table) {
            $table->unsignedBigInteger('id_usuario_anulacion')
                ->nullable();

            $table->string('motivo_anulacion', 500)
                ->nullable();

            $table->timestamp('fecha_anulacion')
                ->nullable();

            $table->foreign(
                'id_usuario_anulacion',
                'fk_venta_usuario_anulacion'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        /*
         * Una venta REGISTRADA no debe tener datos
         * de anulación.
         *
         * Una venta ANULADA debe registrar usuario,
         * motivo y fecha de anulación.
         */
        DB::statement("
            ALTER TABLE venta
            ADD CONSTRAINT chk_venta_auditoria_anulacion
            CHECK (
                (
                    estado = 'REGISTRADA'
                    AND id_usuario_anulacion IS NULL
                    AND motivo_anulacion IS NULL
                    AND fecha_anulacion IS NULL
                )
                OR
                (
                    estado = 'ANULADA'
                    AND id_usuario_anulacion IS NOT NULL
                    AND motivo_anulacion IS NOT NULL
                    AND fecha_anulacion IS NOT NULL
                )
            )
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE venta
            DROP CONSTRAINT IF EXISTS chk_venta_auditoria_anulacion
        ");

        Schema::table('venta', function (Blueprint $table) {
            $table->dropForeign(
                'fk_venta_usuario_anulacion'
            );

            $table->dropColumn([
                'id_usuario_anulacion',
                'motivo_anulacion',
                'fecha_anulacion',
            ]);
        });
    }
};