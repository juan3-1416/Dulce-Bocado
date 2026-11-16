<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produccion', function (Blueprint $table) {
            $table->bigIncrements('id_produccion');
            $table->uuid('operacion_id')->unique();
            $table->unsignedBigInteger('presentacion_id');
            $table->unsignedBigInteger('receta_id');
            $table->unsignedInteger('cantidad');
            $table->string('estado', 20)->default('EN_PROCESO');
            $table->json('consumo_snapshot');
            $table->unsignedBigInteger('actor_usuario_id');
            $table->text('observaciones')->nullable();
            $table->string('codigo_rechazo', 80)->nullable();
            $table->timestamp('fecha_completada')->nullable();
            $table->timestamp('fecha_rechazada')->nullable();
            $table->timestamps();

            $table->index(['estado', 'created_at']);
            $table->index(['presentacion_id', 'created_at']);
        });

        Schema::create('produccion_idempotencia', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('clave', 128)->unique();
            $table->char('huella_solicitud', 64);
            $table->unsignedBigInteger('id_produccion')->unique();
            $table->unsignedSmallInteger('codigo_respuesta')->nullable();
            $table->json('respuesta_snapshot')->nullable();
            $table->timestamps();

            $table->foreign('id_produccion')
                ->references('id_produccion')->on('produccion')->cascadeOnDelete();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE produccion ADD CONSTRAINT chk_produccion_cantidad CHECK (cantidad > 0)');
            DB::statement("ALTER TABLE produccion ADD CONSTRAINT chk_produccion_estado CHECK (estado IN ('EN_PROCESO', 'COMPLETADA', 'RECHAZADA'))");
            DB::statement('ALTER TABLE produccion ADD CONSTRAINT chk_produccion_referencias CHECK (presentacion_id > 0 AND receta_id > 0 AND actor_usuario_id > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('produccion_idempotencia');
        Schema::dropIfExists('produccion');
    }
};
