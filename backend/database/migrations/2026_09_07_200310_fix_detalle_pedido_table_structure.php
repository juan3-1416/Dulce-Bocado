<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Corregir clave primaria y timestamps generados por la plantilla
        |--------------------------------------------------------------------------
        */

        if (!Schema::hasColumn('detalle_pedido', 'id')) {
            return;
        }
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE detalle_pedido
            DROP CONSTRAINT IF EXISTS chk_detalle_pedido_subtotal
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            DROP CONSTRAINT IF EXISTS chk_detalle_pedido_personalizacion
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            DROP CONSTRAINT IF EXISTS chk_detalle_pedido_precio
        ");

        DB::statement("
            ALTER TABLE detalle_pedido
            DROP CONSTRAINT IF EXISTS chk_detalle_pedido_cantidad
        ");

        Schema::table('detalle_pedido', function (Blueprint $table) {
            $table->dropForeign(
                'fk_detalle_pedido_pedido'
            );

            $table->dropForeign(
                'fk_detalle_pedido_producto_presentacion'
            );
        });

        Schema::table('detalle_pedido', function (Blueprint $table) {
            $table->dropColumn([
                'id_pedido',
                'id_producto_presentacion',
                'cantidad',
                'precio_congelado',
                'detalle_personalizacion',
                'costo_personalizacion',
                'subtotal',
                'fecha_creacion',
                'fecha_actualizacion',
            ]);
        });

        Schema::table('detalle_pedido', function (Blueprint $table) {
            $table->renameColumn(
                'id_detalle_pedido',
                'id'
            );

            $table->timestamps();
        });
    }
};