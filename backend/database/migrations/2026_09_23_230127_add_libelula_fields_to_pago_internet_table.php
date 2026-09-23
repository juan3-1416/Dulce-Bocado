<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'pago_internet',
            function (Blueprint $table) {
                /*
                 * Identificador interno generado por
                 * Libélula al registrar la deuda.
                 *
                 * NO confundir con referencia_transaccion:
                 *
                 * referencia_transaccion =
                 * identificador que Dulce Bocado envía
                 * y que Libélula devuelve luego como
                 * transaction_id en el aviso.
                 */
                $table
                    ->string(
                        'id_transaccion_libelula',
                        100
                    )
                    ->nullable()
                    ->unique();

                /*
                 * Código de recaudación retornado
                 * por Libélula.
                 */
                $table
                    ->string(
                        'codigo_recaudacion',
                        100
                    )
                    ->nullable();

                /*
                 * URL de la imagen QR real generada
                 * por Libélula.
                 */
                $table
                    ->text(
                        'qr_simple_url'
                    )
                    ->nullable();

                /*
                 * URL completa de la pasarela.
                 * Puede utilizarse como alternativa
                 * al QR Simple.
                 */
                $table
                    ->text(
                        'url_pasarela_pagos'
                    )
                    ->nullable();
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'pago_internet',
            function (Blueprint $table) {
                $table->dropUnique(
                    'pago_internet_id_transaccion_libelula_unique'
                );

                $table->dropColumn([
                    'id_transaccion_libelula',
                    'codigo_recaudacion',
                    'qr_simple_url',
                    'url_pasarela_pagos',
                ]);
            }
        );
    }
};