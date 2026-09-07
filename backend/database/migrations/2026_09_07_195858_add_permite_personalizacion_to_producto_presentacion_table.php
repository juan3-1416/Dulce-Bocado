<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producto_presentacion', function (Blueprint $table) {
            $table->boolean('permite_personalizacion')
                ->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('producto_presentacion', function (Blueprint $table) {
            $table->dropColumn('permite_personalizacion');
        });
    }
};