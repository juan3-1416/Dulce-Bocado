<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalle_venta', function (Blueprint $table) {
            $table->bigIncrements('id_detalle_venta');

            $table->unsignedBigInteger('id_venta');

            $table->unsignedBigInteger('id_producto_presentacion');

            $table->unsignedInteger('cantidad');

            /*
            |--------------------------------------------------------------------------
            | Precio histórico
            |--------------------------------------------------------------------------
            |
            | Se copia aquí el precio vigente de producto_presentacion
            | al momento de realizar la venta.
            |
            | Si el precio del producto cambia en el futuro, esta venta
            | mantiene el precio con el que realmente fue registrada.
            |
            */

            $table->decimal('precio_unitario', 12, 2);

            /*
            |--------------------------------------------------------------------------
            | Personalización
            |--------------------------------------------------------------------------
            */

            $table->decimal('costo_personalizacion', 12, 2)
                ->default(0);

            $table->text('detalle_personalizacion')
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Subtotal
            |--------------------------------------------------------------------------
            |
            | subtotal =
            | (precio_unitario * cantidad)
            | + costo_personalizacion
            |
            */

            $table->decimal('subtotal', 12, 2);

            $table->timestamp('fecha_creacion')
                ->useCurrent();

            $table->timestamp('fecha_actualizacion')
                ->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Relaciones
            |--------------------------------------------------------------------------
            */

            $table->foreign('id_venta', 'fk_detalle_venta_venta')
                ->references('id_venta')
                ->on('venta')
                ->cascadeOnDelete();

            $table->foreign(
                'id_producto_presentacion',
                'fk_detalle_venta_producto_presentacion'
            )
                ->references('id_producto_presentacion')
                ->on('producto_presentacion')
                ->restrictOnDelete();
        });

        /*
        |--------------------------------------------------------------------------
        | Restricciones
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE detalle_venta
            ADD CONSTRAINT chk_detalle_venta_cantidad
            CHECK (cantidad > 0)
        ");

        DB::statement("
            ALTER TABLE detalle_venta
            ADD CONSTRAINT chk_detalle_venta_precio
            CHECK (precio_unitario > 0)
        ");

        DB::statement("
            ALTER TABLE detalle_venta
            ADD CONSTRAINT chk_detalle_venta_personalizacion
            CHECK (costo_personalizacion >= 0)
        ");

        DB::statement("
            ALTER TABLE detalle_venta
            ADD CONSTRAINT chk_detalle_venta_subtotal
            CHECK (subtotal > 0)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_venta');
    }
};