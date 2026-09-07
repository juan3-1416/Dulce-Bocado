<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pago_internet', function (Blueprint $table) {
            $table->bigIncrements('id_pago_internet');

            /*
            |--------------------------------------------------------------------------
            | Venta asociada
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_venta');

            /*
            |--------------------------------------------------------------------------
            | Pago financiero generado al aprobarse
            |--------------------------------------------------------------------------
            |
            | Permanece NULL mientras la transacción esté:
            | - PENDIENTE
            | - RECHAZADA
            |
            | Se completa cuando queda APROBADA.
            |
            */

            $table->unsignedBigInteger('id_pago')
                ->nullable()
                ->unique();

            /*
            |--------------------------------------------------------------------------
            | Usuario que inicia la transacción
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_usuario');

            /*
            |--------------------------------------------------------------------------
            | Datos de la transacción
            |--------------------------------------------------------------------------
            */

            $table->decimal('monto', 12, 2);

            $table->string('proveedor', 100);

            $table->string(
                'referencia_transaccion',
                150
            )->unique();

            $table->string('estado', 20)
                ->default('PENDIENTE');

            /*
            |--------------------------------------------------------------------------
            | Información devuelta por el proveedor
            |--------------------------------------------------------------------------
            */

            $table->string(
                'motivo_rechazo',
                500
            )->nullable();

            $table->jsonb(
                'respuesta_proveedor'
            )->nullable();

            /*
            |--------------------------------------------------------------------------
            | Fechas
            |--------------------------------------------------------------------------
            */

            $table->timestamp(
                'fecha_solicitud'
            )->useCurrent();

            $table->timestamp(
                'fecha_confirmacion'
            )->nullable();

            $table->timestamp(
                'fecha_creacion'
            )->useCurrent();

            $table->timestamp(
                'fecha_actualizacion'
            )->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Relaciones
            |--------------------------------------------------------------------------
            */

            $table->foreign(
                'id_venta',
                'fk_pago_internet_venta'
            )
                ->references('id_venta')
                ->on('venta')
                ->restrictOnDelete();

            $table->foreign(
                'id_pago',
                'fk_pago_internet_pago'
            )
                ->references('id_pago')
                ->on('pago')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario',
                'fk_pago_internet_usuario'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        /*
        |--------------------------------------------------------------------------
        | Restricciones
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE pago_internet
            ADD CONSTRAINT chk_pago_internet_monto
            CHECK (monto > 0)
        ");

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

        /*
         * Consistencia de estados:
         *
         * PENDIENTE:
         * - todavía no existe Pago
         * - no tiene fecha de confirmación
         * - no tiene motivo de rechazo
         *
         * APROBADO:
         * - debe existir un Pago ONLINE
         * - debe existir fecha de confirmación
         * - no debe existir motivo de rechazo
         *
         * RECHAZADO:
         * - no debe existir Pago
         * - debe existir fecha de confirmación
         * - debe existir motivo de rechazo
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
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'pago_internet'
        );
    }
};