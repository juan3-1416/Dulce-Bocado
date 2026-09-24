<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Retirar temporalmente los CHECK
         * existentes para ampliarlos.
         */
        DB::statement("
            ALTER TABLE venta
            DROP CONSTRAINT IF EXISTS chk_venta_auditoria_anulacion
        ");

        DB::statement("
            ALTER TABLE venta
            DROP CONSTRAINT IF EXISTS chk_venta_estado
        ");

        /*
         * Una venta nueva debe comenzar
         * pendiente de pago.
         */
        DB::statement("
            ALTER TABLE venta
            ALTER COLUMN estado
            SET DEFAULT 'PENDIENTE_PAGO'
        ");

        /*
         * Estados válidos:
         *
         * PENDIENTE_PAGO
         * REGISTRADA
         * ANULADA
         */
        DB::statement("
            ALTER TABLE venta
            ADD CONSTRAINT chk_venta_estado
            CHECK (
                estado IN (
                    'PENDIENTE_PAGO',
                    'REGISTRADA',
                    'ANULADA'
                )
            )
        ");

        /*
         * PENDIENTE_PAGO y REGISTRADA
         * no tienen datos de anulación.
         *
         * ANULADA sí debe conservar
         * obligatoriamente su auditoría.
         */
        DB::statement("
            ALTER TABLE venta
            ADD CONSTRAINT chk_venta_auditoria_anulacion
            CHECK (
                (
                    estado IN (
                        'PENDIENTE_PAGO',
                        'REGISTRADA'
                    )
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

        DB::statement("
            ALTER TABLE venta
            DROP CONSTRAINT IF EXISTS chk_venta_estado
        ");

        /*
         * Solo para un eventual rollback:
         * las ventas pendientes vuelven al
         * estado existente anteriormente.
         */
        DB::statement("
            UPDATE venta
            SET estado = 'REGISTRADA'
            WHERE estado = 'PENDIENTE_PAGO'
        ");

        DB::statement("
            ALTER TABLE venta
            ALTER COLUMN estado
            SET DEFAULT 'REGISTRADA'
        ");

        DB::statement("
            ALTER TABLE venta
            ADD CONSTRAINT chk_venta_estado
            CHECK (
                estado IN (
                    'REGISTRADA',
                    'ANULADA'
                )
            )
        ");

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
};