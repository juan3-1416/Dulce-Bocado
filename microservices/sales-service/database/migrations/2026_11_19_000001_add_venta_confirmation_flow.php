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
            $table->uuid('operacion_stock_id')
                ->nullable()
                ->unique()
                ->after('estado');

            $table->unsignedBigInteger('id_usuario_confirmacion')
                ->nullable()
                ->after('operacion_stock_id');

            $table->timestampTz('fecha_confirmacion')
                ->nullable()
                ->after('id_usuario_confirmacion');
        });

        Schema::create(
            'venta_confirmacion',
            function (Blueprint $table) {
                $table->bigIncrements(
                    'id_venta_confirmacion'
                );

                $table->unsignedBigInteger('id_venta');

                $table->uuid('operacion_id')
                    ->unique();

                $table->string('clave', 128);

                $table->char(
                    'hash_solicitud',
                    64
                );

                $table->unsignedBigInteger(
                    'id_usuario'
                );

                $table->string('estado', 24)
                    ->default('PENDIENTE');

                $table->json('items_snapshot');

                $table->unsignedSmallInteger(
                    'codigo_http'
                )->nullable();

                $table->string(
                    'codigo_resultado',
                    64
                )->nullable();

                $table->json(
                    'respuesta_snapshot'
                )->nullable();

                $table->timestampTz(
                    'confirmado_at'
                )->nullable();

                $table->timestampTz(
                    'rechazado_at'
                )->nullable();

                $table->timestampsTz();

                $table->foreign('id_venta')
                    ->references('id_venta')
                    ->on('venta')
                    ->cascadeOnDelete();

                $table->unique('id_venta');

                $table->index([
                    'id_venta',
                    'estado',
                ]);
            }
        );

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE venta
                 DROP CONSTRAINT IF EXISTS
                 venta_estado_valido'
            );

            DB::statement(
                'ALTER TABLE venta
                 DROP CONSTRAINT IF EXISTS
                 venta_cancelacion_auditada'
            );

            DB::statement(
                "ALTER TABLE venta
                 ADD CONSTRAINT venta_estado_valido
                 CHECK (
                    estado IN (
                        'BORRADOR',
                        'CONFIRMADA',
                        'CANCELADA'
                    )
                 )"
            );

            DB::statement(
                "ALTER TABLE venta
                 ADD CONSTRAINT
                 venta_cancelacion_auditada
                 CHECK (
                    (
                        estado = 'BORRADOR'
                        AND operacion_stock_id IS NULL
                        AND id_usuario_confirmacion IS NULL
                        AND fecha_confirmacion IS NULL
                        AND id_usuario_cancelacion IS NULL
                        AND motivo_cancelacion IS NULL
                        AND fecha_cancelacion IS NULL
                    )
                    OR
                    (
                        estado = 'CONFIRMADA'
                        AND operacion_stock_id IS NOT NULL
                        AND id_usuario_confirmacion IS NOT NULL
                        AND fecha_confirmacion IS NOT NULL
                        AND id_usuario_cancelacion IS NULL
                        AND motivo_cancelacion IS NULL
                        AND fecha_cancelacion IS NULL
                    )
                    OR
                    (
                        estado = 'CANCELADA'
                        AND operacion_stock_id IS NULL
                        AND id_usuario_confirmacion IS NULL
                        AND fecha_confirmacion IS NULL
                        AND id_usuario_cancelacion IS NOT NULL
                        AND NULLIF(
                            BTRIM(motivo_cancelacion),
                            ''
                        ) IS NOT NULL
                        AND fecha_cancelacion IS NOT NULL
                    )
                 )"
            );

            DB::statement(
                "ALTER TABLE venta_confirmacion
                 ADD CONSTRAINT
                 venta_confirmacion_estado_valido
                 CHECK (
                    estado IN (
                        'PENDIENTE',
                        'INCIERTA',
                        'APLICADA',
                        'RECHAZADA'
                    )
                 )"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                'ALTER TABLE venta_confirmacion
                 DROP CONSTRAINT IF EXISTS
                 venta_confirmacion_estado_valido'
            );

            DB::statement(
                'ALTER TABLE venta
                 DROP CONSTRAINT IF EXISTS
                 venta_cancelacion_auditada'
            );

            DB::statement(
                'ALTER TABLE venta
                 DROP CONSTRAINT IF EXISTS
                 venta_estado_valido'
            );
        }

        Schema::dropIfExists(
            'venta_confirmacion'
        );

        Schema::table('venta', function (Blueprint $table) {
            $table->dropUnique([
                'operacion_stock_id',
            ]);

            $table->dropColumn([
                'operacion_stock_id',
                'id_usuario_confirmacion',
                'fecha_confirmacion',
            ]);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE venta
                 ADD CONSTRAINT venta_estado_valido
                 CHECK (
                    estado IN (
                        'BORRADOR',
                        'CANCELADA'
                    )
                 )"
            );

            DB::statement(
                "ALTER TABLE venta
                 ADD CONSTRAINT
                 venta_cancelacion_auditada
                 CHECK (
                    (
                        estado = 'BORRADOR'
                        AND id_usuario_cancelacion IS NULL
                        AND motivo_cancelacion IS NULL
                        AND fecha_cancelacion IS NULL
                    )
                    OR
                    (
                        estado = 'CANCELADA'
                        AND id_usuario_cancelacion IS NOT NULL
                        AND NULLIF(
                            BTRIM(motivo_cancelacion),
                            ''
                        ) IS NOT NULL
                        AND fecha_cancelacion IS NOT NULL
                    )
                 )"
            );
        }
    }
};