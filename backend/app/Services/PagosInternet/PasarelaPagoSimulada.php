<?php

namespace App\Services\PagosInternet;

use Illuminate\Support\Str;

class PasarelaPagoSimulada
{
    public const PROVEEDOR =
        'QR_SIMULADO';

    public const MINUTOS_VIGENCIA_QR =
        5;

    /*
    |--------------------------------------------------------------------------
    | Iniciar transacción QR
    |--------------------------------------------------------------------------
    |
    | Simula la creación de una transacción en un proveedor
    | externo de pagos mediante QR.
    |
    | Se genera:
    | - referencia visible de la transacción
    | - token privado para el QR
    | - fecha de vencimiento
    |
    */

    public function iniciar(
        int $idVenta,
        float $monto
    ): array {
        $referencia =
            'QR-' .
            now()->format('YmdHis') .
            '-' .
            strtoupper(
                Str::random(8)
            );

        /*
         * Token utilizado únicamente por el QR.
         *
         * No usamos la referencia de transacción como
         * autorización pública.
         */
        $tokenQr =
            Str::random(64);

        $fechaVencimiento =
            now()->addMinutes(
                self::MINUTOS_VIGENCIA_QR
            );

        return [
            'proveedor' =>
                self::PROVEEDOR,

            'referencia_transaccion' =>
                $referencia,

            'token_qr' =>
                $tokenQr,

            'fecha_vencimiento' =>
                $fechaVencimiento,

            'estado' =>
                'PENDIENTE',

            'respuesta_proveedor' => [
                'codigo' =>
                    'QR_GENERADO',

                'mensaje' =>
                    'Código QR generado correctamente. Esperando confirmación del pago.',

                'id_venta' =>
                    $idVenta,

                'monto' =>
                    number_format(
                        $monto,
                        2,
                        '.',
                        ''
                    ),

                'vigencia_minutos' =>
                    self::MINUTOS_VIGENCIA_QR,
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Confirmar transacción
    |--------------------------------------------------------------------------
    |
    | Se mantiene temporalmente porque la pantalla actual
    | todavía utiliza la confirmación manual.
    |
    | Más adelante el escaneo del QR sustituirá el camino
    | manual para las transacciones QR.
    |
    */

    public function confirmar(
        string $resultado,
        ?string $motivoRechazo = null
    ): array {
        if ($resultado === 'APROBADO') {
            return [
                'estado' =>
                    'APROBADO',

                'motivo_rechazo' =>
                    null,

                'respuesta_proveedor' => [
                    'codigo' =>
                        'TRANSACCION_APROBADA',

                    'mensaje' =>
                        'El proveedor confirmó correctamente el pago.',
                ],
            ];
        }

        return [
            'estado' =>
                'RECHAZADO',

            'motivo_rechazo' =>
                $motivoRechazo,

            'respuesta_proveedor' => [
                'codigo' =>
                    'TRANSACCION_RECHAZADA',

                'mensaje' =>
                    $motivoRechazo,
            ],
        ];
    }
}