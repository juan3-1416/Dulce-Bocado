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

            /*
            |--------------------------------------------------------------------------
            | Cliente
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_cliente')
                ->nullable();

            $table->string(
                'nombre_cliente_ocasional',
                150
            )->nullable();

            /*
            |--------------------------------------------------------------------------
            | Usuario responsable
            |--------------------------------------------------------------------------
            */

            $table->unsignedBigInteger('id_usuario');

            /*
            |--------------------------------------------------------------------------
            | Datos generales
            |--------------------------------------------------------------------------
            */

            $table->timestamp('fecha_pedido')
                ->useCurrent();

            $table->date('fecha_entrega');

            $table->time('hora_entrega');

            $table->decimal(
                'total',
                12,
                2
            )->default(0);

            /*
            |--------------------------------------------------------------------------
            | Estado inicial
            |--------------------------------------------------------------------------
            |
            | CU14 crea el pedido como PROGRAMADO.
            | CU15 gestionará posteriormente las transiciones.
            |
            */

            $table->string(
                'estado',
                20
            )->default('PROGRAMADO');

            $table->text('observaciones')
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Auditoría
            |--------------------------------------------------------------------------
            */

            $table->timestamp('fecha_creacion')
                ->useCurrent();

            $table->timestamp('fecha_actualizacion')
                ->useCurrent();

            /*
            |--------------------------------------------------------------------------
            | Relaciones
            |--------------------------------------------------------------------------
            */

            $table->foreign(
                'id_cliente',
                'fk_pedido_cliente'
            )
                ->references('id_cliente')
                ->on('cliente')
                ->restrictOnDelete();

            $table->foreign(
                'id_usuario',
                'fk_pedido_usuario'
            )
                ->references('id_usuario')
                ->on('usuarios')
                ->restrictOnDelete();
        });

        /*
        |--------------------------------------------------------------------------
        | Cliente registrado u ocasional
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE pedido
            ADD CONSTRAINT chk_pedido_cliente
            CHECK (
                (
                    id_cliente IS NOT NULL
                    AND nombre_cliente_ocasional IS NULL
                )
                OR
                (
                    id_cliente IS NULL
                    AND nombre_cliente_ocasional IS NOT NULL
                )
            )
        ");

        /*
        |--------------------------------------------------------------------------
        | Total
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE pedido
            ADD CONSTRAINT chk_pedido_total
            CHECK (total >= 0)
        ");

        /*
        |--------------------------------------------------------------------------
        | Estados
        |--------------------------------------------------------------------------
        */

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
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido');
    }
};