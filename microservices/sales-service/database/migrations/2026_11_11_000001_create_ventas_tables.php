<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venta', function (Blueprint $table) {
            $table->bigIncrements('id_venta');
            $table->unsignedBigInteger('id_cliente')->nullable();
            $table->string('nombre_cliente_ocasional', 150)->nullable();
            $table->unsignedBigInteger('id_usuario');
            $table->timestampTz('fecha_venta');
            $table->decimal('total', 12, 2);
            $table->char('moneda', 3)->default('BOB');
            $table->string('estado', 24)->default('BORRADOR');
            $table->text('observaciones')->nullable();
            $table->unsignedBigInteger('id_usuario_cancelacion')->nullable();
            $table->string('motivo_cancelacion', 500)->nullable();
            $table->timestampTz('fecha_cancelacion')->nullable();
            $table->timestampsTz();

            $table->index('id_cliente');
            $table->index(['estado', 'fecha_venta']);
        });

        Schema::create('detalle_venta', function (Blueprint $table) {
            $table->bigIncrements('id_detalle_venta');
            $table->unsignedBigInteger('id_venta');
            $table->unsignedBigInteger('presentacion_id');
            $table->string('nombre_presentacion_snapshot', 200);
            $table->decimal('precio_unitario_snapshot', 12, 2);
            $table->unsignedInteger('cantidad');
            $table->decimal('costo_personalizacion', 12, 2)->default(0);
            $table->text('detalle_personalizacion')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->timestampsTz();

            $table->foreign('id_venta')->references('id_venta')->on('venta')->cascadeOnDelete();
            $table->index('presentacion_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE venta ADD CONSTRAINT venta_total_no_negativo CHECK (total >= 0)");
            DB::statement("ALTER TABLE venta ADD CONSTRAINT venta_estado_valido CHECK (estado IN ('BORRADOR', 'CANCELADA'))");
            DB::statement("ALTER TABLE venta ADD CONSTRAINT venta_cliente_exclusivo CHECK ((id_cliente IS NOT NULL AND nombre_cliente_ocasional IS NULL) OR (id_cliente IS NULL AND NULLIF(BTRIM(nombre_cliente_ocasional), '') IS NOT NULL))");
            DB::statement("ALTER TABLE venta ADD CONSTRAINT venta_cancelacion_auditada CHECK ((estado = 'BORRADOR' AND id_usuario_cancelacion IS NULL AND motivo_cancelacion IS NULL AND fecha_cancelacion IS NULL) OR (estado = 'CANCELADA' AND id_usuario_cancelacion IS NOT NULL AND NULLIF(BTRIM(motivo_cancelacion), '') IS NOT NULL AND fecha_cancelacion IS NOT NULL))");
            DB::statement("ALTER TABLE detalle_venta ADD CONSTRAINT detalle_cantidad_positiva CHECK (cantidad > 0)");
            DB::statement("ALTER TABLE detalle_venta ADD CONSTRAINT detalle_importes_validos CHECK (precio_unitario_snapshot >= 0 AND costo_personalizacion >= 0 AND subtotal >= 0)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_venta');
        Schema::dropIfExists('venta');
    }
};
