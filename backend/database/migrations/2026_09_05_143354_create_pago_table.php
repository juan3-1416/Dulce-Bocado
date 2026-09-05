<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pago', function (Blueprint $table) {
            $table->bigIncrements('id_pago');

            /*
            |--------------------------------------------------------------------------
            | Venta asociada
            |--------------------------------------------------------------------------
            |
            | Por ahora CU11 trabaja sobre ventas.
            | Cuando se implemente CU14 Pedidos se extenderá
            | mediante una migración incremental.
            |
            */

            $table->unsignedBigInteger('id_venta');

            /*
            |--------------------------------------------------------------------------
            | Usuario que registra el pago
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_usuario');

            /*
            |--------------------------------------------------------------------------
            | Datos del pago
            |--------------------------------------------------------------------------
            */

            $table->decimal('monto', 12, 2);

            $table->string('metodo_pago', 20);

            $table->string('referencia', 150)
                ->nullable();

            $table->string('estado', 20)
                ->default('REGISTRADO');

            $table->text('observaciones')
                ->nullable();

            $table->timestamp('fecha_pago')
                ->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Auditoría de anulación
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_usuario_anulacion')
                ->nullable();

            $table->string('motivo_anulacion', 500)
                ->nullable();

            $table->timestamp('fecha_anulacion')
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Auditoría general
            |--------------------------------------------------------------------------
            */

            $table->timestamp('fecha_creacion')
                ->useCurrent();

            $table->timestamp('fecha_actualizacion')
                ->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Relaciones
            |--------------------------------------------------------------------------
            */

            $table->foreign(
                'id_venta',
                'fk_pago_venta'
            )
                ->references('id_venta')
                ->on('venta')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario',
                'fk_pago_usuario'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario_anulacion',
                'fk_pago_usuario_anulacion'
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
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_monto
            CHECK (monto > 0)
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_metodo
            CHECK (
                metodo_pago IN (
                    'EFECTIVO',
                    'QR',
                    'ONLINE'
                )
            )
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_estado
            CHECK (
                estado IN (
                    'REGISTRADO',
                    'ANULADO'
                )
            )
        ");

        /*
         * REGISTRADO:
         * no debe tener información de anulación.
         *
         * ANULADO:
         * debe contener usuario, motivo y fecha.
         */
        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_auditoria_anulacion
            CHECK (
                (
                    estado = 'REGISTRADO'
                    AND id_usuario_anulacion IS NULL
                    AND motivo_anulacion IS NULL
                    AND fecha_anulacion IS NULL
                )
                OR
                (
                    estado = 'ANULADO'
                    AND id_usuario_anulacion IS NOT NULL
                    AND motivo_anulacion IS NOT NULL
                    AND fecha_anulacion IS NOT NULL
                )
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('pago');
    }
};