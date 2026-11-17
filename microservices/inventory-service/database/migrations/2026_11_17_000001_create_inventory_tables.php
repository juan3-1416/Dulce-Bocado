<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('almacen', function (Blueprint $table) {
            $table->bigIncrements('id_almacen');
            $table->string('nombre', 100);
            $table->string('tipo', 30)->unique();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('existencia', function (Blueprint $table) {
            $table->bigIncrements('id_existencia');
            $table->unsignedBigInteger('almacen_id');
            $table->string('tipo_articulo', 30);
            $table->unsignedBigInteger('articulo_id');
            $table->decimal('cantidad', 12, 3)->default(0);
            $table->string('unidad', 20);
            $table->timestamps();

            $table->foreign('almacen_id')
                ->references('id_almacen')
                ->on('almacen')
                ->restrictOnDelete();

            $table->unique(
                ['almacen_id', 'tipo_articulo', 'articulo_id'],
                'uq_existencia_almacen_articulo'
            );

            $table->index(
                ['tipo_articulo', 'articulo_id'],
                'idx_existencia_articulo'
            );
        });

        Schema::create('movimiento', function (Blueprint $table) {
            $table->bigIncrements('id_movimiento');
            $table->string('tipo', 30);

            $table->string('tipo_articulo', 30);
            $table->unsignedBigInteger('articulo_id');

            $table->decimal('cantidad', 12, 3);
            $table->string('unidad', 20);

            $table->unsignedBigInteger('almacen_origen_id')->nullable();
            $table->unsignedBigInteger('almacen_destino_id')->nullable();

            $table->string('motivo', 200);
            $table->text('observaciones')->nullable();

            $table->string('referencia_tipo', 30)->nullable();
            $table->string('referencia_id', 128)->nullable();

            $table->unsignedBigInteger('actor_usuario_id');

            $table->timestamps();

            $table->foreign('almacen_origen_id')
                ->references('id_almacen')
                ->on('almacen')
                ->restrictOnDelete();

            $table->foreign('almacen_destino_id')
                ->references('id_almacen')
                ->on('almacen')
                ->restrictOnDelete();

            $table->index(
                ['tipo', 'created_at'],
                'idx_movimiento_tipo_fecha'
            );

            $table->index(
                ['tipo_articulo', 'articulo_id', 'created_at'],
                'idx_movimiento_articulo_fecha'
            );

            $table->index(
                ['referencia_tipo', 'referencia_id'],
                'idx_movimiento_referencia'
            );
        });

        Schema::create('inventario_idempotencia', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->string('clave', 128)->unique();
            $table->char('huella_solicitud', 64);

            $table->string('tipo_operacion', 20);
            $table->unsignedBigInteger('actor_usuario_id');

            $table->unsignedSmallInteger('codigo_respuesta')->nullable();
            $table->json('respuesta_snapshot')->nullable();

            $table->timestamps();

            $table->index(
                ['tipo_operacion', 'created_at'],
                'idx_idempotencia_tipo_fecha'
            );
        });

        Schema::create('produccion_operacion', function (Blueprint $table) {
            $table->uuid('operacion_id')->primary();

            $table->char('huella_solicitud', 64);

            $table->unsignedBigInteger('presentacion_id');
            $table->unsignedInteger('cantidad_producida');

            $table->string('estado', 20)->default('EN_PROCESO');
            $table->string('codigo_rechazo', 80)->nullable();

            $table->unsignedBigInteger('actor_usuario_id');

            $table->json('respuesta_snapshot')->nullable();

            $table->timestamps();

            $table->index(
                ['estado', 'created_at'],
                'idx_produccion_operacion_estado_fecha'
            );
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE almacen
                ADD CONSTRAINT chk_almacen_tipo
                CHECK (
                    tipo IN (
                        'MATERIAS_PRIMAS',
                        'PRODUCCION',
                        'MOSTRADOR'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE existencia
                ADD CONSTRAINT chk_existencia_cantidad
                CHECK (cantidad >= 0)
            ");

            DB::statement("
                ALTER TABLE existencia
                ADD CONSTRAINT chk_existencia_tipo_articulo
                CHECK (
                    tipo_articulo IN (
                        'MATERIA_PRIMA',
                        'PRESENTACION'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE existencia
                ADD CONSTRAINT chk_existencia_unidad
                CHECK (
                    unidad IN (
                        'g',
                        'ml',
                        'unidad'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE existencia
                ADD CONSTRAINT chk_existencia_referencia
                CHECK (articulo_id > 0)
            ");

            DB::statement("
                ALTER TABLE existencia
                ADD CONSTRAINT chk_existencia_presentacion_unidad
                CHECK (
                    tipo_articulo <> 'PRESENTACION'
                    OR unidad = 'unidad'
                )
            ");

            DB::statement("
                ALTER TABLE movimiento
                ADD CONSTRAINT chk_movimiento_tipo
                CHECK (
                    tipo IN (
                        'INGRESO',
                        'EGRESO',
                        'TRASLADO',
                        'PRODUCCION_CONSUMO',
                        'PRODUCCION_INGRESO'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE movimiento
                ADD CONSTRAINT chk_movimiento_tipo_articulo
                CHECK (
                    tipo_articulo IN (
                        'MATERIA_PRIMA',
                        'PRESENTACION'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE movimiento
                ADD CONSTRAINT chk_movimiento_cantidad
                CHECK (cantidad > 0)
            ");

            DB::statement("
                ALTER TABLE movimiento
                ADD CONSTRAINT chk_movimiento_referencias
                CHECK (
                    articulo_id > 0
                    AND actor_usuario_id > 0
                )
            ");

            DB::statement("
                ALTER TABLE movimiento
                ADD CONSTRAINT chk_movimiento_unidad
                CHECK (
                    unidad IN (
                        'g',
                        'ml',
                        'unidad'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE movimiento
                ADD CONSTRAINT chk_movimiento_almacenes
                CHECK (
                    (
                        tipo IN ('INGRESO', 'PRODUCCION_INGRESO')
                        AND almacen_origen_id IS NULL
                        AND almacen_destino_id IS NOT NULL
                    )
                    OR
                    (
                        tipo IN ('EGRESO', 'PRODUCCION_CONSUMO')
                        AND almacen_origen_id IS NOT NULL
                        AND almacen_destino_id IS NULL
                    )
                    OR
                    (
                        tipo = 'TRASLADO'
                        AND almacen_origen_id IS NOT NULL
                        AND almacen_destino_id IS NOT NULL
                        AND almacen_origen_id <> almacen_destino_id
                    )
                )
            ");

            DB::statement("
                ALTER TABLE inventario_idempotencia
                ADD CONSTRAINT chk_inventario_idempotencia_operacion
                CHECK (
                    tipo_operacion IN (
                        'INGRESO',
                        'EGRESO',
                        'TRASLADO'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE inventario_idempotencia
                ADD CONSTRAINT chk_inventario_idempotencia_actor
                CHECK (actor_usuario_id > 0)
            ");

            DB::statement("
                ALTER TABLE produccion_operacion
                ADD CONSTRAINT chk_produccion_operacion_estado
                CHECK (
                    estado IN (
                        'EN_PROCESO',
                        'APLICADA',
                        'RECHAZADA'
                    )
                )
            ");

            DB::statement("
                ALTER TABLE produccion_operacion
                ADD CONSTRAINT chk_produccion_operacion_referencias
                CHECK (
                    presentacion_id > 0
                    AND cantidad_producida > 0
                    AND actor_usuario_id > 0
                )
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('produccion_operacion');
        Schema::dropIfExists('inventario_idempotencia');
        Schema::dropIfExists('movimiento');
        Schema::dropIfExists('existencia');
        Schema::dropIfExists('almacen');
    }
};