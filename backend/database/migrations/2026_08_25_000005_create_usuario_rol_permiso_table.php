<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuario_rol_permiso', function (Blueprint $table) {
            $table->bigIncrements('id_usuario_rol_permiso');

            $table->bigInteger('usuario_id');
            $table->bigInteger('rol_permiso_id');

            $table->foreign('usuario_id')
                ->references('id_usuario')
                ->on('usuarios');

            $table->foreign('rol_permiso_id')
                ->references('id_rol_permiso')
                ->on('rol_permiso');

            $table->unique(
                ['usuario_id', 'rol_permiso_id'],
                'uq_usuario_rol_permiso'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario_rol_permiso');
    }
};