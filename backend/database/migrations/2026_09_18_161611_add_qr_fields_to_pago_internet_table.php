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
        |--------------------------------------------------------------------------
        | Datos necesarios para el QR
        |--------------------------------------------------------------------------
        */

        Schema::table('pago_internet', function (Blueprint $table) {
            $table->string('token_qr', 64)
                ->nullable()
                ->unique();

            $table->timestamp('fecha_vencimiento')
                ->nullable();

            $table->timestamp('fecha_escaneo')
                ->nullable();
        });

        /*
        |--------------------------------------------------------------------------
        | Actualizar estados permitidos
        |--------------------------------------------------------------------------
        |
        | Antes:
        | PENDIENTE / APROBADO / RECHAZADO
        |
        | Ahora:
        | PENDIENTE / APROBADO / RECHAZADO / VENCIDO
        |
        */

        DB::statement("
            ALTER TABLE pago_internet
            DROP CONSTRAINT chk_pago_internet_consistencia
        ");

        DB::statement("
            ALTER TABLE pago_internet
            DROP CONSTRAINT chk_pago_internet_estado
        ");

        DB::statement("
            ALTER TABLE pago_internet
            ADD CONSTRAINT chk_pago_internet_estado
            CHECK (
                estado IN (
                    'PENDIENTE',
                    'APROBADO',
                    'RECHAZADO',
                    'VENCIDO'
                )
            )
        ");

        /*
        |--------------------------------------------------------------------------
        | Nueva consistencia de estados
        |--------------------------------------------------------------------------
        |
        | PENDIENTE:
        | - todavía no existe Pago
        | - no existe confirmación
        | - no existe rechazo
        |
        | APROBADO:
        | - existe Pago
        | - existe fecha de confirmación
        | - no existe rechazo
        |
        | RECHAZADO:
        | - no existe Pago
        | - existe fecha de confirmación
        | - existe motivo
        |
        | VENCIDO:
        | - no existe Pago
        | - no existe confirmación de pago
        | - no existe motivo de rechazo
        |
        */

        DB::statement("
            ALTER TABLE pago_internet
            ADD CONSTRAINT chk_pago_internet_consistencia
            CHECK (
                (
                    estado = 'PENDIENTE'
                    AND id_pago IS NULL
                    AND fecha_confirmacion IS NULL
                    AND motivo_rechazo IS NULL
                )
                OR
                (
                    estado = 'APROBADO'
                    AND id_pago IS NOT NULL
                    AND fecha_confirmacion IS NOT NULL
                    AND motivo_rechazo IS NULL
                )
                OR
                (
                    estado = 'RECHAZADO'
                    AND id_pago IS NULL
                    AND fecha_confirmacion IS NOT NULL
                    AND motivo_rechazo IS NOT NULL
                )
                OR
                (
                    estado = 'VENCIDO'
                    AND id_pago IS NULL
                    AND fecha_confirmacion IS NULL
                    AND motivo_rechazo IS NULL
                )
            )
        ");
    }

    public function down(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Antes de volver al CHECK anterior
        |--------------------------------------------------------------------------
        |
        | Una BD con registros VENCIDO no puede volver al constraint
        | antiguo. Para permitir rollback convertimos VENCIDO en RECHAZADO.
        |
        */

        DB::statement("
            UPDATE pago_internet
            SET
                estado = 'RECHAZADO',
                motivo_rechazo = 'Transacción QR vencida.',
                fecha_confirmacion = COALESCE(
                    fecha_confirmacion,
                    fecha_actualizacion,
                    CURRENT_TIMESTAMP
                )
            WHERE estado = 'VENCIDO'
        ");

        DB::statement("
            ALTER TABLE pago_internet
            DROP CONSTRAINT chk_pago_internet_consistencia
        ");

        DB::statement("
            ALTER TABLE pago_internet
            DROP CONSTRAINT chk_pago_internet_estado
        ");

        Schema::table('pago_internet', function (Blueprint $table) {
            $table->dropUnique([
                'token_qr'
            ]);

            $table->dropColumn([
                'token_qr',
                'fecha_vencimiento',
                'fecha_escaneo',
            ]);
        });

        /*
        |--------------------------------------------------------------------------
        | Restaurar restricciones originales
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE pago_internet
            ADD CONSTRAINT chk_pago_internet_estado
            CHECK (
                estado IN (
                    'PENDIENTE',
                    'APROBADO',
                    'RECHAZADO'
                )
            )
        ");

        DB::statement("
            ALTER TABLE pago_internet
            ADD CONSTRAINT chk_pago_internet_consistencia
            CHECK (
                (
                    estado = 'PENDIENTE'
                    AND id_pago IS NULL
                    AND fecha_confirmacion IS NULL
                    AND motivo_rechazo IS NULL
                )
                OR
                (
                    estado = 'APROBADO'
                    AND id_pago IS NOT NULL
                    AND fecha_confirmacion IS NOT NULL
                    AND motivo_rechazo IS NULL
                )
                OR
                (
                    estado = 'RECHAZADO'
                    AND id_pago IS NULL
                    AND fecha_confirmacion IS NOT NULL
                    AND motivo_rechazo IS NOT NULL
                )
            )
        ");
    }
};