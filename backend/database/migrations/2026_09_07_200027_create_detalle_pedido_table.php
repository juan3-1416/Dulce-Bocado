<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalle_pedido', function (Blueprint $table) {
            $table->bigIncrements(
                'id_detalle_pedido'
            );

            $table->unsignedBigInteger(
                'id_pedido'
            );

            $table->unsignedBigInteger(
                'id_producto_presentacion'
            );

            /*
            |--------------------------------------------------------------------------
            | Cantidad
            |--------------------------------------------------------------------------
            */

            $table->unsignedInteger(
                'cantidad'
            );

            /*
            |--------------------------------------------------------------------------
            | Precio congelado
            |--------------------------------------------------------------------------
            |
            | Se obtiene desde producto_presentacion al momento
            | de registrar/modificar el pedido.
            |
            */

            $table->decimal(
                'precio_congelado',
                12,
                2
            );

            /*
            |--------------------------------------------------------------------------
            | Personalización
            |--------------------------------------------------------------------------
            */

            $table->text(
                'detalle_personalizacion'
            )->nullable();

            $table->decimal(
                'costo_personalizacion',
                12,
                2
            )->default(0);

            /*
            |--------------------------------------------------------------------------
            | Subtotal
            |--------------------------------------------------------------------------
            |
            | subtotal =
            | precio_congelado * cantidad
            | + costo_personalizacion
            |
            */

            $table->decimal(
                'subtotal',
                12,
                2
            );

            /*
            |--------------------------------------------------------------------------
            | Auditoría
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
                'id_pedido',
                'fk_detalle_pedido_pedido'
            )
                ->references('id_pedido')
                ->on('pedido')
                ->cascadeOnDelete();

            $table->foreign(
                'id_producto_presentacion',
                'fk_detalle_pedido_producto_presentacion'
            )
                ->references(
                    'id_producto_presentacion'
                )
                ->on('producto_presentacion')
                ->restrictOnDelete();
        });

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_cantidad
            CHECK (cantidad > 0)
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_precio
            CHECK (precio_congelado > 0)
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_personalizacion
            CHECK (costo_personalizacion >= 0)
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            ADD CONSTRAINT chk_detalle_pedido_subtotal
            CHECK (subtotal > 0)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'detalle_pedido'
        );
    }
};