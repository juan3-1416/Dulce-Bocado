<?php

namespace App\Services\PagosInternet;

use Illuminate\Support\Str;

class PasarelaPagoSimulada
{
    public const PROVEEDOR =
        'PASARELA_SIMULADA';

    /*
    |--------------------------------------------------------------------------
    | Iniciar transacción
    |--------------------------------------------------------------------------
    |
    | En una integración real este método enviaría una solicitud
    | HTTPS al proveedor de pagos.
    |
    | Por ahora genera una referencia única y devuelve una
    | respuesta simulada.
    |--------------------------------------------------------------------------
    */

    public function iniciar(
        int $idVenta,
        float $monto
    ): array {
        $referencia =
            'SIM-' .
            now()->format('YmdHis') .
            '-' .
            strtoupper(
                Str::random(8)
            );

        return [
            'proveedor' =>
                self::PROVEEDOR,

            'referencia_transaccion' =>
                $referencia,

            'estado' =>
                'PENDIENTE',

            'respuesta_proveedor' => [
                'codigo' =>
                    'SOLICITUD_RECIBIDA',

                'mensaje' =>
                    'Transacción creada correctamente en la pasarela simulada.',

                'id_venta' =>
                    $idVenta,

                'monto' =>
                    number_format(
                        $monto,
                        2,
                        '.',
                        ''
                    ),
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Confirmar transacción
    |--------------------------------------------------------------------------
    |
    | Este método representa la respuesta que en producción
    | llegaría desde el proveedor mediante API o webhook.
    |--------------------------------------------------------------------------
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