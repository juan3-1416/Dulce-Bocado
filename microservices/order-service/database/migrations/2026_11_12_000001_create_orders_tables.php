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
            $table->unsignedBigInteger('id_cliente');
            $table->unsignedBigInteger('id_usuario');
            $table->timestampTz('fecha_pedido');
            $table->date('fecha_entrega');
            $table->time('hora_entrega');
            $table->decimal('total', 12, 2);
            $table->char('moneda', 3)->default('BOB');
            $table->string('estado', 24)->default('REGISTRADO');
            $table->text('observaciones')->nullable();
            $table->timestampsTz();
            $table->index('id_cliente');
            $table->index(['estado', 'fecha_entrega']);
        });

        Schema::create('detalle_pedido', function (Blueprint $table) {
            $table->bigIncrements('id_detalle_pedido');
            $table->unsignedBigInteger('id_pedido');
            $table->unsignedBigInteger('presentacion_id');
            $table->string('nombre_presentacion_snapshot', 200);
            $table->decimal('precio_unitario_snapshot', 12, 2);
            $table->unsignedInteger('cantidad');
            $table->text('detalle_personalizacion')->nullable();
            $table->decimal('costo_personalizacion', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2);
            $table->timestampsTz();
            $table->foreign('id_pedido')->references('id_pedido')->on('pedido')->cascadeOnDelete();
            $table->index('presentacion_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE pedido ADD CONSTRAINT pedido_total_no_negativo CHECK (total >= 0)");
            DB::statement("ALTER TABLE pedido ADD CONSTRAINT pedido_estado_valido CHECK (estado IN ('REGISTRADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'))");
            DB::statement("ALTER TABLE detalle_pedido ADD CONSTRAINT detalle_pedido_cantidad_positiva CHECK (cantidad > 0)");
            DB::statement("ALTER TABLE detalle_pedido ADD CONSTRAINT detalle_pedido_importes_validos CHECK (precio_unitario_snapshot >= 0 AND costo_personalizacion >= 0 AND subtotal >= 0)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_pedido');
        Schema::dropIfExists('pedido');
    }
};
