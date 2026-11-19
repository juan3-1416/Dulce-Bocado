<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intento_qr', function (Blueprint $table) {
            $table->bigIncrements('id_intento_qr');

            $table->uuid('operacion_id')->unique();

            $table->string('origen_tipo', 16);
            $table->unsignedBigInteger('origen_id');

            $table->decimal('monto', 12, 2);
            $table->string('moneda', 3)->default('BOB');

            $table->string('estado', 16)->default('INICIADA');

            $table->string('referencia_proveedor', 191)
                ->nullable()
                ->unique();

            $table->text('qr_contenido')->nullable();

            $table->timestampTz('expira_at')->nullable();
            $table->timestampTz('confirmado_at')->nullable();
            $table->timestampTz('rechazado_at')->nullable();

            $table->unsignedBigInteger('actor_usuario_id')->nullable();

            $table->timestampsTz();

            $table->index(
                ['origen_tipo', 'origen_id'],
                'idx_intento_qr_origen'
            );

            $table->index('estado', 'idx_intento_qr_estado');
        });

        Schema::create('pago', function (Blueprint $table) {
            $table->bigIncrements('id_pago');

            $table->uuid('operacion_id')->unique();

            $table->string('origen_tipo', 16);
            $table->unsignedBigInteger('origen_id');

            /*
             * Total verificado en Sales/Orders cuando se registra el pago.
             * No sustituye la propiedad del dato externo; sirve como snapshot
             * histórico de la validación realizada.
             */
            $table->decimal('total_origen_snapshot', 12, 2);

            $table->decimal('monto', 12, 2);
            $table->string('moneda', 3)->default('BOB');

            $table->string('medio', 16);
            $table->string('estado', 16);

            $table->unsignedBigInteger('intento_qr_id')
                ->nullable()
                ->unique();

            $table->unsignedBigInteger('actor_usuario_id')->nullable();

            $table->timestampTz('confirmado_at')->nullable();
            $table->timestampTz('rechazado_at')->nullable();

            $table->timestampsTz();

            $table->foreign('intento_qr_id')
                ->references('id_intento_qr')
                ->on('intento_qr')
                ->restrictOnDelete();

            $table->index(
                ['origen_tipo', 'origen_id'],
                'idx_pago_origen'
            );

            $table->index(
                ['origen_tipo', 'origen_id', 'estado'],
                'idx_pago_origen_estado'
            );
        });

        Schema::create('evento_qr', function (Blueprint $table) {
            $table->bigIncrements('id_evento_qr');

            $table->unsignedBigInteger('intento_qr_id');

            /*
             * Identificador único enviado por el proveedor.
             * Impide aplicar dos veces el mismo callback.
             */
            $table->string('evento_externo_id', 191)->unique();

            $table->string('referencia_proveedor', 191)->nullable();

            /*
             * Estado ya transformado al vocabulario interno.
             */
            $table->string('estado_normalizado', 16)->nullable();

            /*
             * Solo debe conservarse información necesaria para auditoría.
             */
            $table->jsonb('payload')->nullable();

            $table->timestampTz('recibido_at')->useCurrent();
            $table->timestampTz('procesado_at')->nullable();

            $table->timestampsTz();

            $table->foreign('intento_qr_id')
                ->references('id_intento_qr')
                ->on('intento_qr')
                ->restrictOnDelete();

            $table->index(
                'intento_qr_id',
                'idx_evento_qr_intento'
            );
        });

        Schema::create('pago_idempotencia', function (Blueprint $table) {
            $table->bigIncrements('id_pago_idempotencia');

            /*
             * Permite que la misma cadena de Idempotency-Key pueda existir
             * en operaciones distintas sin mezclar contratos.
             */
            $table->string('operacion', 64);
            $table->string('clave', 191);

            $table->char('huella_request', 64);

            $table->string('estado', 16)
                ->default('EN_PROCESO');

            $table->string('recurso_tipo', 32)->nullable();
            $table->unsignedBigInteger('recurso_id')->nullable();

            $table->unsignedSmallInteger('status_code')->nullable();

            $table->jsonb('respuesta_snapshot')->nullable();

            $table->timestampsTz();

            $table->unique(
                ['operacion', 'clave'],
                'uq_pago_idempotencia_operacion_clave'
            );
        });

        Schema::create('recibo', function (Blueprint $table) {
            $table->bigIncrements('id_recibo');

            $table->string('numero', 40)->unique();

            /*
             * Un pago confirmado genera como máximo un recibo interno.
             */
            $table->unsignedBigInteger('pago_id')->unique();

            $table->string('estado', 16)
                ->default('EMITIDO');

            $table->jsonb('snapshot');

            $table->unsignedBigInteger('emitido_por_usuario_id')->nullable();
            $table->timestampTz('emitido_at')->useCurrent();

            $table->text('motivo_anulacion')->nullable();
            $table->unsignedBigInteger('anulado_por_usuario_id')->nullable();
            $table->timestampTz('anulado_at')->nullable();

            $table->timestampsTz();

            $table->foreign('pago_id')
                ->references('id_pago')
                ->on('pago')
                ->restrictOnDelete();
        });

        /*
         * Restricciones PostgreSQL del dominio.
         */

        DB::statement("
            ALTER TABLE intento_qr
            ADD CONSTRAINT chk_intento_qr_origen
            CHECK (origen_tipo IN ('VENTA', 'PEDIDO'))
        ");

        DB::statement("
            ALTER TABLE intento_qr
            ADD CONSTRAINT chk_intento_qr_monto
            CHECK (monto > 0)
        ");

        DB::statement("
            ALTER TABLE intento_qr
            ADD CONSTRAINT chk_intento_qr_moneda
            CHECK (moneda = 'BOB')
        ");

        DB::statement("
            ALTER TABLE intento_qr
            ADD CONSTRAINT chk_intento_qr_estado
            CHECK (
                estado IN (
                    'INICIADA',
                    'CONFIRMADA',
                    'RECHAZADA'
                )
            )
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_origen
            CHECK (origen_tipo IN ('VENTA', 'PEDIDO'))
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_monto
            CHECK (monto > 0)
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_total
            CHECK (total_origen_snapshot > 0)
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_moneda
            CHECK (moneda = 'BOB')
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_medio
            CHECK (medio IN ('EFECTIVO', 'QR'))
        ");

        DB::statement("
            ALTER TABLE pago
            ADD CONSTRAINT chk_pago_estado
            CHECK (estado IN ('CONFIRMADO', 'RECHAZADO'))
        ");

        DB::statement("
            ALTER TABLE evento_qr
            ADD CONSTRAINT chk_evento_qr_estado
            CHECK (
                estado_normalizado IS NULL
                OR estado_normalizado IN (
                    'INICIADA',
                    'CONFIRMADA',
                    'RECHAZADA'
                )
            )
        ");

        DB::statement("
            ALTER TABLE pago_idempotencia
            ADD CONSTRAINT chk_pago_idempotencia_estado
            CHECK (
                estado IN (
                    'EN_PROCESO',
                    'COMPLETADA',
                    'RECHAZADA'
                )
            )
        ");

        DB::statement("
            ALTER TABLE recibo
            ADD CONSTRAINT chk_recibo_estado
            CHECK (estado IN ('EMITIDO', 'ANULADO'))
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('recibo');
        Schema::dropIfExists('pago_idempotencia');
        Schema::dropIfExists('evento_qr');
        Schema::dropIfExists('pago');
        Schema::dropIfExists('intento_qr');
    }
};