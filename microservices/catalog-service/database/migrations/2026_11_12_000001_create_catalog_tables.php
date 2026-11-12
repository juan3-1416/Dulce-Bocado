<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('categorias', function (Blueprint $table) {
            $table->id('id_categoria');
            $table->string('nombre', 100)->unique();
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('productos', function (Blueprint $table) {
            $table->id('id_producto');
            $table->foreignId('id_categoria')->constrained('categorias', 'id_categoria');
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->unique(['id_categoria', 'nombre']);
        });

        Schema::create('presentaciones', function (Blueprint $table) {
            $table->id('presentacion_id');
            $table->foreignId('id_producto')->constrained('productos', 'id_producto');
            $table->string('nombre', 200);
            $table->decimal('precio', 12, 2);
            $table->char('moneda', 3)->default('BOB');
            $table->boolean('disponible')->default(true);
            $table->boolean('permite_personalizacion')->default(false);
            $table->timestamps();
            $table->unique(['id_producto', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presentaciones');
        Schema::dropIfExists('productos');
        Schema::dropIfExists('categorias');
    }
};
