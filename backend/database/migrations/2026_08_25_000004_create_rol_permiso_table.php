<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rol_permiso', function (Blueprint $table) {
            $table->bigIncrements('id_rol_permiso');

            $table->bigInteger('rol_id');
            $table->bigInteger('permiso_id');

            $table->foreign('rol_id')
                ->references('id_rol')
                ->on('roles');

            $table->foreign('permiso_id')
                ->references('id_permiso')
                ->on('permisos');

            $table->unique(
                ['rol_id', 'permiso_id'],
                'uq_rol_permiso'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rol_permiso');
    }
};