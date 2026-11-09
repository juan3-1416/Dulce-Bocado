<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->bigIncrements('id_usuario');

            $table->string('nombre', 120);
            $table->string('nombre_usuario', 80)->unique();
            $table->string('correo_electronico', 150)->unique();
            $table->string('contrasena', 255);

            $table->boolean('activo')->default(true);

            $table->integer('intentos_fallidos')->default(0);
            $table->timestamp('bloqueado_hasta')->nullable();

            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamp('fecha_actualizacion')->useCurrent();
        });

        DB::statement(
            'ALTER TABLE usuarios
             ADD CONSTRAINT chk_usuarios_intentos_fallidos
             CHECK (intentos_fallidos >= 0)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};