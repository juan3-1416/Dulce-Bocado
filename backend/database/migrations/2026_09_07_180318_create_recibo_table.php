<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recibo', function (Blueprint $table) {
            $table->bigIncrements('id_recibo');

            /*
            |--------------------------------------------------------------------------
            | Pago asociado
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_pago');

            /*
            |--------------------------------------------------------------------------
            | Usuario que genera el recibo
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_usuario_emision');

            /*
            |--------------------------------------------------------------------------
            | Snapshot de información
            |--------------------------------------------------------------------------
            |
            | Conservamos estos datos tal como estaban al momento
            | de emitir el recibo.
            |
            | De esta forma, si posteriormente se modifica el cliente,
            | el recibo histórico no cambia.
            |
            */

            $table->string(
                'nombre_cliente',
                200
            );

            $table->string(
                'ci_nit_cliente',
                50
            )->nullable();

            $table->decimal(
                'monto',
                12,
                2
            );

            $table->string(
                'metodo_pago',
                20
            );

            $table->string(
                'referencia_pago',
                150
            )->nullable();

            $table->timestamp(
                'fecha_pago'
            );

            /*
            |--------------------------------------------------------------------------
            | Estado del recibo
            |--------------------------------------------------------------------------
            */

            $table->string(
                'estado',
                20
            )->default('EMITIDO');

            $table->timestamp(
                'fecha_emision'
            )->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Auditoría de anulación
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger(
                'id_usuario_anulacion'
            )->nullable();

            $table->string(
                'motivo_anulacion',
                500
            )->nullable();

            $table->timestamp(
                'fecha_anulacion'
            )->nullable();

            /*
            |--------------------------------------------------------------------------
            | Control de impresión / reimpresión
            |--------------------------------------------------------------------------
            */

            $table->unsignedInteger(
                'cantidad_impresiones'
            )->default(0);

            $table->unsignedBigInteger(
                'id_usuario_ultima_impresion'
            )->nullable();

            $table->timestamp(
                'fecha_ultima_impresion'
            )->nullable();

            /*
            |--------------------------------------------------------------------------
            | Auditoría general
            |--------------------------------------------------------------------------
            */

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
                'id_pago',
                'fk_recibo_pago'
            )
                ->references('id_pago')
                ->on('pago')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario_emision',
                'fk_recibo_usuario_emision'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario_anulacion',
                'fk_recibo_usuario_anulacion'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario_ultima_impresion',
                'fk_recibo_usuario_impresion'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        /*
        |--------------------------------------------------------------------------
        | Restricción de monto
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE recibo
            ADD CONSTRAINT chk_recibo_monto
            CHECK (monto > 0)
        ");

        /*
        |--------------------------------------------------------------------------
        | Método de pago
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE recibo
            ADD CONSTRAINT chk_recibo_metodo_pago
            CHECK (
                metodo_pago IN (
                    'EFECTIVO',
                    'QR',
                    'ONLINE'
                )
            )
        ");

        /*
        |--------------------------------------------------------------------------
        | Estado
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE recibo
            ADD CONSTRAINT chk_recibo_estado
            CHECK (
                estado IN (
                    'EMITIDO',
                    'ANULADO'
                )
            )
        ");

        /*
        |--------------------------------------------------------------------------
        | Auditoría de anulación
        |--------------------------------------------------------------------------
        |
        | EMITIDO:
        | no debe tener información de anulación.
        |
        | ANULADO:
        | debe contener usuario, motivo y fecha.
        |
        */

        DB::statement("
            ALTER TABLE recibo
            ADD CONSTRAINT chk_recibo_auditoria_anulacion
            CHECK (
                (
                    estado = 'EMITIDO'
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

        /*
        |--------------------------------------------------------------------------
        | Auditoría de impresión
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE recibo
            ADD CONSTRAINT chk_recibo_impresion
            CHECK (
                (
                    cantidad_impresiones = 0
                    AND id_usuario_ultima_impresion IS NULL
                    AND fecha_ultima_impresion IS NULL
                )
                OR
                (
                    cantidad_impresiones > 0
                    AND id_usuario_ultima_impresion IS NOT NULL
                    AND fecha_ultima_impresion IS NOT NULL
                )
            )
        ");

        /*
        |--------------------------------------------------------------------------
        | Solo un recibo EMITIDO por pago
        |--------------------------------------------------------------------------
        |
        | Un pago puede conservar recibos históricos ANULADOS,
        | pero solamente uno puede estar activo.
        |
        */

        DB::statement("
            CREATE UNIQUE INDEX uq_recibo_pago_emitido
            ON recibo (id_pago)
            WHERE estado = 'EMITIDO'
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('recibo');
    }
};