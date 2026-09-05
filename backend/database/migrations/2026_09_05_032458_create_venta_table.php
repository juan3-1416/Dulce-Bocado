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

            $table->unsignedBigInteger('id_usuario');

            $table->string('nombre_cliente_ocasional', 150)->nullable();

            $table->timestamp('fecha_venta')
                ->useCurrent();

            $table->decimal('total', 12, 2)
                ->default(0);

            $table->string('estado', 20)
                ->default('REGISTRADA');

            $table->text('observaciones')->nullable();

            $table->timestamp('fecha_creacion')
                ->useCurrent();

            $table->timestamp('fecha_actualizacion')
                ->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Relaciones
            |--------------------------------------------------------------------------
            */

            $table->foreign('id_cliente', 'fk_venta_cliente')
                ->references('id_cliente')
                ->on('cliente')
                ->restrictOnDelete();

            $table->foreign('id_usuario', 'fk_venta_usuario')
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        /*
        |--------------------------------------------------------------------------
        | Restricciones
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE venta
            ADD CONSTRAINT chk_venta_total
            CHECK (total >= 0)
        ");

        DB::statement("
            ALTER TABLE venta
            ADD CONSTRAINT chk_venta_estado
            CHECK (
                estado IN (
                    'REGISTRADA',
                    'ANULADA'
                )
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('venta');
    }
};