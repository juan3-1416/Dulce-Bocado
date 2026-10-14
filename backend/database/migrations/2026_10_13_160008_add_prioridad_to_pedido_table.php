<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
public function up(): void
{
Schema::table('pedido', function (Blueprint $table) {
$table->string('prioridad', 20)
->default('NORMAL');
});
}
public function down(): void
{
Schema::table('pedido', function (Blueprint $table) {
$table->dropColumn('prioridad');
});
}
};
