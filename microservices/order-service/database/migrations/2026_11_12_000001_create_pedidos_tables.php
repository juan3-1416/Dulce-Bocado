<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedido', function (Blueprint $table) {
            $table->bigIncrements('id_pedido');

            // Referencia externa a customer-service.
            $table->unsignedBigInteger('id_cliente')->nullable();

            // Snapshot del cliente registrado.
            $table->string('nombre_cliente_snapshot', 200)->nullable();

            // Cliente que no existe en customer-service.
            $table->string('nombre_cliente_ocasional', 150)->nullable();

            // Actor autenticado por security-service.
            $table->unsignedBigInteger('id_usuario');

            $table->timestamp('fecha_pedido')->useCurrent();
            $table->date('fecha_entrega');
            $table->time('hora_entrega');

            $table->decimal('total', 12, 2)->default(0);
            $table->char('moneda', 3)->default('BOB');

            $table->string('estado', 20)->default('PROGRAMADO');
            $table->text('observaciones')->nullable();

            // Auditoría de CU15.
            $table->unsignedBigInteger('id_usuario_entrega')->nullable();
            $table->timestamp('fecha_entrega_efectiva')->nullable();

            $table->unsignedBigInteger('id_usuario_cancelacion')->nullable();
            $table->string('motivo_cancelacion', 500)->nullable();
            $table->timestamp('fecha_cancelacion')->nullable();

            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamp('fecha_actualizacion')->useCurrent();
        });

        Schema::create('detalle_pedido', function (Blueprint $table) {
            $table->bigIncrements('id_detalle_pedido');

            $table->unsignedBigInteger('id_pedido');

            // ID externo de catalog-service.
            $table->unsignedBigInteger('presentacion_id');

            // Snapshots históricos.
            $table->string('nombre_producto_snapshot', 150);
            $table->string('nombre_presentacion_snapshot', 200);

            $table->decimal('precio_unitario_snapshot', 12, 2);
            $table->unsignedInteger('cantidad');

            $table->text('detalle_personalizacion')->nullable();
            $table->decimal('costo_personalizacion', 12, 2)->default(0);

            $table->decimal('subtotal', 12, 2);

            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamp('fecha_actualizacion')->useCurrent();

            $table->foreign('id_pedido')
                ->references('id_pedido')
                ->on('pedido')
                ->cascadeOnDelete();
        });

        DB::statement("
            ALTER TABLE pedido
            ADD CONSTRAINT chk_pedido_cliente
            CHECK (
                (
                    id_cliente IS NOT NULL
                    AND nombre_cliente_snapshot IS NOT NULL
                    AND nombre_cliente_ocasional IS NULL
                )
                OR
                (
                    id_cliente IS NULL
                    AND nombre_cliente_snapshot IS NULL
                    AND nombre_cliente_ocasional IS NOT NULL
                )
            )
        ");

        DB::statement("
            ALTER TABLE pedido
            ADD CONSTRAINT chk_pedido_total
            CHECK (total >= 0)
        ");

        DB::statement("
            ALTER TABLE pedido
            ADD CONSTRAINT chk_pedido_estado
            CHECK (
                estado IN (
                    'PROGRAMADO',
                    'EN_PROCESO',
                    'ENTREGADO',
                    'CANCELADO'
                )
            )
        ");

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

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_cantidad
            CHECK (cantidad > 0)
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_precio
            CHECK (precio_unitario_snapshot >= 0)
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_personalizacion
            CHECK (costo_personalizacion >= 0)
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_subtotal
            CHECK (subtotal >= 0)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_pedido');
        Schema::dropIfExists('pedido');
    }
};