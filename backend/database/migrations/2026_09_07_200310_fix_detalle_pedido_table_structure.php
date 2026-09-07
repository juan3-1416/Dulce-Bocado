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

        Schema::table('detalle_pedido', function (Blueprint $table) {
            $table->renameColumn(
                'id',
                'id_detalle_pedido'
            );
        });

        Schema::table('detalle_pedido', function (Blueprint $table) {
            $table->dropColumn([
                'created_at',
                'updated_at',
            ]);
        });

        /*
        |--------------------------------------------------------------------------
        | Agregar estructura real de CU14
        |--------------------------------------------------------------------------
        */

        Schema::table('detalle_pedido', function (Blueprint $table) {
            $table->unsignedBigInteger(
                'id_pedido'
            );

            $table->unsignedBigInteger(
                'id_producto_presentacion'
            );

            $table->unsignedInteger(
                'cantidad'
            );

            $table->decimal(
                'precio_congelado',
                12,
                2
            );

            $table->text(
                'detalle_personalizacion'
            )->nullable();

            $table->decimal(
                'costo_personalizacion',
                12,
                2
            )->default(0);

            $table->decimal(
                'subtotal',
                12,
                2
            );

            $table->timestamp(
                'fecha_creacion'
            )->useCurrent();

            $table->timestamp(
                'fecha_actualizacion'
            )->useCurrent();
        });

        /*
        |--------------------------------------------------------------------------
        | Relaciones
        |--------------------------------------------------------------------------
        */

        Schema::table('detalle_pedido', function (Blueprint $table) {
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

        /*
        |--------------------------------------------------------------------------
        | Restricciones
        |--------------------------------------------------------------------------
        */

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